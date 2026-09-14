import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Card shell used across the command center — matches the reference design language. */
export function Panel({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  action,
  className,
  bodyClassName,
  children,
}: {
  icon?: LucideIcon | undefined;
  eyebrow?: string | undefined;
  title?: string | undefined;
  subtitle?: string | undefined;
  action?: ReactNode | undefined;
  className?: string | undefined;
  bodyClassName?: string | undefined;
  children?: ReactNode | undefined;
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-4 sm:p-5", className)}>
      {(Icon || eyebrow || title || action) && (
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {Icon ? (
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                <Icon className="size-4" />
              </span>
            ) : null}
            <div className="min-w-0">
              {eyebrow ? (
                <p className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground">
                  {eyebrow}
                </p>
              ) : null}
              {title ? (
                <h2 className="truncate text-sm font-semibold sm:text-base">{title}</h2>
              ) : null}
              {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
            </div>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      )}
      <div className={cn((Icon || title || eyebrow) && "mt-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Soft tile used inside panels for grouped figures. */
export function StatTile({
  label,
  value,
  hint,
  tone = "default",
  loading,
  onClick,
  className,
}: {
  label: string;
  value: string;
  hint?: string | undefined;
  tone?: "default" | "positive" | "negative" | "warning" | undefined;
  loading?: boolean | undefined;
  onClick?: (() => void) | undefined;
  className?: string | undefined;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "min-w-0 rounded-xl bg-muted/60 px-3 py-3 text-left",
        onClick && "transition-colors hover:bg-muted",
        className,
      )}
    >
      <p className="truncate text-[10px] font-bold tracking-[0.12em] text-muted-foreground">
        {label.toUpperCase()}
      </p>
      {loading ? (
        <Skeleton className="mt-2 h-6 w-24" />
      ) : (
        <p
          className={cn(
            "num mt-1 text-lg font-bold sm:text-xl",
            tone === "positive" && "text-success",
            tone === "negative" && "text-destructive",
            tone === "warning" && "text-warning",
          )}
        >
          {value}
        </p>
      )}
      {hint ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p> : null}
    </Comp>
  );
}

/** Label/value line used by the overview panels. */
export function LineRow({
  label,
  value,
  tone = "default",
  strong,
  loading,
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative" | "warning" | "muted" | undefined;
  strong?: boolean | undefined;
  loading?: boolean | undefined;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/70 py-2 text-sm last:border-0">
      <span className={cn("min-w-0 truncate", tone === "muted" && "text-muted-foreground")}>
        {label}
      </span>
      {loading ? (
        <Skeleton className="h-4 w-20" />
      ) : (
        <span
          className={cn(
            "num shrink-0 font-semibold",
            strong && "font-bold",
            tone === "positive" && "text-success",
            tone === "negative" && "text-destructive",
            tone === "warning" && "text-warning",
          )}
        >
          {value}
        </span>
      )}
    </div>
  );
}

export function MoneyRow(props: {
  label: string;
  value: number;
  tone?: "default" | "positive" | "negative" | "warning" | "muted" | undefined;
  strong?: boolean | undefined;
  loading?: boolean | undefined;
}) {
  const { value, ...rest } = props;
  return <LineRow {...rest} value={formatMoney(value)} />;
}

/** Info note block (the grey explanation boxes in the reference). */
export function NoteBox({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 rounded-xl bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
      {children}
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{label}</p>;
}
