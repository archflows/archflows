import type { Metadata } from "next";
import Link from "next/link";
import { DocPager, DocShell } from "@/components/docs/DocShell";

export const metadata: Metadata = {
  title: "Privacy Policy · ArcFlows",
  description:
    "How ArcFlows collects, uses, and protects information when you use the token distribution interface on Arc.",
};

const TOC = [
  { href: "#overview", label: "Overview" },
  { href: "#collect", label: "Information we collect" },
  { href: "#use", label: "How we use information" },
  { href: "#storage", label: "Local storage" },
  { href: "#third-parties", label: "Third-party services" },
  { href: "#on-chain", label: "On-chain data" },
  { href: "#retention", label: "Retention" },
  { href: "#rights", label: "Your choices" },
  { href: "#children", label: "Children" },
  { href: "#changes", label: "Changes" },
  { href: "#contact", label: "Contact" },
];

export default function PrivacyPage() {
  return (
    <DocShell
      kicker="Legal"
      title="Privacy Policy"
      lead="ArcFlows is a non-custodial interface for token locks, vesting, streams, and related distribution tools on Arc. This policy explains what information the app may process and what stays on-chain or in your browser."
      meta="Last updated September 2026"
      toc={TOC}
    >
      <section id="overview">
        <h2>Overview</h2>
        <p>
          ArcFlows (&quot;we&quot;, &quot;us&quot;, or &quot;the app&quot;) provides a web interface to
          interact with smart contracts on the Arc network. We do not custody your tokens, hold your
          private keys, or execute transactions on your behalf. When you connect a wallet, you sign
          transactions directly in your wallet provider.
        </p>
        <p>
          By using ArcFlows, you agree to the collection and use of information as described in
          this Privacy Policy and our{" "}
          <Link href="/terms">Terms &amp; Conditions</Link>.
        </p>
      </section>

      <section id="collect">
        <h2>Information we collect</h2>
        <p>Depending on how you use the app, we may process the following categories of information:</p>
        <ul>
          <li>
            <strong>Wallet addresses</strong> — When you connect a wallet, we read your public
            address to show balances, positions, and transaction history relevant to the interface.
          </li>
          <li>
            <strong>On-chain activity</strong> — Transactions you submit through the app are
            recorded on Arc and are publicly visible on block explorers such as Arcscan.
          </li>
          <li>
            <strong>Usage and technical data</strong> — Standard web logs may include IP address,
            browser type, device information, referring URLs, and pages visited. This helps us
            operate, secure, and improve the service.
          </li>
          <li>
            <strong>Locally stored preferences</strong> — Some features, such as saved contacts and
            contact categories, are stored in your browser&apos;s local storage and are not sent to
            our servers unless you explicitly share that data elsewhere.
          </li>
        </ul>
        <p>
          We do not ask for your name, email, government ID, or payment card details to use the core
          product. Wallet connection is handled by third-party providers you choose.
        </p>
      </section>

      <section id="use">
        <h2>How we use information</h2>
        <p>We use the information described above to:</p>
        <ul>
          <li>Render dashboard views, proof pages, and explorer listings tied to your wallet or position IDs.</li>
          <li>Submit read requests to Arc RPC endpoints and indexers to fetch on-chain state.</li>
          <li>Display fees, schedules, beneficiaries, and claim status for positions you create or view.</li>
          <li>Detect abuse, debug errors, and maintain the reliability and security of the interface.</li>
          <li>Improve product design and documentation based on aggregate usage patterns.</li>
        </ul>
        <p>We do not sell your personal information.</p>
      </section>

      <section id="storage">
        <h2>Stored data</h2>
        <p>
          Contacts and categories you save in the dashboard are stored in our database, keyed to
          your connected wallet address, so they follow you across browsers and devices. Some
          interface preferences may still be kept locally in your browser.
        </p>
      </section>

      <section id="third-parties">
        <h2>Third-party services</h2>
        <p>ArcFlows relies on services outside our direct control, including:</p>
        <ul>
          <li>
            <strong>Wallet providers</strong> — Such as browser extension wallets or WalletConnect
            sessions. Their privacy policies govern how they handle your keys and connection data.
          </li>
          <li>
            <strong>Arc RPC and explorers</strong> — Public infrastructure used to read chain state
            and link to transaction receipts.
          </li>
          <li>
            <strong>Hosting and analytics</strong> — Infrastructure providers that may process
            technical logs when you load the website.
          </li>
        </ul>
        <p>
          Public proof pages and share URLs may be indexed by search engines or cached by third
          parties because on-chain position metadata is public by design.
        </p>
      </section>

      <section id="on-chain">
        <h2>On-chain data</h2>
        <p>
          Blockchain data is permanent and public. When you create a lock, vesting schedule, stream,
          airdrop, or similar position, relevant details — including token contract, amounts,
          beneficiaries, unlock times, and transaction hashes — are written to Arc and visible to
          anyone. ArcFlows cannot delete or modify on-chain records after they are confirmed.
        </p>
      </section>

      <section id="retention">
        <h2>Retention</h2>
        <p>
          Server logs and operational data are retained only as long as needed for security,
          troubleshooting, and legal compliance, then deleted or aggregated. On-chain data persists
          according to the Arc network. Locally stored dashboard data persists until you remove it
          from your browser.
        </p>
      </section>

      <section id="rights">
        <h2>Your choices</h2>
        <p>You can:</p>
        <ul>
          <li>Disconnect your wallet at any time and stop using the interface.</li>
          <li>Clear browser storage to remove locally saved contacts and preferences.</li>
          <li>Use a different wallet or browser if you prefer not to associate activity with a prior address.</li>
          <li>Block cookies or scripts through your browser settings, though some features may not work correctly.</li>
        </ul>
        <p>
          Depending on your jurisdiction, you may have additional rights to access, correct, or
          delete personal data we hold off-chain. Contact us using the details below to make a
          request. We may need to verify wallet ownership before responding.
        </p>
      </section>

      <section id="children">
        <h2>Children</h2>
        <p>
          ArcFlows is not directed at children under 18. We do not knowingly collect personal
          information from minors. If you believe a minor has provided information through the app,
          contact us and we will take appropriate steps to remove off-chain records where feasible.
        </p>
      </section>

      <section id="changes">
        <h2>Changes</h2>
        <p>
          We may update this Privacy Policy from time to time. The &quot;Last updated&quot; date at
          the top of this page will change when we do. Continued use of ArcFlows after an update
          means you accept the revised policy.
        </p>
      </section>

      <section id="contact">
        <h2>Contact</h2>
        <p>
          Questions about this Privacy Policy can be directed through our official project channels
          listed on the <Link href="/">ArcFlows website</Link> or in project documentation.
        </p>
      </section>

      <DocPager
        prev={{ href: "/terms", label: "Terms & Conditions" }}
        next={{ href: "/docs", label: "Documentation" }}
      />
    </DocShell>
  );
}
