import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Receipt as ReceiptIcon, Settings as SettingsIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { ImageUploadField } from "@/components/catalog/ImageUploadField";
import { Panel } from "@/components/command-center/Panel";
import { FactoryResetDialog } from "@/components/settings/FactoryResetDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppSettings, useSaveAppSetting } from "@/hooks/useReports";
import { useMyAccess } from "@/hooks/useUserRoles";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Banadir Online FOS" },
      {
        name: "description",
        content:
          "Business name, currency, receipt footer and alert settings for Banadir Online FOS.",
      },
      { property: "og:title", content: "Settings — Banadir Online FOS" },
      {
        property: "og:description",
        content: "General application settings stored in the database.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: settings, isPending, isError } = useAppSettings();
  const { data: access } = useMyAccess();
  const save = useSaveAppSetting();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setDraft(Object.fromEntries(settings.map((row) => [row.key, row.value])));
  }, [settings]);

  const isAdmin = access?.is_admin ?? false;
  const isOwner = (access?.roles ?? []).includes("owner");
  const receiptRows = (settings ?? []).filter((row) => row.key.startsWith("receipt_"));
  const generalRows = (settings ?? []).filter((row) => !row.key.startsWith("receipt_"));

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground">SYSTEM</p>
        <h1 className="text-xl font-bold sm:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          General, non-financial settings. Only owners and admins can save changes.
        </p>
      </header>

      <Panel icon={SettingsIcon} title="Application settings">
        {isError ? (
          <p className="py-8 text-center text-sm text-destructive">
            Settings unavailable — read failed.
          </p>
        ) : isPending ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {generalRows.map((row) => (
              <div key={row.key} className="grid gap-2 sm:grid-cols-[220px_minmax(0,1fr)_auto]">
                <div>
                  <Label htmlFor={`setting-${row.key}`}>{row.key.replace(/_/g, " ")}</Label>
                  {row.description ? (
                    <p className="text-xs text-muted-foreground">{row.description}</p>
                  ) : null}
                </div>
                <Input
                  id={`setting-${row.key}`}
                  value={draft[row.key] ?? ""}
                  disabled={!isAdmin}
                  onChange={(e) => setDraft((prev) => ({ ...prev, [row.key]: e.target.value }))}
                />
                <Button
                  variant="outline"
                  disabled={!isAdmin || save.isPending || (draft[row.key] ?? "") === row.value}
                  onClick={() => save.mutate({ key: row.key, value: draft[row.key] ?? "" })}
                >
                  Save
                </Button>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel icon={ReceiptIcon} title="Receipt control">
        <p className="mb-3 text-sm text-muted-foreground">
          Branding and wording printed on every receipt. Saved in the database — nothing is
          hard-coded.
        </p>
        <div className="space-y-4">
          <ImageUploadField
            label="Receipt logo"
            folder="branding"
            disabled={!isAdmin}
            value={draft["receipt_logo_url"] ?? ""}
            onChange={(path) => {
              setDraft((prev) => ({ ...prev, receipt_logo_url: path }));
              save.mutate({ key: "receipt_logo_url", value: path });
            }}
          />
          {receiptRows
            .filter((row) => row.key !== "receipt_logo_url")
            .map((row) => (
              <div key={row.key} className="grid gap-2 sm:grid-cols-[220px_minmax(0,1fr)_auto]">
                <div>
                  <Label htmlFor={`setting-${row.key}`}>
                    {row.key.replace("receipt_", "").replace(/_/g, " ")}
                  </Label>
                  {row.description ? (
                    <p className="text-xs text-muted-foreground">{row.description}</p>
                  ) : null}
                </div>
                <Input
                  id={`setting-${row.key}`}
                  value={draft[row.key] ?? ""}
                  disabled={!isAdmin}
                  onChange={(e) => setDraft((prev) => ({ ...prev, [row.key]: e.target.value }))}
                />
                <Button
                  variant="outline"
                  disabled={!isAdmin || save.isPending || (draft[row.key] ?? "") === row.value}
                  onClick={() => save.mutate({ key: row.key, value: draft[row.key] ?? "" })}
                >
                  Save
                </Button>
              </div>
            ))}
        </div>
      </Panel>

      {isOwner ? (
        <Panel icon={AlertTriangle} title="Factory reset">
          <p className="mb-3 text-sm text-muted-foreground">
            Clear all operational data — sales, purchases, collections, returns, orders, deliveries,
            stock movements and money transactions — while keeping the structure, users, accounts,
            rules and settings. Owner only.
          </p>
          <Button variant="destructive" onClick={() => setResetOpen(true)}>
            Open factory reset
          </Button>
        </Panel>
      ) : null}

      <FactoryResetDialog open={resetOpen} onOpenChange={setResetOpen} />
    </div>
  );
}
