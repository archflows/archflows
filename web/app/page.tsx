import Link from "next/link";
import {
  Clock3,
  FileText,
  Layers,
  Lock,
  Orbit,
  Radar,
  Rocket,
  Satellite,
  ShieldCheck,
  Signal,
} from "lucide-react";
import { HeroOrbit } from "@/components/HeroOrbit";

const TELEMETRY = [
  { icon: Orbit, value: "0", label: "cancel paths" },
  { icon: Signal, value: "5042002", label: "arc testnet id" },
  { icon: Rocket, value: "USDC", label: "gas, not ETH" },
  { icon: Radar, value: "<1s", label: "finality" },
];

const MISSION = [
  {
    icon: Lock,
    title: "Hard lock",
    body: "Seal an amount until a fixed unlock timestamp. No cancel, no shorten, no early exit — not even for you.",
  },
  {
    icon: Clock3,
    title: "Linear vest",
    body: "Cliff, then per-second release from start to end. The beneficiary claims whatever has accrued.",
  },
  {
    icon: FileText,
    title: "Proof page",
    body: "Every position gets a public URL. Amount, schedule, and beneficiary read straight off the contract.",
  },
];

const MODULES = [
  {
    icon: Lock,
    title: "Wallet token lock",
    status: "Live",
    meta: "ERC-20 · immutable · beneficiary set at creation",
    tags: ["Approve + lock", "Hard lock", "No admin path"],
  },
  {
    icon: Clock3,
    title: "Linear vesting",
    status: "Live",
    meta: "start ≤ cliff ≤ end · per-second accrual",
    tags: ["Cliff", "Claim anytime", "uint128 amounts"],
  },
  {
    icon: Satellite,
    title: "Public proof orbit",
    status: "Live",
    meta: "/lock/{id} · no wallet needed to verify",
    tags: ["Shareable", "On-chain read", "Countdown"],
  },
  {
    icon: Layers,
    title: "Batch vesting",
    status: "Soon",
    meta: "team tables and investor rounds in one flow",
    tags: ["CSV", "Multi-wallet", "Phase 1"],
  },
];

const SEQUENCE = [
  {
    n: "01",
    title: "Dock your wallet",
    body: "Connect on Arc Testnet. Gas is USDC — top up at the Circle faucet if the tank is dry.",
  },
  {
    n: "02",
    title: "Set the trajectory",
    body: "Paste the token contract, pick an amount, choose hard lock or linear vest, set the duration.",
  },
  {
    n: "03",
    title: "Broadcast the proof",
    body: "Approve, lock, and share /lock/{id} next to the CA. Anyone can verify the unlock on-chain.",
  },
];

const FAQ = [
  {
    q: "Can a lock be cancelled?",
    a: "No. Once the transaction confirms, amount and schedule are immutable. There is no admin cancel path and no upgrade hatch over existing positions.",
  },
  {
    q: "Is this the same as an LP lock?",
    a: "No. LP lock means the pool cannot be pulled — that is the launchpad's job. ArcFlow locks tokens sitting in a wallet so they cannot be sold until the schedule allows.",
  },
  {
    q: "What pays for gas?",
    a: "USDC on Arc. The native view uses 18 decimals; the USDC ERC-20 at 0x3600…0000 uses 6. Same asset, two views — never double-count. The mempool floor is 20 Gwei maxFeePerGas.",
  },
  {
    q: "Who can claim?",
    a: "Only the beneficiary set at creation. Anyone can open the public proof page, but nobody else can move the tokens — including the creator.",
  },
  {
    q: "Is ArcFlow custodial?",
    a: "The contract holds the tokens until claim; no human key can redirect them. You keep your wallet, we keep no admin lever over locked balances.",
  },
];

export default function LandingPage() {
  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="hero">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <p className="tag tag-accent">// ArcFlow · orbital token custody on Arc</p>
            <h1>
              Put the dev bag <em>in orbit</em>, not on the market
            </h1>
            <p className="hero-lead">
              Launchpads mint the token. ArcFlow decides when it can be sold. Lock leftover
              allocation or the dev buy into an immutable schedule, then share one proof URL that
              anybody can check without trusting a screenshot.
            </p>

            <div className="chip-row">
              <span className="chip">Immutable locks</span>
              <span className="chip">Linear vesting</span>
              <span className="chip">Public proof page</span>
              <span className="chip">USDC gas</span>
            </div>

            <div className="hero-actions">
              <Link className="btn lg" href="/app">
                Lock tokens
              </Link>
              <Link className="btn ghost lg" href="/#launch">
                Launch sequence
              </Link>
            </div>
          </div>

          <div className="hero-visual">
            <HeroOrbit />
          </div>
        </div>

        <div className="shell">
          <div className="mini-stats">
            {TELEMETRY.map((item) => (
              <div className="mini-stat" key={item.label}>
                <span className="box-icon">
                  <item.icon className="size-4" />
                </span>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission ──────────────────────────────────────────── */}
      <section className="shell section" id="mission">
        <p className="tag">// MISSION</p>
        <h2>Three instruments, one guarantee</h2>
        <p className="lead">
          A screenshot saying &ldquo;team locked&rdquo; is not proof. ArcFlow writes the schedule
          into a contract on Arc and gives holders a page they can read themselves.
        </p>

        <div className="box-grid box-grid-3">
          {MISSION.map((item) => (
            <article className="box" key={item.title}>
              <span className="box-icon">
                <item.icon className="size-4" />
              </span>
              <div className="box-top">
                <h3>{item.title}</h3>
                <span className="live">
                  <span className="pulse-dot" />
                  Live
                </span>
              </div>
              <p>{item.body}</p>
            </article>
          ))}
        </div>

        <div className="panel" style={{ marginTop: "1.5rem" }}>
          <div className="panel-head">
            <span className="mono" style={{ fontSize: "0.78rem" }}>
              // SIGNAL CHECK
            </span>
            <span className="live live-accent">LP lock ≠ wallet lock</span>
          </div>
          <div className="panel-body dim" style={{ fontSize: "0.9rem", lineHeight: 1.7 }}>
            LP lock means the pool cannot be pulled — the pad handles that. ArcFlow handles the
            other half: tokens in a <span style={{ color: "var(--ink)" }}>wallet</span> that cannot
            be sold until the schedule says so. If the pad already sent 100% of supply to the pool,
            lock your dev buy here.
          </div>
        </div>
      </section>

      {/* ── Modules ──────────────────────────────────────────── */}
      <section className="shell section" id="modules">
        <p className="tag">// MODULES</p>
        <h2>What is in flight today</h2>
        <p className="lead">
          V1 ships the parts that matter for day one on Arc. Everything else waits until people are
          actually locking.
        </p>

        <div className="box-grid box-grid-2">
          {MODULES.map((m) => (
            <article className="box" key={m.title}>
              <span className="box-icon">
                <m.icon className="size-4" />
              </span>
              <div className="box-top">
                <h3>{m.title}</h3>
                <span className={m.status === "Live" ? "live" : "live live-accent"}>
                  {m.status === "Live" ? <span className="pulse-dot" /> : null}
                  {m.status}
                </span>
              </div>
              <p className="box-meta dim">{m.meta}</p>
              <div className="tag-list">
                {m.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Readout ──────────────────────────────────────────── */}
      <section className="shell section" id="readout">
        <div className="readout-grid">
          <div>
            <p className="tag">// TELEMETRY</p>
            <h2>The proof page is the product</h2>
            <p className="lead">
              One URL, no wallet required, no dashboard login. Amount, cliff, unlock time,
              beneficiary, claimed so far — read live from the contract every second.
            </p>
            <Link className="box-link" href="/app">
              Create a lock and get your URL →
            </Link>
          </div>

          <div className="panel">
            <div className="panel-head">
              <span>
                Lock <span className="mono dim">#0042</span>
              </span>
              <span className="live live-accent">Sealed</span>
            </div>
            <div className="stat-grid stat-grid-2" style={{ border: 0 }}>
              <div className="stat">
                <span>Locked amount</span>
                <strong>1,250,000 TOKEN</strong>
              </div>
              <div className="stat">
                <span>Fully unlocks</span>
                <strong>12 Jun 2027</strong>
              </div>
              <div className="stat" style={{ borderTop: "1px solid var(--line)" }}>
                <span>Release</span>
                <strong>Hard lock</strong>
              </div>
              <div className="stat" style={{ borderTop: "1px solid var(--line)" }}>
                <span>Claimable now</span>
                <strong>0</strong>
              </div>
            </div>
            <div className="panel-body" style={{ borderTop: "1px solid var(--line)" }}>
              <div
                className="mono dim"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.72rem",
                  marginBottom: "0.5rem",
                }}
              >
                <span>TIME ELAPSED</span>
                <span>68%</span>
              </div>
              <div className="meter">
                <div className="meter-fill" style={{ width: "68%" }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Launch sequence ──────────────────────────────────── */}
      <section className="shell section" id="launch">
        <p className="tag">// LAUNCH SEQUENCE</p>
        <h2>Three steps from create to proof</h2>
        <p className="lead">
          Paste the contract seconds after the pad create — before the CA tweet goes out.
        </p>

        <div className="box-grid box-grid-3">
          {SEQUENCE.map((step) => (
            <article className="box" key={step.n}>
              <span className="box-icon">
                <ShieldCheck className="size-4" />
              </span>
              <p className="step-num">// STEP {step.n}</p>
              <h3>{step.title}</h3>
              <p style={{ marginTop: "0.45rem" }}>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="shell section" id="faq">
        <p className="tag">// FAQ</p>
        <h2>Questions before you lock</h2>
        <p className="lead">
          Immutable schedules, USDC gas, public proof, no custodian in the middle.
        </p>

        <div className="faq-list">
          {FAQ.map((item) => (
            <details className="faq-item" key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="shell section">
        <div className="cta-box">
          <div className="cta-orb" />
          <div>
            <span className="box-icon">
              <Rocket className="size-4" />
            </span>
            <p className="tag tag-accent">// GET STARTED</p>
            <h2>Lock the bag before you tweet the CA</h2>
            <p className="lead" style={{ marginBottom: 0 }}>
              Immutable schedule, public proof URL, gas in USDC. Two minutes on Arc Testnet.
            </p>
          </div>
          <div className="hero-actions">
            <Link className="btn lg" href="/app">
              Open ArcFlow
            </Link>
            <a
              className="btn ghost lg"
              href="https://faucet.circle.com"
              target="_blank"
              rel="noreferrer"
            >
              Get testnet USDC
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
