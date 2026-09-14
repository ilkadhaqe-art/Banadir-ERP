import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";

export type AppRole = "owner" | "admin" | "manager" | "cashier" | "driver" | "viewer";

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  roleLabel: string;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async (nextSession: Session | null) => {
      if (!mounted) return;
      setSession(nextSession);
      if (!nextSession?.user) {
        const isExplicitDemo =
          typeof window !== "undefined" && localStorage.getItem("fos_demo_mode") === "true";
        const isUnconfigured =
          !import.meta.env["VITE_SUPABASE_URL"] ||
          import.meta.env["VITE_SUPABASE_URL"].includes("placeholder");

        if (isExplicitDemo || isUnconfigured) {
          setProfile({
            id: "demo-user-1",
            full_name: "Demo Admin (Owner)",
            avatar_url: null,
          });
          setRoles(["owner", "admin"]);
          setLoading(false);
          return;
        }

        setProfile(null);
        setRoles([]);
        setLoading(false);
        return;
      }
      const [{ data: profileRow }, { data: roleRows }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("id", nextSession.user.id)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", nextSession.user.id),
      ]);
      if (!mounted) return;
      setProfile(profileRow ?? null);
      setRoles(((roleRows ?? []) as { role: AppRole }[]).map((r) => r.role));
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => void load(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (
        event !== "SIGNED_IN" &&
        event !== "SIGNED_OUT" &&
        event !== "USER_UPDATED" &&
        event !== "INITIAL_SESSION"
      ) {
        setSession(nextSession);
        return;
      }
      void load(nextSession);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user:
        session?.user ??
        (profile
          ? ({
              id: profile.id,
              email: "admin@banadironline.com",
              user_metadata: { full_name: profile.full_name },
            } as unknown as User)
          : null),
      session,
      profile,
      roles,
      roleLabel: roles[0] ?? "owner",
      loading,
      signOut: async () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("fos_demo_mode");
        }
        await supabase.auth.signOut();
        window.location.href = "/auth";
      },
    }),
    [session, profile, roles, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      session: null,
      profile: null,
      roles: [],
      roleLabel: "viewer",
      loading: true,
      signOut: async () => {},
    };
  }
  return ctx;
}
