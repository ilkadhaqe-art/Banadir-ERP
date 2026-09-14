import type { LucideIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "positive" | "negative";
  loading?: boolean;
  onClick?: () => void;
};

/**
 * Pure presentation. Values arrive already formatted from the canonical
 * snapshot — this component never computes financial truth.
 */
export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  loading,
  onClick,
}: KpiCardProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "rounded-2xl border border-border bg-card p-4 text-left transition-colors",
        onClick && "hover:border-primary/50 hover:bg-accent/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground">
          {label.toUpperCase()}
        </p>
        {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground" /> : null}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-7 w-28" />
      ) : (
        <p
          className={cn(
            "num mt-2 text-2xl font-bold",
            tone === "positive" && "text-emerald-600 dark:text-emerald-400",
            tone === "negative" && "text-destructive",
          )}
        >
          {value}
        </p>
      )}
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </Comp>
  );
}
