import type { Metadata } from "next";
import Link from "next/link";
import { DocCallout, DocPager, DocShell } from "@/components/docs/DocShell";

export const metadata: Metadata = {
  title: "Terms & Conditions · ArcFlows",
  description:
    "Terms governing use of the ArcFlows interface for token locks, vesting, streams, and distribution on Arc.",
};

const TOC = [
  { href: "#acceptance", label: "Acceptance" },
  { href: "#service", label: "The service" },
  { href: "#eligibility", label: "Eligibility" },
  { href: "#wallet", label: "Wallet responsibility" },
  { href: "#transactions", label: "On-chain transactions" },
  { href: "#fees", label: "Fees" },
  { href: "#proof", label: "Public proof" },
  { href: "#prohibited", label: "Prohibited use" },
  { href: "#risks", label: "Risks and disclaimers" },
  { href: "#ip", label: "Intellectual property" },
  { href: "#liability", label: "Limitation of liability" },
  { href: "#indemnity", label: "Indemnification" },
  { href: "#changes", label: "Changes" },
  { href: "#contact", label: "Contact" },
];

export default function TermsPage() {
  return (
    <DocShell
      kicker="Legal"
      title="Terms & Conditions"
      lead="These terms govern your access to and use of the ArcFlows web application and related interfaces. Please read them carefully before connecting a wallet or submitting a transaction."
      meta="Last updated September 2026"
      toc={TOC}
    >
      <section id="acceptance">
        <h2>Acceptance</h2>
        <p>
          By accessing or using ArcFlows, you agree to be bound by these Terms &amp; Conditions
          (&quot;Terms&quot;) and our <Link href="/privacy">Privacy Policy</Link>. If you do not
          agree, do not use the service.
        </p>
        <p>
          When you confirm a lock, vest, stream, claim, or other on-chain action through the
          interface, you also acknowledge that the action is irreversible once included on Arc.
        </p>
      </section>

      <section id="service">
        <h2>The service</h2>
        <p>
          ArcFlows provides a non-custodial front end to smart contracts deployed on Arc. The app
          helps you create and manage token distribution positions — including hard locks, linear
          vesting, payment streams, airdrops, escrow, and staking modules where available.
        </p>
        <p>
          ArcFlows is an interface, not a broker, exchange, custodian, or financial adviser. We do
          not hold user funds, select counterparties, or guarantee that any token, project, or
          schedule is legitimate. Smart contracts execute according to their on-chain code; the
          interface only helps you construct and submit transactions your wallet signs.
        </p>
      </section>

      <section id="eligibility">
        <h2>Eligibility</h2>
        <p>
          You must be at least 18 years old and legally permitted to use blockchain applications in
          your jurisdiction. You are responsible for ensuring that your use of ArcFlows complies
          with applicable laws, including securities, sanctions, tax, and anti-money-laundering
          rules. We may restrict access where required by law or to protect the service.
        </p>
      </section>

      <section id="wallet">
        <h2>Wallet responsibility</h2>
        <p>
          You connect your own wallet and control your private keys. Never share seed phrases or
          signing credentials with anyone, including ArcFlows support. We cannot recover lost keys,
          reverse mistaken transactions, or move funds on your behalf.
        </p>
        <p>
          You are solely responsible for verifying recipient addresses, token contracts, amounts,
          unlock schedules, cliff dates, and fee displays before you sign. Typographical errors in
          beneficiary addresses or token selections generally cannot be undone.
        </p>
      </section>

      <section id="transactions">
        <h2>On-chain transactions</h2>
        <p>
          All substantive actions occur on Arc. Once a transaction is confirmed, its effects are
          governed by smart contract logic and network rules, not by ArcFlows operators. Immutability
          is a core feature of locks and many vesting positions: funds may not be withdrawable by
          the creator before the schedule allows.
        </p>
        <p>
          Network congestion, RPC outages, wallet bugs, or user rejection of a signature may prevent
          a transaction from completing. You are responsible for paying gas in USDC (or the
          network&apos;s native gas asset as configured) and for maintaining sufficient balance to
          cover fees shown in the app.
        </p>
      </section>

      <section id="fees">
        <h2>Fees</h2>
        <p>
          Creating or interacting with certain positions may incur protocol fees payable in USDC, in
          addition to network gas. Fee amounts are displayed in the interface before you confirm an
          action. Fees may change as contracts or product configuration are updated; the amount
          shown at confirmation time applies to that transaction.
        </p>
        <p>
          ArcFlows does not issue a protocol token as part of these Terms. References to tokens in
          the interface relate to ERC-20 assets you or third parties deploy or transfer.
        </p>
      </section>

      <section id="proof">
        <h2>Public proof</h2>
        <p>
          ArcFlows generates public proof pages and shareable links for many positions. These pages
          reflect on-chain data such as token, amount, schedule, and beneficiary information.
          Anyone with the link can view that data. Do not publish proof links if you wish to keep
          position details private off-chain — the underlying chain data remains public regardless.
        </p>
      </section>

      <section id="prohibited">
        <h2>Prohibited use</h2>
        <p>You agree not to use ArcFlows to:</p>
        <ul>
          <li>Violate any applicable law or regulation.</li>
          <li>Facilitate fraud, theft, money laundering, sanctions evasion, or market manipulation.</li>
          <li>Interact with tokens or projects you know or should know are illegal or malicious.</li>
          <li>Attempt to compromise the app, wallets, RPC infrastructure, or smart contracts.</li>
          <li>Scrape or overload the service in a way that impairs availability for others.</li>
          <li>Misrepresent ArcFlows as a custodian, guarantor, or issuer of any listed token.</li>
        </ul>
      </section>

      <section id="risks">
        <h2>Risks and disclaimers</h2>
        <DocCallout label="Important">
          Digital assets and smart contracts involve substantial risk. You may lose all funds
          deposited into a position. Past on-chain activity does not predict future results.
        </DocCallout>
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES
          OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A
          PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE APP, CONTRACTS, OR
          NETWORK WILL BE ERROR-FREE, SECURE, OR UNINTERRUPTED.
        </p>
        <p>
          ArcFlows does not audit every token or project that uses the protocol. Smart contract
          bugs, admin keys on external tokens, oracle failures, and chain upgrades may cause
          unexpected outcomes. You should perform your own due diligence.
        </p>
        <p>Nothing in the app constitutes investment, legal, or tax advice.</p>
      </section>

      <section id="ip">
        <h2>Intellectual property</h2>
        <p>
          The ArcFlows name, logo, interface design, and documentation are protected by applicable
          intellectual property laws. You may not copy, modify, or reverse engineer the service
          except as permitted by law or open-source licenses where explicitly stated.
        </p>
      </section>

      <section id="liability">
        <h2>Limitation of liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, ARCFLOWS AND ITS CONTRIBUTORS, AFFILIATES, AND
          SERVICE PROVIDERS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
          OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, GOODWILL, OR DIGITAL ASSETS, ARISING
          FROM YOUR USE OF THE SERVICE OR ANY ON-CHAIN TRANSACTION, EVEN IF WE HAVE BEEN ADVISED OF
          THE POSSIBILITY OF SUCH DAMAGES.
        </p>
        <p>
          OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE IS LIMITED TO THE GREATER OF
          (A) THE FEES YOU PAID TO ARCFLOWS FOR THE SPECIFIC ACTION GIVING RISE TO THE CLAIM IN THE
          TWELVE MONTHS BEFORE THE CLAIM, OR (B) ONE HUNDRED US DOLLARS (USDC 100), IF ANY SUCH FEES
          WERE PAID.
        </p>
      </section>

      <section id="indemnity">
        <h2>Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless ArcFlows and its contributors from any claims,
          damages, losses, and expenses (including reasonable legal fees) arising from your use of the
          service, your violation of these Terms, or your violation of any rights of a third party.
        </p>
      </section>

      <section id="changes">
        <h2>Changes</h2>
        <p>
          We may modify these Terms or discontinue features at any time. Material changes will be
          reflected by updating the date on this page. Your continued use after changes become
          effective constitutes acceptance. If you do not agree to updated Terms, stop using the
          service.
        </p>
      </section>

      <section id="contact">
        <h2>Contact</h2>
        <p>
          For questions about these Terms, contact us through the official channels published on
          the <Link href="/">ArcFlows website</Link>.
        </p>
      </section>

      <DocPager
        prev={{ href: "/docs", label: "Documentation" }}
        next={{ href: "/privacy", label: "Privacy Policy" }}
      />
    </DocShell>
  );
}
