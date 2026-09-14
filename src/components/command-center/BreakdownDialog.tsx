import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export type BreakdownRow = {
  label: string;
  value: number;
  emphasis?: boolean;
  muted?: boolean;
};

type BreakdownDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  rows: BreakdownRow[];
  footer?: ReactNode;
};

/** Read-only explanation of a canonical snapshot figure. No math happens here. */
export function BreakdownDialog({
  open,
  onOpenChange,
  title,
  description,
  rows,
  footer,
}: BreakdownDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <dl className="divide-y divide-border rounded-xl border border-border">
          {rows.map((row) => (
            <div
              key={row.label}
              className={cn(
                "flex items-center justify-between gap-4 px-3 py-2.5 text-sm",
                row.emphasis && "bg-muted/50 font-semibold",
              )}
            >
              <dt className={cn(row.muted && "text-muted-foreground")}>{row.label}</dt>
              <dd className="num tabular-nums">{formatMoney(row.value)}</dd>
            </div>
          ))}
        </dl>
        {footer ? <div className="text-xs text-muted-foreground">{footer}</div> : null}
      </DialogContent>
    </Dialog>
  );
}
