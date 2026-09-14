import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { Construction } from "lucide-react";

export const Route = createFileRoute("/_authenticated/$")({
  component: ComingSoonPage,
});

function ComingSoonPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted">
          <Construction className="size-5 text-muted-foreground" />
        </div>
        <h1 className="mt-4 text-lg font-semibold">This section is coming next</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="num font-medium text-foreground">{pathname}</span> is part of a later
          build phase. The foundation, roles and shell are live now.
        </p>
      </div>
    </div>
  );
}
