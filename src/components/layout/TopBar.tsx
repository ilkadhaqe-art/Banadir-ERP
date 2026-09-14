import { Bell, LogOut, Menu, Plus, Search, Settings, Target } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useFinancialSnapshot } from "@/hooks/useFinancialSnapshot";
import { formatMoney } from "@/lib/format";

export function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { profile, roleLabel, signOut } = useAuth();
  const { data: snapshot } = useFinancialSnapshot();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-3 sm:px-4">
      <button
        type="button"
        onClick={onOpenMenu}
        className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-4" />
      </button>

      <label className="relative hidden min-w-0 flex-1 items-center sm:flex">
        <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search anything..."
          className="h-9 w-full max-w-md rounded-lg border border-border bg-background pl-9 pr-12 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
        />
        <kbd className="pointer-events-none absolute left-[calc(min(100%,28rem)-3rem)] hidden text-[11px] text-muted-foreground md:block">
          ⌘K
        </kbd>
      </label>

      <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
        {(!import.meta.env["VITE_SUPABASE_URL"] ||
          import.meta.env["VITE_SUPABASE_URL"].includes("placeholder")) && (
          <span className="hidden items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-600 sm:inline-flex">
            Demo Mode
          </span>
        )}

        <div className="hidden text-right text-[11px] leading-tight text-muted-foreground md:block">
          <div>{now ? now.toLocaleDateString() : "—"}</div>
          <div>{now ? now.toLocaleTimeString() : "—"}</div>
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          <div className="flex items-center gap-2 rounded-full bg-destructive px-3 py-1.5 text-destructive-foreground">
            <Target className="size-4" />
            <div className="leading-tight">
              <div className="text-[9px] font-semibold tracking-widest opacity-90">
                TODAY TARGET
              </div>
              <div className="num text-sm font-bold">
                {snapshot ? formatMoney(snapshot.today_target) : "—"}
              </div>
            </div>
          </div>
          <div className="hidden w-24 leading-tight lg:block">
            <div className="flex items-center justify-between text-[9px] font-semibold text-muted-foreground">
              <span>Progress</span>
              <span className="num">
                {snapshot ? `${Math.round(Math.min(snapshot.progress_percentage, 100))}%` : "—"}
              </span>
            </div>
            <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${snapshot ? Math.min(snapshot.progress_percentage, 100) : 0}%`,
                }}
              />
            </div>
            <div className="mt-0.5 flex items-center justify-between text-[9px] text-muted-foreground">
              <span>Remaining</span>
              <span className="num font-semibold text-foreground">
                {snapshot
                  ? formatMoney(Math.max(snapshot.today_target - snapshot.today_achievement, 0))
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="hidden items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 sm:flex"
        >
          <Plus className="size-3.5" /> Quick Add
        </button>

        <button
          type="button"
          className="rounded-full border border-border p-2 text-muted-foreground hover:bg-muted"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
        </button>
        <button
          type="button"
          className="hidden rounded-full border border-border p-2 text-muted-foreground hover:bg-muted sm:block"
          aria-label="Settings"
        >
          <Settings className="size-4" />
        </button>

        <div className="flex items-center gap-2 pl-1">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {(profile?.full_name ?? "U").charAt(0).toUpperCase()}
          </div>
          <div className="hidden leading-tight md:block">
            <div className="text-xs font-semibold">{profile?.full_name ?? "User"}</div>
            <div className="text-[11px] capitalize text-muted-foreground">{roleLabel}</div>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
