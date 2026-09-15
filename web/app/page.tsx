import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  Coins,
  Gift,
  Handshake,
  Lock,
  Waves,
} from "lucide-react";
import { LandingHeroMock } from "@/components/LandingHeroMock";

const RAIL = ["Built on Arc", "Gas in USDC", "Sub-second finality", "Public proof URL"];

const FEATURED = [
  {
    icon: Lock,
    title: "Token lock",
    body: "Seal an ERC-20 amount until a fixed date. No cancel, no shorten, no early exit — not even for the creator.",
    meta: "Immutable · $10 USDC fee",
  },
  {
    icon: Clock3,
    title: "Linear vesting",
    body: "Cliff, then per-second release to a beneficiary. Teams and investors claim only what has accrued.",
    meta: "start ≤ cliff ≤ end",
  },
];

const MODULES = [
  {
    icon: Waves,
    title: "Streams",
    body: "Payroll and continuous unlocks with CSV batch create, top-up, and transfer.",
  },
  {
    icon: Gift,
    title: "Airdrops",
    body: "Merkle campaigns with instant claim or vest-to-stream. Clawback leftover after the window.",
  },
  {
    icon: Handshake,
    title: "Escrow",
    body: "Fund a deal, release on delivery, or refund — both sides stay on-chain.",
  },
  {
    icon: Coins,
    title: "Staking",
    body: "Permissionless reward pools. Restake does not relock lots that already unlocked.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Connect a wallet",
    body: "Use any EVM wallet on Arc Testnet. The same USDC balance pays gas — top up at the Circle faucet if needed.",
  },
  {
    n: "02",
    title: "Set the schedule",
    body: "Choose the token, amount, hard lock or linear vest, and an unlock date. Fee is a flat $10 USDC.",
  },
  {
    n: "03",
    title: "Share the proof",
    body: "Publish /lock/{id}. Holders verify amount, countdown, and beneficiary on-chain — no dashboard login.",
  },
];

const FAQ = [
  {
    q: "Can a lock be cancelled?",
    a: "No. Once the transaction confirms, amount and schedule are immutable. There is no admin cancel path over existing vault positions.",
  },
  {
    q: "Is this the same as an LP lock?",
    a: "No. An LP lock stops the pool from being pulled — that belongs to the launchpad. ArcFlow locks tokens sitting in a wallet so they cannot be sold until the schedule allows.",
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
    a: "The contract holds tokens until claim; no human key can redirect them. You keep your wallet. We keep no admin lever over locked balances.",
  },
  {
    q: "Is this ready for mainnet?",
    a: "Arc public mainnet is not live yet, and contracts are not externally audited. Use testnet USDC only — not production funds.",
  },
];

export default function LandingPage() {
  return (
    <main className="lp">
      <section className="hero lp-hero">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <p className="lp-kicker">
              <span className="pulse-dot" />
              Live on Arc Testnet
            </p>
            <h1>Lock and vest tokens on Arc</h1>
            <p className="hero-lead">
              Immutable schedules. A public proof page anyone can verify. Gas paid in USDC — the
              same asset you already hold.
            </p>
            <div className="hero-actions">
              <Link className="btn lg" href="/auth">
                Launch app
                <ArrowRight className="size-4" />
              </Link>
              <Link className="btn ghost lg" href="/#product">
                View products
              </Link>
            </div>
          </div>

          <div className="hero-visual">
            <LandingHeroMock />
          </div>
        </div>

        <div className="shell">
          <ul className="lp-rail">
            {RAIL.map((item) => (
              <li key={item}>
                <Check className="size-3.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="shell lp-section" id="product">
        <div className="lp-head">
          <p className="lp-eyebrow">Products</p>
          <h2>Locks, vesting, and distribution</h2>
          <p className="lead">
            Lock, vest, stream, airdrop, escrow, and stake from a single dashboard. Holders verify
            positions on-chain — not from a screenshot.
          </p>
        </div>

        <div className="lp-bento">
          {FEATURED.map((item) => (
            <Link className="lp-card lp-bento-lg" href="/auth" key={item.title}>
              <span className="lp-icon">
                <item.icon className="size-4" />
              </span>
              <div className="lp-product-top">
                <h3>{item.title}</h3>
                <ArrowUpRight className="lp-card-arrow size-4" />
              </div>
              <p>{item.body}</p>
              <span className="lp-meta">{item.meta}</span>
            </Link>
          ))}
          {MODULES.map((item) => (
            <Link className="lp-card lp-bento-sm" href="/auth" key={item.title}>
              <span className="lp-icon">
                <item.icon className="size-4" />
              </span>
              <div className="lp-product-top">
                <h3>{item.title}</h3>
                <ArrowUpRight className="lp-card-arrow size-4" />
              </div>
              <p>{item.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="shell lp-section" id="proof">
        <div className="lp-proof">
          <div className="lp-proof-copy">
            <p className="lp-eyebrow">Public proof</p>
            <h2>A page holders can open themselves</h2>
            <p className="lead">
              Every vault lock gets a shareable URL. Amount, unlock time, beneficiary, and
              claimable balance read live from the contract. No wallet required.
            </p>
            <ul className="lp-proof-list">
              <li>
                <Check className="size-3.5" />
                Hard lock and linear vest, shown as on-chain state
              </li>
              <li>
                <Check className="size-3.5" />
                Claimable amount updates without a dashboard login
              </li>
              <li>
                <Check className="size-3.5" />
                Safe to publish next to the token contract
              </li>
            </ul>
            <Link className="btn lg" href="/auth">
              Create a lock
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="lp-proof-panel">
            <div className="lp-proof-chrome">
              <span className="lp-proof-dots" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              <span className="mono dim">arcflow.app/lock/42</span>
            </div>
            <div className="lp-proof-body">
              <div className="lp-proof-title">
                <div>
                  <p className="lp-eyebrow" style={{ marginBottom: 6 }}>
                    Vault position
                  </p>
                  <h3>Lock #0042</h3>
                </div>
                <span className="live live-accent">
                  <span className="pulse-dot" />
                  Sealed
                </span>
              </div>
              <div className="lp-proof-stats">
                <div>
                  <span>Locked amount</span>
                  <strong>1,250,000 TOKEN</strong>
                </div>
                <div>
                  <span>Fully unlocks</span>
                  <strong>12 Jun 2027</strong>
                </div>
                <div>
                  <span>Release</span>
                  <strong>Hard lock</strong>
                </div>
                <div>
                  <span>Claimable now</span>
                  <strong>0</strong>
                </div>
              </div>
              <div className="lp-proof-meter">
                <div className="lp-proof-meter-row">
                  <span>Time elapsed</span>
                  <span>68%</span>
                </div>
                <div className="meter">
                  <div className="meter-fill" style={{ width: "68%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="shell lp-section" id="how">
        <div className="lp-head">
          <p className="lp-eyebrow">How it works</p>
          <h2>Three steps to a public schedule</h2>
        </div>
        <div className="lp-steps">
          {STEPS.map((step) => (
            <article className="lp-step" key={step.n}>
              <span className="lp-step-n">{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="shell lp-section" id="faq">
        <div className="lp-faq">
          <div className="lp-head" style={{ marginBottom: 0 }}>
            <p className="lp-eyebrow">FAQ</p>
            <h2>Before you lock</h2>
            <p className="lead" style={{ marginBottom: 0 }}>
              Immutable vaults, USDC gas, public proof. Contracts are not externally audited —
              testnet only.
            </p>
          </div>
          <div className="faq-list lp-faq-list">
            {FAQ.map((item) => (
              <details className="faq-item" key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="shell lp-section lp-section-last">
        <div className="cta-box lp-cta">
          <div>
            <p className="lp-eyebrow" style={{ color: "var(--ion)" }}>
              Get started
            </p>
            <h2>Open the app on Arc Testnet</h2>
            <p className="lead" style={{ marginBottom: 0 }}>
              Two minutes to create a lock and a proof URL. Not for production funds.
            </p>
          </div>
          <div className="hero-actions">
            <Link className="btn lg" href="/auth">
              Launch ArcFlow
              <ArrowRight className="size-4" />
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
