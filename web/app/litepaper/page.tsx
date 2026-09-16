import type { Metadata } from "next";
import Link from "next/link";
import { DocCallout, DocPager, DocShell, DocTable } from "@/components/docs/DocShell";

export const metadata: Metadata = {
  title: "Litepaper · ArcFlows",
  description:
    "ArcFlows litepaper. An immutable time-lock and vesting layer for ERC-20 tokens on Arc, with public proof and USDC fees. No protocol token.",
};

const TOC = [
  { href: "#abstract", label: "01  Abstract" },
  { href: "#introduction", label: "02  Introduction" },
  { href: "#problem", label: "03  The problem" },
  { href: "#principles", label: "04  Design principles" },
  { href: "#model", label: "05  Position model" },
  { href: "#schedules", label: "06  Schedules" },
  { href: "#lifecycle", label: "07  Lifecycle" },
  { href: "#arc", label: "08  Why Arc" },
  { href: "#proof", label: "09  Public proof" },
  { href: "#modules", label: "10  Modules" },
  { href: "#fees", label: "11  Fee design" },
  { href: "#security", label: "12  Security" },
  { href: "#trust", label: "13  Trust boundaries" },
  { href: "#not", label: "14  What this is not" },
  { href: "#close", label: "15  Closing" },
];

export default function LitepaperPage() {
  return (
    <DocShell
      kicker="Litepaper"
      title="A time-lock layer for tokens on Arc"
      lead="Launchpads create supply. ArcFlows decides when that supply can move. This paper describes the vault, the proof surface, and the constraints that make a lock mean something."
      meta="Version 1.0  ·  September 2026  ·  Arc mainnet  ·  16 min read"
      variant="paper"
      toc={TOC}
    >
      <section id="abstract">
        <h2>01  Abstract</h2>
        <p>
          Crypto markets still treat “tokens are locked” as a social claim. Teams post
          screenshots. Spreadsheets stand in for contracts. Holders cannot independently verify
          amount, beneficiary, or unlock time. Launchpads often lock liquidity. Developer wallets
          remain liquid. Duplicate tickers make a tweet an unreliable identifier. The contract
          address is the only one that matters, and it is rarely paired with a page that reads a
          vault.
        </p>
        <p>
          ArcFlows is an immutable ERC-20 vault on Arc. A creator deposits tokens under a
          schedule. After the transaction confirms, nobody can cancel, shorten, or redirect the
          position. Only the named beneficiary can claim, and only when the clock allows. Every
          position has a public proof URL that reads live state. When that URL is shared, the card
          unfurls the same fields.
        </p>
        <p>
          Arc is Circle’s stablecoin-native chain. Gas is USDC. Finality is deterministic and
          sub-second. A lock can feel like a receipt rather than a multi-block wait. Fees are
          USDC. There is no ArcFlows coin, no emission schedule, and no promised airdrop of a
          protocol token.
        </p>
      </section>

      <section id="introduction">
        <h2>02  Introduction</h2>
        <p>
          Token distribution is a time problem. A team that intends not to sell still has to prove
          it. Investors who accepted a cliff still have to receive only what has accrued. A
          community that was told “dev locked” still has to check. Existing rails solve this on
          other networks: Streamflow on Solana, Sablier on several EVM chains. Arc needed a native
          one that treats USDC gas and public proof as product, not as an afterthought port.
        </p>
        <p>
          ArcFlows is that rail. The first job is narrow on purpose: seal an amount, publish a
          page, let anyone verify without permission. Vesting, streams, airdrops, escrow, and
          staking extend the same surface without weakening the rule that existing vault principal
          cannot be moved by an admin.
        </p>
        <p>
          This litepaper is a product and protocol description. It is not a securities offering,
          not investment advice, and not a token whitepaper.
        </p>
      </section>

      <section id="problem">
        <h2>03  The problem</h2>
        <p>
          On a new chain, pads ship quickly. Liquidity lock is often included. Wallet lock is
          not. Three failures repeat.
        </p>
        <h3>Unlocked developer supply</h3>
        <p>
          An LP lock stops a pool from being pulled. It does not stop tokens sitting in a
          deployer wallet from hitting the market. Holders who equate “LP locked” with “team
          locked” are reading the wrong primitive. If a pad sent 100% of supply into LP, the
          remaining risk is the dev buy. That balance needs its own vault.
        </p>
        <h3>Proof as theater</h3>
        <p>
          Duplicate tickers are common. A tweet is not an identifier. A PNG of a dashboard is not
          state. Without a URL that reads a contract, “team locked until Q3” is unverifiable and
          therefore cheap to fake. The market then discounts all such claims, including honest
          ones.
        </p>
        <h3>Manual transfers do not scale</h3>
        <p>
          Team, investors, payroll, and community drops need schedules. Ad-hoc sends create
          operational error and no public record. Cliff-then-linear release is a known pattern.
          It should exist as a contract, not as a calendar reminder.
        </p>
      </section>

      <section id="principles">
        <h2>04  Design principles</h2>
        <p>The vault is designed around five constraints.</p>
        <ol>
          <li>
            <strong>Immutability after write.</strong> A position that can be cancelled by the
            creator is not proof of anything. ArcFlows does not offer that path on vault
            principal.
          </li>
          <li>
            <strong>Pull, then hold.</strong> Tokens leave the creator at creation. A lock that
            left tokens in the deployer wallet would be a promise, not a position.
          </li>
          <li>
            <strong>Beneficiary exclusivity.</strong> Only the address set at creation can claim.
            Visibility is public. Control is not.
          </li>
          <li>
            <strong>Proof as a default.</strong> If holders cannot open a page without signing in,
            the lock exists only for the creator. Every position publishes.
          </li>
          <li>
            <strong>Fees cannot seize principal.</strong> Protocol revenue is charged at creation
            in USDC. It never sits in the locked balance and cannot be claimed out of it.
          </li>
        </ol>
      </section>

      <section id="model">
        <h2>05  Position model</h2>
        <p>
          A position is a fixed tuple written once. The contract stores token, beneficiary,
          creator, credited amount, claimed amount, start, cliff, and end. Credited amount is
          what the vault actually received. For tokens that take a transfer fee, that may be less
          than the amount the caller intended. The position is never credited more than arrived.
        </p>
        <DocTable
          headers={["Field", "Role"]}
          rows={[
            ["token", "ERC-20 held by the vault for this id."],
            ["beneficiary", "Sole address allowed to claim."],
            ["creator", "Address that opened the position. Cannot claim unless it is also beneficiary."],
            ["amount", "Credited deposit. Immutable."],
            ["claimed", "Cumulative amount already paid out."],
            ["start, cliff, end", "Schedule. start ≤ cliff ≤ end."],
          ]}
        />
        <p>
          Indexes exist by creator, beneficiary, and token so a wallet or a contract address can
          list its positions without an off-chain indexer. The explorer and proof pages can read
          the same arrays.
        </p>
        <DocCallout label="LP lock is a different product">
          <p>
            LP lock belongs to the launchpad. ArcFlows locks wallet tokens. Confusing the two is
            how unlocked developer supply survives a “locked” narrative.
          </p>
        </DocCallout>
      </section>

      <section id="schedules">
        <h2>06  Schedules</h2>
        <p>Two shapes cover the jobs that matter on day one.</p>
        <h3>Hard lock</h3>
        <p>
          Cliff equals end. Nothing is claimable until the unlock timestamp. Then the remaining
          credited amount can be claimed in full. This is the anti-dump primitive: a public, dated
          commitment over a specific balance.
        </p>
        <h3>Linear vest</h3>
        <p>
          After the cliff, released amount grows every second between start and end:
        </p>
        <p>
          <code>released(t) = amount × (t − start) / (end − start)</code>
        </p>
        <p>
          Before the cliff, released is zero even if t has passed start. At or after end, released
          is the full amount. Claim pays the difference between released and claimed. Repeat
          claims are allowed. A vest whose start is already in the past is rejected at creation
          so a proof page cannot advertise a lock while most of the bag is already liquid.
        </p>
        <p>
          A schedule that would already be fully unlocked at confirm is also rejected. A lock that
          is already over is not proof of anything.
        </p>
      </section>

      <section id="lifecycle">
        <h2>07  Lifecycle</h2>
        <p>The path is short on purpose.</p>
        <ol>
          <li>The creator approves the ERC-20 and USDC fee spend.</li>
          <li>
            <code>lock</code> pulls the fee to treasury, pulls the token into the vault, writes
            the position, and emits <code>Locked</code> and <code>FeePaid</code>.
          </li>
          <li>The proof page and share card read that record.</li>
          <li>
            When the schedule allows, the beneficiary calls <code>claim</code>. Tokens move to
            that address. <code>Claimed</code> is emitted. Claimable of zero reverts.
          </li>
        </ol>
        <p>
          There is no pause on existing principal, no upgrade hook that rewrites a position, and
          no admin function that changes beneficiary. Reentrancy on claim is blocked. If protocol
          parameters ever change, they apply only to future creates.
        </p>
      </section>

      <section id="arc">
        <h2>08  Why Arc</h2>
        <p>
          ArcFlows is written for Arc’s accounting model, not copied from an ETH-gas chain and
          patched.
        </p>
        <h3>USDC as gas</h3>
        <p>
          Users already hold the fee asset. There is no second token to source before a lock.
          Native USDC (18 decimals, gas) and the USDC ERC-20 (6 decimals, application transfers)
          share one balance. Applications must display a single figure and must never sum the two
          views. The lock fee is charged in the ERC-20 view. Gas is paid in the native view. Same
          asset.
        </p>
        <h3>Sub-second finality</h3>
        <p>
          Arc finalizes in well under a second. The preview a user signed is the position that
          appears. Proof pages do not wait extra blocks to know the vault already holds the
          tokens. That matters when the lock itself is the public signal, posted next to a
          contract address within minutes of a create.
        </p>
        <h3>Stable fees</h3>
        <p>
          Denominating gas in dollars makes the cost of locking predictable. A team deciding
          whether to prove a schedule is not also taking a volatile gas-token view. Predictable
          cost is part of making proof a habit rather than a trade.
        </p>
      </section>

      <section id="proof">
        <h2>09  Public proof</h2>
        <p>
          A lock that only the creator can see is a private diary. ArcFlows publishes every
          position at a stable path. The page shows amount, token, beneficiary, countdown,
          claimed, and claimable, read from the contract. No account is required to view it.
        </p>
        <p>
          Sharing that URL is the distribution layer. When it is posted, the open-graph card is
          rendered from the same fields, including unlock time and share of total supply. Investors
          stop asking for screenshots. Duplicate tickers stop hiding behind a PNG. The operational
          rule for the market is: if it is not on the proof page, it is not locked.
        </p>
        <p>
          An explorer lists activity by lock id, wallet, token, and transaction so a holder who
          was never sent a link can still search.
        </p>
      </section>

      <section id="modules">
        <h2>10  Modules</h2>
        <p>
          Locks and vesting are the core. Adjacent modules reuse the same rule: they must not
          create an admin path over vault principal that already exists.
        </p>
        <DocTable
          headers={["Module", "Job", "Constraint"]}
          rows={[
            [
              "Streams",
              "Continuous unlocks for payroll and grants. Batch create, top-up, transfer.",
              "Does not rewrite an existing hard lock.",
            ],
            [
              "Airdrops",
              "Merkle campaigns. Instant claim or vest-into-stream.",
              "Unclaimed leftover may be clawed back after the window. Claimed balances may not.",
            ],
            [
              "Escrow",
              "Two-party hold: fund, release on delivery, or refund.",
              "Outcome is the deal, not a silent admin key on unrelated locks.",
            ],
            [
              "Staking",
              "Permissionless reward pools.",
              "Restake does not relock lots that already unlocked.",
            ],
          ]}
        />
      </section>

      <section id="fees">
        <h2>11  Fee design</h2>
        <p>
          ArcFlows charges a flat USDC fee at lock creation, currently ten dollars in the ERC-20
          six-decimal view, plus network gas in USDC. A split create charges that fee once per
          destination. The fee is pulled to treasury before the position is written. It never
          enters <code>totalLocked</code>.
        </p>
        <p>
          Later modules may price per recipient, per streamed dollar, or per reward. None of those
          fees can move tokens that are already locked. Protocol revenue is not a backdoor into
          the vault.
        </p>
        <p>
          There is no protocol token that captures fees, no vote-escrow, and no emission. Users
          pay USDC. That is the entire commercial surface described here.
        </p>
      </section>

      <section id="security">
        <h2>12  Security</h2>
        <p>
          The vault is intentionally small. Positions are immutable after write. Claim is
          non-reentrant. Token amounts use a width that fits real supplies without wasting
          storage. External token calls require a successful return; fee-on-transfer tokens are
          credited by balance delta, not by the amount the caller specified.
        </p>
        <p>
          Minimum duration and “end must be in the future” exist so a confirmed lock is actually a
          lock. Start-in-the-past is rejected for vests that would otherwise present as locked
          while already largely claimable.
        </p>
        <p>
          Treasury is set at initialize and is not rotatable in this implementation.
          New deploys put the locker behind a UUPS proxy, so the owner key can replace
          the logic. Users should still treat unaudited bytecode with caution and should
          verify the canonical deployment they are asked to approve.
        </p>
      </section>

      <section id="trust">
        <h2>13  Trust boundaries</h2>
        <p>
          ArcFlows trusts the chain’s clock, the ERC-20 it received, and the user’s wallet. It
          does not trust the token’s future mint, tax, blacklist, or upgrade. A lock covers the
          deposited balance. It does not cap total supply. It does not make a honeypot sellable.
          It does not freeze a malicious admin on the token contract.
        </p>
        <p>
          The interface never asks for a signature that is not approve, create, claim, or an
          equivalent module action. Canonical domain only. Pages that impersonate ArcFlows to run
          “airdrop checkers” are outside the protocol and should be treated as hostile.
        </p>
        <p>
          Software, not a custodian beyond the contract. Not investment advice. A public proof
          page is evidence of a schedule, not of a project’s quality.
        </p>
      </section>

      <section id="not">
        <h2>14  What this is not</h2>
        <ul>
          <li>Not a launchpad, AMM, or chart.</li>
          <li>Not an LP lock. That is the pad.</li>
          <li>Not a custodian beyond the smart contract.</li>
          <li>Not a guarantee that a token is safe.</li>
          <li>
            Not a protocol token. There is no ArcFlows coin, no tokenomics, and no promised
            airdrop. Fees are USDC.
          </li>
        </ul>
        <p>
          The job stays narrow: time-lock a balance, publish the proof, let holders verify without
          asking permission.
        </p>
      </section>

      <section id="close">
        <h2>15  Closing</h2>
        <p>
          Markets discount claims they cannot check. ArcFlows makes the check cheap: a URL, a
          vault, a clock. Arc makes the act of writing that vault cheap and final. Together they
          turn “dev locked” from a caption into a position.
        </p>
        <p className="doc-close">
          Operational detail lives in the <Link href="/docs">product documentation</Link>. To open
          a position, <Link href="/auth">launch the app</Link> on Arc.
        </p>
      </section>

      <DocPager prev={{ href: "/docs", label: "Documentation" }} />
    </DocShell>
  );
}
