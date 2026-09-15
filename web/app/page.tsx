import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Coins,
  Fuel,
  Gift,
  Globe,
  Handshake,
  Lock,
  Shield,
  Timer,
  Waves,
} from "lucide-react";
import { FlowMock } from "@/components/FlowMock";
import { HeroShot } from "@/components/HeroShot";
import { LandingLiveCounts, LandingLiveProof } from "@/components/LandingLiveProof";
import { NETWORK_NAME, isTestnet } from "@/lib/chain";

const MARQUEE = [
  { name: "Arc", src: "/marquee/arc.svg" },
  { name: "Circle", src: "/marquee/circle.png" },
  { name: "USDC", src: "/marquee/usdc.svg" },
  { name: "MetaMask", src: "/marquee/metamask.svg" },
  { name: "Arcscan", src: "/marquee/arcscan.svg" },
  { name: "EVM", src: "/marquee/ethereum.svg" },
  { name: "Foundry", src: "/marquee/foundry.png" },
  { name: "wagmi", src: "/marquee/wagmi.png" },
];

/** Enough logos to fill wide viewports so the -50% loop never shows a gap. */
const MARQUEE_SET = [...MARQUEE, ...MARQUEE, ...MARQUEE];

const TESTIMONIALS = [
  {
    quote:
      "Finally a lock page our holders can open themselves. Amount, unlock time, beneficiary, all from the contract.",
    name: "Rina K.",
    handle: "@rinabuilds",
    avatar: "RK",
  },
  {
    quote: "Gas in USDC on Arc is such a clean flow. No second token just to pay fees.",
    name: "Devon Miles",
    handle: "@devononchain",
    avatar: "DM",
  },
  {
    quote: "We shipped team vesting in one afternoon. Cliff, linear release, public proof URL. Done.",
    name: "Maya Chen",
    handle: "@mayavc",
    avatar: "MC",
  },
  {
    quote: "The share card is what sold us. Investors stop asking for screenshots.",
    name: "Omar S.",
    handle: "@omardeploys",
    avatar: "OS",
  },
  {
    quote: "Immutable locks without an admin cancel path. That is what we needed for community trust.",
    name: "Jules Park",
    handle: "@julespark",
    avatar: "JP",
  },
  {
    quote: "Clean dashboard, fast finality, and the proof page actually reads live state.",
    name: "Theo N.",
    handle: "@theonodes",
    avatar: "TN",
  },
  {
    quote: "Cliff then linear release is exactly how we set team unlocks. No spreadsheet drama.",
    name: "Ava R.",
    handle: "@avareleases",
    avatar: "AR",
  },
  {
    quote: "Public proof URL beats Discord screenshots every time. Holders can verify themselves.",
    name: "Ken I.",
    handle: "@kenindexes",
    avatar: "KI",
  },
];

const TESTIMONIALS_ROW_B = [
  TESTIMONIALS[3],
  TESTIMONIALS[4],
  TESTIMONIALS[5],
  TESTIMONIALS[6],
  TESTIMONIALS[7],
  TESTIMONIALS[0],
  TESTIMONIALS[1],
  TESTIMONIALS[2],
];

const FEATURED = [
  {
    icon: Lock,
    title: "Token lock",
    body: "Seal an ERC-20 amount until a fixed date. No cancel, no shorten, no early exit — not even for the creator.",
    meta: "Immutable · $10 USDC fee",
    href: "/auth?next=/dashboard/locks",
  },
  {
    icon: Clock3,
    title: "Linear vesting",
    body: "Cliff, then per-second release to a beneficiary. Teams and investors claim only what has accrued.",
    meta: "start ≤ cliff ≤ end",
    href: "/auth?next=/dashboard/vesting",
  },
];

const MODULES = [
  {
    icon: Waves,
    title: "Streams",
    body: "Payroll and continuous unlocks with CSV batch create, top-up, and transfer.",
    href: "/auth?next=/dashboard/streams",
  },
  {
    icon: Gift,
    title: "Airdrops",
    body: "Merkle campaigns with instant claim or vest-to-stream. Clawback leftover after the window.",
    soon: true,
  },
  {
    icon: Handshake,
    title: "Escrow",
    body: "Fund a deal, release on delivery, or refund — both sides stay on-chain.",
    soon: true,
  },
  {
    icon: Coins,
    title: "Staking",
    body: "Permissionless reward pools. Restake does not relock lots that already unlocked.",
    soon: true,
  },
];

const FLOW = [
  {
    mock: "form" as const,
    step: "01",
    title: "Set the lock on one form",
    body: [
      "Pick the token from the connected wallet, then set how much to seal. A slider and percent chips keep the last $10 USDC for the protocol fee, so MAX never drains the gas and fee balance by accident.",
      "Send the unlock to your own address, another wallet, or a split. Days, hours, and minutes stay in sync with the calendar date. After the transaction confirms on Arc, the schedule cannot be cancelled, shortened, or pulled early.",
    ],
  },
  {
    mock: "preview" as const,
    step: "02",
    title: "Confirm the preview, then sign",
    body: [
      "The preview restates type, unlock time in UTC, duration, destination, amount, and the $10 USDC fee on one screen. Read each line against the wallet prompt so the on-chain call matches what you filled in.",
      "Nothing leaves the wallet until you approve. If a field is wrong, go back and edit the form. The vault does not store a draft, and the signed payload is the schedule that will exist on-chain.",
    ],
  },
  {
    mock: "positions" as const,
    step: "03",
    title: "Track locked and unlocked here",
    body: [
      "After confirm, the position lands under Your positions for this wallet. Switch Locked and Unlocked without leaving the page. Locks you created and schedules vesting to you sit in the same list.",
      "Open the public lock URL when a holder needs amount, countdown, and beneficiary without signing in. Claim from the same screen once the clock hits the unlock, with no extra dashboard login.",
    ],
  },
];

const PILLARS = [
  {
    icon: Shield,
    title: "The schedule cannot move",
    body: "After the transaction confirms, nobody can cancel, shorten, or redirect it. Not the creator, not an admin key. Only the beneficiary set at creation can claim, and only when the clock allows.",
  },
  {
    icon: Fuel,
    title: "Gas is the USDC you already hold",
    body: "Arc does not ask for a second gas token. The same USDC pays the lock fee and the transaction. Native gas and the USDC ERC-20 are one asset with two decimal views. Never double-count.",
  },
  {
    icon: Globe,
    title: "Holders verify without signing in",
    body: "Every position publishes at a public lock URL. Amount, unlock time, and beneficiary read live from the contract. Paste it next to the token page. No dashboard account required.",
  },
  {
    icon: Timer,
    title: "Confirmations land in under a second",
    body: "Arc finalizes fast enough that the preview you signed is the position that appears. You do not wait through extra blocks to know the vault already holds the tokens.",
  },
];

const FAQ = [
  {
    q: "Can a lock be cancelled?",
    a: "No. Once the transaction confirms, amount and schedule are immutable. There is no admin cancel path over existing vault positions.",
  },
  {
    q: "Is this the same as an LP lock?",
    a: "No. An LP lock stops the pool from being pulled. That belongs to the launchpad. ArcFlows locks tokens sitting in a wallet so they cannot be sold until the schedule allows.",
  },
  {
    q: "What pays for gas?",
    a: "USDC on Arc. The native view uses 18 decimals; the USDC ERC-20 at 0x3600…0000 uses 6. Same asset, two views. Never double-count. The mempool floor is 20 Gwei maxFeePerGas.",
  },
  {
    q: "Who can claim?",
    a: "Only the beneficiary set at creation. Anyone can open the public proof page, but nobody else can move the tokens, including the creator.",
  },
  {
    q: "Is ArcFlows custodial?",
    a: "The contract holds tokens until claim; no human key can redirect them. You keep your wallet. We keep no admin lever over locked balances.",
  },
  {
    q: "Is this ready for mainnet?",
    a: isTestnet
      ? "Arc public mainnet is not live yet, and contracts are not externally audited. Use testnet USDC only — not production funds."
      : "You are on Arc mainnet. Contracts may not be externally audited — only use funds you can afford to risk.",
  },
];

export default function LandingPage() {
  return (
    <main className="lp">
      <section className="hero lp-hero lp-hero-stage">
        <div className="lp-hero-arc" aria-hidden />
        <div className="shell lp-hero-inner">
          <div className="hero-copy">
            <p className="lp-kicker">
              <span className="pulse-dot" />
              Live on {NETWORK_NAME}
              {" · "}
              <LandingLiveCounts />
            </p>
            <h1>Lock and vest tokens on Arc</h1>
            <p className="hero-lead">
              Lock, vest, and distribute tokens on Arc with public proof anyone can verify.
            </p>
            <div className="hero-actions">
              <Link className="btn lg" href="/auth">
                Launch app
                <ArrowRight className="size-4" />
              </Link>
              <a className="btn ghost lg" href="#product">
                View products
              </a>
            </div>
          </div>

          <HeroShot />
        </div>
      </section>

      <section className="lp-marquee" aria-label="Built with">
        <div className="lp-marquee-track">
          {[0, 1].map((copy) => (
            <div className="lp-marquee-group" key={copy} aria-hidden={copy === 1}>
              {MARQUEE_SET.map((item, i) => (
                <div className="lp-marquee-item" key={`${copy}-${item.name}-${i}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="lp-marquee-logo"
                    src={item.src}
                    alt=""
                    width={28}
                    height={28}
                    loading="lazy"
                  />
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="shell lp-section" id="product">
        <div className="lp-head">
          <p className="lp-eyebrow">Products</p>
          <h2>Locks, vesting, and distribution</h2>
          <p className="lead">
            Lock, vest, stream, airdrop, escrow, and stake from a single dashboard. Holders verify
            positions on-chain, not from a screenshot.
          </p>
        </div>

        <div className="lp-bento">
          {FEATURED.map((item) => (
            <Link className="lp-card lp-bento-lg" href={item.href} key={item.title}>
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
          {MODULES.map((item) =>
            item.soon || !item.href ? (
              <div className="lp-card lp-bento-sm lp-card-soon" key={item.title}>
                <span className="lp-icon">
                  <item.icon className="size-4" />
                </span>
                <div className="lp-product-top">
                  <h3>{item.title}</h3>
                  <span className="lp-soon">Coming soon</span>
                </div>
                <p>{item.body}</p>
              </div>
            ) : (
              <Link className="lp-card lp-bento-sm" href={item.href} key={item.title}>
                <span className="lp-icon">
                  <item.icon className="size-4" />
                </span>
                <div className="lp-product-top">
                  <h3>{item.title}</h3>
                  <ArrowUpRight className="lp-card-arrow size-4" />
                </div>
                <p>{item.body}</p>
              </Link>
            ),
          )}
        </div>
      </section>

      <section className="shell lp-section" id="workflow">
        <div className="lp-head">
          <p className="lp-eyebrow">Workflow</p>
          <h2>Create, confirm, then track</h2>
          <p className="lead">
            Three screens from the same app. Set a lock, read the preview, then follow it from
            this wallet.
          </p>
        </div>
        <div className="lp-flow">
          {FLOW.map((item) => (
            <article className="lp-flow-row" key={item.step}>
              <div className="lp-flow-shot">
                <FlowMock kind={item.mock} />
              </div>
              <div className="lp-flow-copy">
                <p className="lp-flow-step">{item.step}</p>
                <h3>{item.title}</h3>
                {item.body.map((para) => (
                  <p key={para.slice(0, 24)}>{para}</p>
                ))}
                <Link className="lp-flow-link" href="/auth">
                  Open the app
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="shell lp-section" id="proof">
        <div className="lp-proof">
          <div className="lp-proof-copy">
            <p className="lp-eyebrow">Public proof</p>
            <h2>Anyone can open the lock</h2>
            <p className="lead">
              Every vault position gets a public URL. Amount, unlock time, beneficiary, and
              claimable balance read from the contract while the page is open. A holder does
              not need a dashboard login, and a screenshot is not the source of truth.
            </p>
            <p>
              Hard lock and linear vest show as live state. When the clock allows a claim, the
              claimable figure updates on that same URL. Safe to publish beside the token
              contract.
            </p>
            <Link className="btn lg" href="/auth">
              Create a lock
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <LandingLiveProof />
        </div>
      </section>

      <section className="shell lp-section" id="how">
        <div className="lp-head">
          <p className="lp-eyebrow">On Arc</p>
          <h2>What stays true after you sign</h2>
          <p className="lead">
            Once the transaction lands, the vault, the gas, and the public page are the same
            facts for everyone. USDC pays the fee. Holders do not need an account. Arc confirms
            in under a second.
          </p>
        </div>
        <div className="lp-pillars">
          {PILLARS.map((item) => (
            <article className="lp-pillar" key={item.title}>
              <span className="lp-icon">
                <item.icon className="size-4" />
              </span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-section lp-testimonials" id="voices">
        <div className="shell lp-testimonials-head">
          <div>
            <h2>
              What our <em>users</em> say
            </h2>
            <p className="lead" style={{ marginBottom: 0 }}>
              Teams locking and vesting on Arc. See what builders are saying.
            </p>
          </div>
          <a
            className="lp-testimonials-follow"
            href="https://x.com"
            target="_blank"
            rel="noreferrer"
          >
            Follow us on X
            <ArrowRight className="size-4" />
          </a>
        </div>

        <div className="lp-testimonials-rows" aria-label="User testimonials">
          {(
            [
              { items: TESTIMONIALS, reverse: false },
              { items: TESTIMONIALS_ROW_B, reverse: true },
            ] as const
          ).map((row, rowIndex) => (
            <div
              className={`lp-testimonials-rail${row.reverse ? " is-reverse" : ""}`}
              key={rowIndex}
            >
              <div className="lp-testimonials-track">
                {[0, 1].map((copy) => (
                  <div
                    className="lp-testimonials-group"
                    key={copy}
                    aria-hidden={copy === 1}
                  >
                    {row.items.map((item) => (
                      <article
                        className="lp-quote-card"
                        key={`${rowIndex}-${copy}-${item.handle}`}
                      >
                        <p>{item.quote}</p>
                        <div className="lp-quote-meta">
                          <div className="lp-quote-user">
                            <span className="lp-quote-avatar" aria-hidden>
                              {item.avatar}
                            </span>
                            <span>
                              <strong>{item.name}</strong>
                              <small>{item.handle}</small>
                            </span>
                          </div>
                          <span className="lp-quote-x" aria-hidden>
                            𝕏
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="shell lp-section" id="faq">
        <div className="lp-faq">
          <div className="lp-head" style={{ marginBottom: 0 }}>
            <p className="lp-eyebrow">FAQ</p>
            <h2>Before you lock</h2>
            <p className="lead" style={{ marginBottom: 0 }}>
              Immutable vaults, USDC gas, public proof. Contracts are not externally audited.
              Testnet only.
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
            <p className="lp-eyebrow">
              Get started
            </p>
            <h2>Open the app on {NETWORK_NAME}</h2>
            <p className="lead" style={{ marginBottom: 0 }}>
              Two minutes to create a lock and a proof URL. Not for production funds.
            </p>
          </div>
          <div className="hero-actions">
            <Link className="btn lg" href="/auth">
              Launch the app
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
          <ul className="lp-cta-meta">
            <li>Arc Testnet</li>
            <li>Chain 5042002</li>
            <li>$10 USDC fee</li>
            <li>Gas in USDC</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
