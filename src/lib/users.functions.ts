import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppRoleName = "owner" | "admin" | "manager" | "cashier" | "driver" | "viewer";

export type RoleRow = {
  id: string;
  user_id: string;
  role: AppRoleName;
};

export type UserWithRoles = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  roles: AppRoleName[];
};

export type MyAccess = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  roles: AppRoleName[];
  is_admin: boolean;
};

/** Roles + identity for the signed-in user only. RLS keeps this self-scoped. */
export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyAccess> => {
    const [{ data: profile }, { data: roleRows, error }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", context.userId)
        .maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
    ]);
    if (error) throw new Error(error.message);
    const roles = ((roleRows ?? []) as { role: AppRoleName }[]).map((r) => r.role);
    return {
      user_id: context.userId,
      email: (context.claims as { email?: string } | null)?.email ?? null,
      full_name: (profile as { full_name: string | null } | null)?.full_name ?? null,
      roles,
      is_admin: roles.includes("owner") || roles.includes("admin"),
    };
  });

/**
 * Directory of users with their roles. Profiles are readable by any signed-in
 * user; user_roles rows are filtered by RLS, so non-admins only see their own.
 */
export const listUsersWithRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserWithRoles[]> => {
    const [{ data: profiles, error: pErr }, { data: roleRows, error: rErr }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .order("full_name", { ascending: true }),
      context.supabase.from("user_roles").select("id, user_id, role"),
    ]);
    if (pErr) throw new Error(pErr.message);
    if (rErr) throw new Error(rErr.message);

    const byUser = new Map<string, AppRoleName[]>();
    for (const row of (roleRows ?? []) as RoleRow[]) {
      byUser.set(row.user_id, [...(byUser.get(row.user_id) ?? []), row.role]);
    }
    return (
      (profiles ?? []) as { id: string; full_name: string | null; avatar_url: string | null }[]
    ).map((p) => ({ ...p, roles: byUser.get(p.id) ?? [] }));
  });

/** Grant a role. RLS (`user_roles_admin_write`) rejects non-admin callers. */
export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { user_id: string; role: AppRoleName }) => data)
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const { error } = await context.supabase
      .from("user_roles")
      .insert({ user_id: data.user_id, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Revoke a role. RLS (`user_roles_admin_write`) rejects non-admin callers. */
export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { user_id: string; role: AppRoleName }) => data)
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const { error } = await context.supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("role", data.role);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
