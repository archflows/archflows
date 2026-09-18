import type { Metadata } from "next";
import Link from "next/link";
import { DocCallout, DocPager, DocShell, DocTable } from "@/components/docs/DocShell";

export const metadata: Metadata = {
  title: "Documentation · ArcFlows",
  description:
    "Product documentation for ArcFlows: hard locks, linear vesting, proof pages, claims, fees, and distribution modules on Arc.",
};

const TOC = [
  { href: "#introduction", label: "Introduction" },
  { href: "#concepts", label: "Concepts" },
  { href: "#connect", label: "Connect a wallet" },
  { href: "#locks", label: "Create a hard lock" },
  { href: "#beneficiaries", label: "Beneficiaries and splits" },
  { href: "#vesting", label: "Linear vesting" },
  { href: "#proof", label: "Proof pages" },
  { href: "#share", label: "Share cards" },
  { href: "#claim", label: "Claiming" },
  { href: "#explorer", label: "Explorer" },
  { href: "#streams", label: "Streams" },
  { href: "#airdrops", label: "Airdrops" },
  { href: "#escrow", label: "Escrow" },
  { href: "#staking", label: "Staking" },
  { href: "#fees", label: "Fees and USDC" },
  { href: "#rules", label: "Protocol rules" },
  { href: "#limits", label: "What a lock does not do" },
  { href: "#faq", label: "FAQ" },
];

export default function DocsPage() {
  return (
    <DocShell
      kicker="Documentation"
      title="ArcFlows product guide"
      lead="How to lock, vest, verify, and claim ERC-20 tokens on Arc. This guide covers the vault, proof pages, fees, and the rest of the distribution surface."
      toc={TOC}
    >
      <section id="introduction">
        <h2>Introduction</h2>
        <p>
          ArcFlows is a token distribution protocol on Arc. Launchpads create supply. ArcFlows
          decides when that supply can move. After a token is created, a project deposits an ERC-20
          amount into an immutable vault under a schedule. Holders verify the position from a public
          URL. The beneficiary claims when the clock allows. Nobody else can.
        </p>
        <p>
          The product is built for the minutes after a pad create, when a deployer still holds a
          leftover allocation or a dev buy, and for the slower work of team and investor vesting.
          It is not a launchpad, a DEX, a chart, or an LP locker. Those jobs stay with the pad and
          the market.
        </p>
        <p>
          Gas on Arc is USDC. There is no second gas token to acquire before a lock. Confirmations
          finalize in under a second, so the preview you sign is the position that appears.
        </p>
      </section>

      <section id="concepts">
        <h2>Concepts</h2>
        <p>
          Every ArcFlows position is an on-chain record: token, beneficiary, creator, credited
          amount, claimed amount, start, cliff, and end. Tokens leave the creator wallet at
          creation. They sit in the vault until claim.
        </p>
        <DocTable
          headers={["Module", "Name"]}
          rows={[
            ["Lock / vest vault", "arcflows locker"],
            ["Streams / payroll", "arcflows stream"],
            ["Merkle campaigns", "arcflows airdrop"],
            ["P2P escrow", "arcflows escrow"],
            ["Staking pools", "arcflows staking"],
          ]}
        />
        <DocTable
          headers={["Type", "Release", "Typical use"]}
          rows={[
            [
              "Hard lock",
              "Nothing until end, then the remainder is claimable in full.",
              "Dev buy, leftover allocation, “do not dump” proof.",
            ],
            [
              "Linear vest",
              "Zero until cliff, then per-second unlock until end.",
              "Team, investors, advisors.",
            ],
          ]}
        />
        <p>
          A hard lock is a vest whose cliff equals its end. The same contract stores both. Each
          position still gets its own proof page.
        </p>
        <DocCallout label="Definition">
          <p>
            An LP lock stops a liquidity pool from being pulled. That belongs to the launchpad.
            ArcFlows locks tokens that sit in a wallet so they cannot be sold until the schedule
            says so. If a pad sent 100% of supply into LP, lock the dev-buy tokens, not the pool.
          </p>
        </DocCallout>
      </section>

      <section id="connect">
        <h2>Connect a wallet</h2>
        <ol>
          <li>
            Open <Link href="/auth">Launch app</Link>.
          </li>
          <li>Connect MetaMask, Rabby, or another injected browser wallet.</li>
          <li>Switch the wallet to Arc if it is not already there.</li>
          <li>
            Hold USDC for gas and for the lock fee. Native gas and the USDC ERC-20 are the same
            asset with two decimal views. Never add those balances together.
          </li>
        </ol>
        <p>
          After connect, the app opens the dashboard: overview, locks, vesting, streams, airdrops,
          escrow, and staking. You do not create an account. The wallet is the identity.
        </p>
        <p>
          If the wallet is on the wrong network, the auth screen asks you to switch to Arc before
          it opens the console.
        </p>
      </section>

      <section id="locks">
        <h2>Create a hard lock</h2>
        <p>
          A hard lock seals an ERC-20 amount until a fixed unlock time. Nothing releases early.
          When that time is reached, only the beneficiary can claim what remains.
        </p>
        <ol>
          <li>
            Go to <Link href="/dashboard/locks">Locks</Link>.
          </li>
          <li>
            Pick a token from the connected wallet. The list is the set of ERC-20 balances that
            wallet holds on Arc.
          </li>
          <li>
            Set the amount. Percent chips and the slider leave enough USDC for the protocol fee
            and gas when you press MAX, so the last dollars are not drained by accident.
          </li>
          <li>
            Set duration with days, hours, and minutes, or with the calendar. Those controls stay
            in sync. Unlock time is stored and displayed in UTC.
          </li>
          <li>
            Choose who receives the unlock: yourself, another wallet, or a split across several
            addresses.
          </li>
          <li>
            Read the preview. Type, unlock time, duration, destination, amount, and fee must match
            the wallet prompt.
          </li>
          <li>Approve the token if the vault does not already have allowance, then sign the lock.</li>
        </ol>
        <p>
          After the transaction confirms, the schedule cannot be cancelled, shortened, or
          redirected. Not by you. Not by an admin key. The vault does not store a draft. The signed
          payload is the schedule that exists on-chain.
        </p>
        <p>
          If the token charges a transfer fee, the position is credited with what actually arrived
          in the vault, never more than that. A lock that would already be fully unlocked at
          confirm is rejected. A start time in the past is also rejected, so a backdated vest
          cannot look locked on a proof page while most of the bag is already claimable.
        </p>
      </section>

      <section id="beneficiaries">
        <h2>Beneficiaries and splits</h2>
        <p>
          The beneficiary is the only address that can claim. It is set at creation and cannot be
          changed. Default is the connected wallet.
        </p>
        <p>
          A split creates one position per destination, each with its own proof URL. The create
          costs a flat <strong>$15 USDC</strong> in one transaction. If the creator was referred,
          15% of that $15 goes to the referral pool. Amounts are allocated by the percentages you
          enter. The last row receives the remainder so units are not lost to rounding.
        </p>
        <DocTable
          headers={["Action", "Creator", "Beneficiary", "Anyone else"]}
          rows={[
            ["Create the lock", "Yes", "If they are also the creator", "No"],
            ["View the proof page", "Yes", "Yes", "Yes"],
            ["Claim unlocked tokens", "No", "Yes", "No"],
            ["Cancel or shorten", "No", "No", "No"],
          ]}
        />
      </section>

      <section id="vesting">
        <h2>Linear vesting</h2>
        <p>
          Vesting is for allocations that should unlock over time rather than on a single date.
          Create it from <Link href="/dashboard/vesting">Vesting</Link>.
        </p>
        <ul>
          <li>
            <strong>Start.</strong> The clock for the linear portion. If omitted, the contract
            uses the block timestamp at creation.
          </li>
          <li>
            <strong>Cliff.</strong> Nothing is claimable before this timestamp, even if the linear
            formula would already have released some amount.
          </li>
          <li>
            <strong>End.</strong> At this timestamp the full credited amount is released.
          </li>
        </ul>
        <p>
          After the cliff, released amount grows every second from start to end:
        </p>
        <p>
          <code>released = amount × (now − start) / (end − start)</code>, then clamped so that
          nothing is released before the cliff and everything is released at end.
        </p>
        <p>
          The beneficiary can claim as often as they want. Each claim pays only what has accrued
          since the last claim. Restaking, streaming, or other modules do not rewrite this
          schedule.
        </p>
      </section>

      <section id="proof">
        <h2>Proof pages</h2>
        <p>
          Every position publishes at <code>/lock/{"{id}"}</code>. The page reads live contract
          state: amount, token, beneficiary, creator, countdown, claimed, claimable, and whether
          the schedule is a hard lock or a vest.
        </p>
        <p>
          Holders do not connect a wallet to read it. Paste the URL next to the token contract.
          The rule is simple: if it is not on this page, it is not locked.
        </p>
        <p>
          The beneficiary can claim from the same page once the clock allows. Copy proof link
          copies the canonical URL for that id.
        </p>
      </section>

      <section id="share">
        <h2>Share cards</h2>
        <p>
          When someone posts a proof URL on X, Discord, or Telegram, the unfurl card is generated
          from the same on-chain fields: amount, ticker, lock type, duration, unlock time, share
          of total supply, and beneficiary. It is not a screenshot and it is not a cached PNG from
          the creator.
        </p>
        <p>
          The create form shows a live share preview so you can see the card before you sign. After
          confirm, the same layout appears on the proof page and at{" "}
          <code>/lock/{"{id}"}/opengraph-image</code>.
        </p>
      </section>

      <section id="claim">
        <h2>Claiming</h2>
        <p>
          Only the beneficiary set at creation can call claim. The creator cannot pull early.
          Anyone can open the proof page; nobody else can move the tokens.
        </p>
        <ul>
          <li>Hard lock: after end, claim the full remaining balance.</li>
          <li>Vesting: claim whatever has accrued since the last claim. Repeat as it unlocks.</li>
        </ul>
        <p>
          Claim from the proof page or from Your positions in the dashboard. If nothing is
          unlocked yet, the button stays disabled. A claim that would pay zero reverts.
        </p>
      </section>

      <section id="explorer">
        <h2>Explorer</h2>
        <p>
          The <Link href="/explorer">Explorer</Link> lists public lock activity. Search by lock
          id, wallet, token, or transaction hash. It is a read surface, not a place to create
          positions.
        </p>
        <p>
          Use it when a holder has a contract address and wants to know whether any ArcFlows
          positions exist for that token, without needing a tweeted URL.
        </p>
      </section>

      <section id="streams">
        <h2>Streams</h2>
        <p>
          Streams are continuous unlocks for payroll, grants, and other flows that should move
          every second rather than sit behind a single cliff. Create them from the dashboard with
          a token, recipient, amount, and duration. CSV batch create is supported for many
          recipients in one sitting.
        </p>
        <p>
          Streams can be topped up and, where the module allows, transferred. They do not rewrite
          an existing hard lock. A lock that has already unlocked stays unlocked if the same
          wallet later opens a stream.
        </p>
      </section>

      <section id="airdrops">
        <h2>Airdrops</h2>
        <p>
          Airdrops are merkle campaigns. Recipients claim against a root, either instantly or
          into a vest/stream so the drop does not hit the market in one block. After the claim
          window, leftover unclaimed tokens can be clawed back. Claimed balances cannot.
        </p>
        <p>
          An airdrop is not an ArcFlows token event. It is a distribution of whatever ERC-20 the
          campaign funded.
        </p>
      </section>

      <section id="escrow">
        <h2>Escrow</h2>
        <p>
          Escrow funds a two-party deal on-chain. The buyer deposits. On delivery the funds
          release to the seller. If the deal fails, they refund. Both sides stay on the contract
          until that outcome. Escrow is not a time-lock of a meme allocation; it is a commercial
          hold.
        </p>
      </section>

      <section id="staking">
        <h2>Staking</h2>
        <p>
          Staking pools are permissionless. A publisher funds rewards. Stakers deposit and earn.
          Restake does not relock lots that already unlocked from a separate ArcFlows position.
          Staking yield is not a substitute for a hard lock, and a hard lock is not a stake.
        </p>
      </section>

      <section id="fees">
        <h2>Fees and USDC</h2>
        <p>
          Creating a lock pays a flat <strong>$10 USDC</strong> protocol fee, plus network gas in
          USDC. A split lock is <strong>$15 USDC</strong> flat, charged once on-chain however many
          wallets. If the creator was referred, 15% of that fee goes to the referral pool and the
          rest to the platform treasury — the same split as a $10 lock. The fee never sits inside{" "}
          <code>totalLocked</code>. It cannot be claimed out of a position.
        </p>
        <p>
          On Arc, USDC has two interfaces that share one balance. The native view uses 18 decimals
          and is for gas. The ERC-20 view uses 6 decimals and is for transfers, approvals, and the
          lock fee. Display a single USDC figure from the ERC-20 view. Do not convert, wrap, or
          double-count.
        </p>
        <DocCallout label="Gas">
          <p>
            Arc mempool policy expects a floor on <code>maxFeePerGas</code>. The app sets this on
            write calls so a lock is not stuck below the network minimum.
          </p>
        </DocCallout>
      </section>

      <section id="rules">
        <h2>Protocol rules</h2>
        <ul>
          <li>Tokens move into the vault at lock. They do not stay in the creator wallet.</li>
          <li>
            Valid schedule: <code>start ≤ cliff ≤ end</code>, end in the future, duration at least
            the protocol minimum.
          </li>
          <li>No cancel, no shorten, no reassignment after confirm.</li>
          <li>Only the beneficiary can claim.</li>
          <li>Fee and treasury logic cannot seize locked principal.</li>
          <li>
            If parameters change later, they apply to future creates, never to existing vault
            balances.
          </li>
        </ul>
      </section>

      <section id="limits">
        <h2>What a lock does not do</h2>
        <p>
          A lock is not a guarantee the token is safe. Honeypot, mint, tax, blacklist, and proxy
          upgrades on the token itself still exist. ArcFlows only enforces the time schedule on
          the balance it received.
        </p>
        <p>
          It is not custody beyond the contract. You keep your wallet. There is no support process
          that can move someone else’s position. Canonical domain only. ArcFlows never asks for a
          signature that is not approve, create, claim, or an equivalent module action.
        </p>
      </section>

      <section id="faq">
        <h2>FAQ</h2>
        <h3>Can a lock be cancelled?</h3>
        <p>
          No. Once the transaction confirms, amount and schedule are immutable. There is no admin
          cancel path over existing vault positions.
        </p>
        <h3>Is this the same as an LP lock?</h3>
        <p>
          No. LP lock belongs to the launchpad. ArcFlows locks wallet tokens so they cannot be
          sold until the schedule allows.
        </p>
        <h3>What pays for gas?</h3>
        <p>
          USDC on Arc. Native gas uses 18 decimals; the USDC ERC-20 uses 6. Same asset, two views.
          Never double-count.
        </p>
        <h3>Who can claim?</h3>
        <p>Only the beneficiary set at creation.</p>
        <h3>Is ArcFlows custodial?</h3>
        <p>
          The contract holds tokens until claim. No human key can redirect them. You keep your
          wallet.
        </p>
        <h3>Does a lock stop the team from minting more tokens?</h3>
        <p>
          No. It only covers the amount deposited. If the token can mint, that supply is outside
          the vault.
        </p>
        <h3>What if I lock the wrong amount or the wrong beneficiary?</h3>
        <p>
          You cannot edit it after confirm. Read the preview against the wallet prompt before you
          sign.
        </p>
        <h3>Is there an ArcFlows token?</h3>
        <p>No. Fees are USDC. There is no protocol coin and no promised airdrop of one.</p>
      </section>

      <DocPager next={{ href: "/litepaper", label: "Litepaper" }} />
    </DocShell>
  );
}
