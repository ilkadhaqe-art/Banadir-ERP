import { createFileRoute } from "@tanstack/react-router";
import { Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { Panel, StatTile } from "@/components/command-center/Panel";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useGrantRole, useMyAccess, useRevokeRole, useUsersWithRoles } from "@/hooks/useUserRoles";
import { formatNumber } from "@/lib/format";
import type { AppRoleName } from "@/lib/users.functions";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({
    meta: [
      { title: "Users & Roles — Banadir Online FOS" },
      {
        name: "description",
        content:
          "Grant and revoke owner, admin, manager, cashier, driver and viewer access in Banadir Online FOS.",
      },
      { property: "og:title", content: "Users & Roles — Banadir Online FOS" },
      {
        property: "og:description",
        content: "Role-based access control backed by database policies.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UsersPage,
});

const ROLES: { role: AppRoleName; label: string; hint: string }[] = [
  { role: "owner", label: "Owner", hint: "Full control, cannot be the last one removed" },
  { role: "admin", label: "Admin", hint: "Manage everything except ownership" },
  { role: "manager", label: "Manager", hint: "Purchases, money and catalog" },
  { role: "cashier", label: "Cashier", hint: "Sell and collect payments" },
  { role: "driver", label: "Driver", hint: "Deliveries and handovers" },
  { role: "viewer", label: "Viewer", hint: "Read-only access" },
];

function UsersPage() {
  const { data: users, isPending, isError } = useUsersWithRoles();
  const { data: access } = useMyAccess();
  const grant = useGrantRole();
  const revoke = useRevokeRole();
  const [search, setSearch] = useState("");

  const isAdmin = access?.is_admin ?? false;
  const busy = grant.isPending || revoke.isPending;

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users ?? [];
    return (users ?? []).filter((user) => (user.full_name ?? "").toLowerCase().includes(term));
  }, [users, search]);

  const adminCount = (users ?? []).filter(
    (user) => user.roles.includes("owner") || user.roles.includes("admin"),
  ).length;

  function toggle(userId: string, role: AppRoleName, enabled: boolean) {
    if (enabled) grant.mutate({ user_id: userId, role });
    else revoke.mutate({ user_id: userId, role });
  }

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground">ACCESS</p>
        <h1 className="text-xl font-bold sm:text-2xl">Users &amp; roles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Roles are enforced by row-level security — the UI only mirrors what the database allows.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label="People" value={formatNumber((users ?? []).length)} loading={isPending} />
        <StatTile label="Owners & admins" value={formatNumber(adminCount)} loading={isPending} />
        <StatTile label="Your access" value={isAdmin ? "Admin" : "Standard"} />
      </div>

      <Panel
        icon={ShieldCheck}
        title="Role assignments"
        subtitle={
          isAdmin
            ? "Toggle a role to grant or revoke it instantly"
            : "Only owners and admins can change roles"
        }
      >
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search people"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search users"
          />
        </div>

        <div className="mt-4">
          {isError ? (
            <p className="py-8 text-center text-sm text-destructive">
              Users unavailable — read failed.
            </p>
          ) : isPending ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No users found.</p>
          ) : (
            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 font-semibold">Person</th>
                    {ROLES.map((role) => (
                      <th key={role.role} className="px-3 py-2 text-center font-semibold">
                        {role.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((user) => (
                    <tr key={user.id} className="hover:bg-accent/30">
                      <td className="px-4 py-2.5">
                        <p className="truncate font-medium">{user.full_name ?? "Unnamed user"}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {user.roles.length === 0 ? (
                            <Badge variant="outline">No role</Badge>
                          ) : (
                            user.roles.map((role) => (
                              <Badge key={role} variant="secondary">
                                {role}
                              </Badge>
                            ))
                          )}
                        </div>
                      </td>
                      {ROLES.map((role) => (
                        <td key={role.role} className="px-3 py-2.5 text-center">
                          <Switch
                            checked={user.roles.includes(role.role)}
                            disabled={!isAdmin || busy}
                            onCheckedChange={(checked) => toggle(user.id, role.role, checked)}
                            aria-label={`${role.label} for ${user.full_name ?? "user"}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Panel>

      <Panel title="What each role can do">
        <ul className="grid gap-2 sm:grid-cols-2">
          {ROLES.map((role) => (
            <li key={role.role} className="rounded-xl border border-border px-3 py-2">
              <p className="text-sm font-medium">{role.label}</p>
              <p className="text-xs text-muted-foreground">{role.hint}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
