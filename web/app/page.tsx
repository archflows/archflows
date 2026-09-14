import Link from "next/link";
import { ArrowRight, ArrowUpRight, Lock, Clock3, FileText, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

const MODULES = [
  {
    title: "Hard lock",
    meta: "Live",
    icon: Lock,
    body: "Seal an amount until a fixed unlock. No cancel, no shorten, no early exit.",
  },
  {
    title: "Linear vest",
    meta: "Live",
    icon: Clock3,
    body: "Cliff then continuous release. Claim accrued tokens anytime after unlock starts.",
  },
  {
    title: "Proof page",
    meta: "Live",
    icon: FileText,
    body: "Every position has a public URL. Amount, schedule, and beneficiary are on-chain.",
  },
  {
    title: "Batch vesting",
    meta: "Soon",
    icon: Layers,
    body: "Create many locks in one flow for team tables — after testnet validation.",
  },
];

const FAQ = [
  {
    q: "Can a lock be cancelled?",
    a: "No. Once created, amount and schedule are immutable. There is no admin cancel path.",
  },
  {
    q: "What pays for gas?",
    a: "USDC on Arc. Native view uses 18 decimals; ERC-20 at 0x3600…000 uses 6. Same asset — never double-count.",
  },
  {
    q: "Who can claim?",
    a: "Only the beneficiary set at creation. Anyone can open the public proof page.",
  },
  {
    q: "Is ArcFlow custodial?",
    a: "No. Tokens sit in the contract until claim. You keep the keys.",
  },
];

const STEPS = [
  ["01", "Connect on Arc", "Wallet on Arc Testnet. Fund USDC for gas if needed."],
  ["02", "Approve & lock", "Pick token, amount, hard lock or linear vest."],
  ["03", "Share proof", "Send /lock/id. Anyone can verify unlock on-chain."],
] as const;

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden">
      {/* Hero — full-bleed cinematic bg */}
      <section className="relative isolate overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div
            className="absolute inset-0 bg-cover bg-[center_30%] bg-no-repeat"
            style={{ backgroundImage: "url('/auth-hero-bg.png')" }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,oklch(0.14_0_0/0.55)_0%,oklch(0.14_0_0/0.72)_55%,oklch(0.145_0_0)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_80%_20%,oklch(1_0_0/0.1),transparent)]" />
        </div>

        <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 pb-16 pt-14 sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:pb-20 lg:pt-20">
        <div className="max-w-2xl">
          <Badge variant="secondary" className="mb-5">
            Arc Testnet · USDC gas
          </Badge>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
            Token lock & vesting for Arc
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-muted-foreground sm:text-lg">
            Lock leftover allocations or vest team bags on-chain. Share a public proof page —
            holders verify the schedule without trusting a screenshot.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <Link href="/auth" className={cn(buttonVariants({ size: "lg" }))}>
              Create a lock
              <ArrowRight className="size-4" />
            </Link>
            <a href="#how" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
              How it works
            </a>
          </div>
        </div>

        <div className="relative lg:translate-y-2">
          <div
            aria-hidden
            className="absolute -inset-3 rounded-2xl bg-linear-to-br from-primary/20 to-transparent blur-xl"
          />
          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-card/80 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <div className="text-sm font-medium">Lock preview</div>
                <div className="text-xs text-muted-foreground">Example · Arc Testnet</div>
              </div>
              <Badge>Sealed</Badge>
            </div>
            <div className="grid gap-px bg-border sm:grid-cols-3">
              {[
                ["Amount", "1,250,000 TOKEN"],
                ["Unlock", "12 Jun 2027"],
                ["Mode", "Hard lock"],
              ].map(([label, value]) => (
                <div key={label} className="bg-card/90 px-4 py-4">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {label}
                  </div>
                  <div className="mt-1.5 text-sm font-medium tabular-nums">{value}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 px-4 py-3">
              <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                <span>Time remaining</span>
                <span className="tabular-nums">68%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[68%] rounded-full bg-primary" />
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* How — continuous strip, no card grid */}
      <section id="how" className="relative mx-auto w-full max-w-7xl px-4 pb-6 pt-16 sm:px-6 sm:pt-20">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-md">
            <p className="text-sm font-medium text-muted-foreground">How it works</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Three steps to a public proof
            </h2>
          </div>
          <p className="max-w-sm text-sm text-muted-foreground sm:text-right">
            After a pad create, lock the wallet allocation here — LP lock stays on the pad.
          </p>
        </div>

        <ol className="mt-10 divide-y border-y sm:mt-12 sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {STEPS.map(([n, title, body], i) => (
            <li
              key={n}
              className="flex gap-4 py-6 sm:flex-col sm:gap-3 sm:px-8 sm:py-8 first:sm:pl-0 last:sm:pr-0"
            >
              <span className="font-mono text-sm text-muted-foreground">{n}</span>
              <div>
                <div className="font-medium">{title}</div>
                <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
                {i < STEPS.length - 1 ? (
                  <ArrowRight className="mt-4 hidden size-4 text-muted-foreground/50 sm:block" />
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Modules — list rhythm */}
      <section id="modules" className="relative mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-8 max-w-lg">
          <p className="text-sm font-medium text-muted-foreground">Modules</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">What ships today</h2>
        </div>

        <ul className="divide-y border-y">
          {MODULES.map((m) => (
            <li
              key={m.title}
              className="group flex flex-col gap-4 py-6 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-2"
            >
              <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border bg-background">
                  <m.icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{m.title}</span>
                    <Badge variant={m.meta === "Live" ? "default" : "secondary"}>{m.meta}</Badge>
                  </div>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{m.body}</p>
                </div>
              </div>
              <Link
                href="/auth"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "self-start opacity-70 group-hover:opacity-100 sm:self-center",
                )}
              >
                Open
                <ArrowUpRight className="size-4" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* FAQ + CTA */}
      <section className="relative border-t bg-muted/20">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div id="faq">
            <p className="text-sm font-medium text-muted-foreground">FAQ</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Common questions
            </h2>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              Immutable schedules, USDC gas, public proof. No custodian in the middle.
            </p>
          </div>
          <Accordion className="w-full">
            {FAQ.map((item) => (
              <AccordionItem key={item.q} value={item.q}>
                <AccordionTrigger>{item.q}</AccordionTrigger>
                <AccordionContent>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-6 border-t px-4 py-12 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Ready to lock on Arc?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create an immutable schedule and share the proof URL.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/auth" className={cn(buttonVariants({ size: "lg" }))}>
              Open app
            </Link>
            <a
              href="https://faucet.circle.com"
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
            >
              Get USDC
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
