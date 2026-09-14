import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const isExplicitDemo =
      typeof window !== "undefined" && localStorage.getItem("fos_demo_mode") === "true";
    const isUnconfigured =
      !import.meta.env["VITE_SUPABASE_URL"] ||
      import.meta.env["VITE_SUPABASE_URL"].includes("placeholder");

    if (isExplicitDemo || isUnconfigured) {
      return {
        user: {
          id: "demo-user-1",
          email: "admin@banadironline.com",
          user_metadata: { full_name: "Demo Admin (Owner)" },
        },
      };
    }

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <AuthProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </AuthProvider>
  );
}
