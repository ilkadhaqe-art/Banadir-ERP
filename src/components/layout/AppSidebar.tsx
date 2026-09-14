import { useRouterState } from "@tanstack/react-router";
import { ChevronDown, PanelLeftClose, Zap } from "lucide-react";
import { useMemo, useState } from "react";

import { NavLink } from "./NavLink";
import { navigation, type NavGroup } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

function isPathActive(pathname: string, to: string) {
  if (to === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

function groupIsActive(pathname: string, group: NavGroup) {
  if (isPathActive(pathname, group.to)) return true;
  return (group.children ?? []).some((c) => isPathActive(pathname, c.to));
}

export function AppSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile, roleLabel } = useAuth();
  const [manuallyOpen, setManuallyOpen] = useState<Record<string, boolean>>({});

  const openGroups = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const group of navigation) {
      map[group.label] = manuallyOpen[group.label] ?? groupIsActive(pathname, group);
    }
    return map;
  }, [manuallyOpen, pathname]);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="flex size-9 items-center justify-center rounded-xl bg-sidebar-accent">
          <Zap className="size-4 text-sidebar-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">Banadir Online FOS</p>
          <p className="text-[11px] text-sidebar-muted">Cycle 1</p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-sidebar-muted hover:text-sidebar-foreground lg:hidden"
            aria-label="Close menu"
          >
            <PanelLeftClose className="size-4" />
          </button>
        ) : null}
      </div>

      <p className="px-4 pb-2 text-[10px] font-semibold tracking-[0.14em] text-sidebar-muted">
        MAIN MENU
      </p>

      <nav className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {navigation.map((group) => {
          const Icon = group.icon;
          const active = groupIsActive(pathname, group);
          const open = openGroups[group.label];

          if (!group.children) {
            return (
              <NavLink
                key={group.label}
                to={group.to}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{group.label}</span>
              </NavLink>
            );
          }

          return (
            <div key={group.label}>
              <button
                type="button"
                onClick={() => setManuallyOpen((prev) => ({ ...prev, [group.label]: !open }))}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
                aria-expanded={open}
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex-1 truncate text-left">{group.label}</span>
                <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
              </button>
              {open ? (
                <div className="mt-0.5 space-y-0.5 pl-3">
                  {group.children.map((child) => {
                    const ChildIcon = child.icon;
                    const childActive = pathname === child.to;
                    return (
                      <NavLink
                        key={child.label}
                        to={child.to}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors",
                          childActive
                            ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <ChildIcon className="size-3.5 shrink-0" />
                        <span className="truncate">{child.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="flex items-center gap-3 border-t border-sidebar-border px-4 py-3">
        <div className="flex size-8 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
          {(profile?.full_name ?? "U").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{profile?.full_name ?? "User"}</p>
          <p className="text-[11px] capitalize text-sidebar-muted">{roleLabel}</p>
        </div>
      </div>
    </aside>
  );
}
