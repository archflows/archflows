import { LockIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type FlowMockKind = "form" | "preview" | "positions";

/** Static dashboard UI slices for the landing Workflow section — real cards, no browser chrome. */
export function FlowMock({ kind }: { kind: FlowMockKind }) {
  return (
    <div className="lp-flow-shot-inner" aria-hidden>
      {kind === "form" ? <FormCard /> : null}
      {kind === "preview" ? <PreviewCard /> : null}
      {kind === "positions" ? <PositionsCard /> : null}
    </div>
  );
}

function FormCard() {
  return (
    <div className="panel">
      <div className="panel-head">
        <span>Hard lock</span>
        <span className="live live-accent">Time-based</span>
      </div>
      <div className="panel-body">
        <div className="field">
          <span className="field-label">Token</span>
          <div className="af-input">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/15 font-mono text-[10px] font-semibold text-primary">
              TOK
            </span>
            <span className="font-medium">TOKEN</span>
            <span className="ml-auto text-sm opacity-70">12,480.00</span>
          </div>
        </div>

        <div className="field amount-field">
          <div className="amount-field-head">
            <span className="field-label">Amount to lock</span>
            <span className="amount-field-max">Max 12,480 TOKEN</span>
          </div>
          <div className="amount-control">
            <div className="amount-control-panel">
              <span className="amount-control-input tabular-nums">1,250,000</span>
              <span className="amount-control-suffix">TOKEN</span>
            </div>
          </div>
          <div className="amount-presets">
            <span className="amount-preset">25%</span>
            <span className="amount-preset">50%</span>
            <span className="amount-preset on">75%</span>
            <span className="amount-preset">MAX</span>
          </div>
        </div>

        <div className="field">
          <span className="field-label">Unlock to</span>
          <div className="seg seg-3">
            <span className="seg-btn on">Self</span>
            <span className="seg-btn">Other</span>
            <span className="seg-btn">Split</span>
          </div>
        </div>

        <div className="field">
          <span className="field-label">Unlock after</span>
          <div className="unlock-after-parts">
            <label className="unlock-part">
              <span>Days</span>
              <div className="af-input">180</div>
            </label>
            <label className="unlock-part">
              <span>Hours</span>
              <div className="af-input">0</div>
            </label>
            <label className="unlock-part">
              <span>Minutes</span>
              <div className="af-input">0</div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewCard() {
  const rows: { label: string; value: string; mono?: boolean }[] = [
    { label: "Type", value: "Hard lock" },
    { label: "Unlocks", value: "12 Jun 2027, 14:00 UTC" },
    { label: "Duration", value: "180 days" },
    { label: "Unlock to", value: "0x7a21…c4F2", mono: true },
    { label: "Amount", value: "1,250,000 TOKEN" },
    { label: "Fee", value: "$10 USDC" },
  ];

  return (
    <div className="panel">
      <div className="panel-head">
        <span>Lock preview</span>
      </div>
      <dl style={{ margin: 0 }}>
        {rows.map((row) => (
          <div className="kv" key={row.label}>
            <dt>{row.label}</dt>
            <dd className={row.mono ? "mono" : undefined}>{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="field-hint" style={{ lineHeight: 1.65, padding: "0.75rem 1rem 1rem", margin: 0 }}>
        Matches the payload your wallet will sign. Nothing leaves until you approve.
      </p>
    </div>
  );
}

function PositionsCard() {
  const rows = [
    {
      id: "42",
      amount: "1,250,000 TOKEN",
      status: "Locked",
      meta: "LOCK #42, unlocks 12 Jun 2027",
      pct: 68,
    },
    {
      id: "38",
      amount: "420,000 TOKEN",
      status: "Vesting",
      meta: "LOCK #38, unlocks 3 Mar 2027",
      pct: 41,
    },
  ] as const;

  return (
    <Card className="border-0 shadow-none ring-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LockIcon className="size-4 text-primary" />
          Your positions
        </CardTitle>
        <CardDescription>Locks tied to this wallet, still locked or already unlocked.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="seg seg-2 max-w-md">
          <span className="seg-btn on">Locked (2)</span>
          <span className="seg-btn">Unlocked (1)</span>
        </div>

        <div className="grid gap-2">
          {rows.map((row) => (
            <div key={row.id} className="rounded-xl bg-black/20 px-4 py-3">
              <div className="flex items-center gap-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-[10px] font-semibold tracking-wide text-primary">
                  TOK
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium tabular-nums text-foreground">
                      {row.amount}
                    </span>
                    <Badge variant="outline" className="font-normal">
                      {row.status}
                    </Badge>
                  </div>
                  <div className="h-1.5 max-w-xs overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">{row.meta}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
