# arcflows — Arc Microgrants submission draft

Prepared 13 October 2026. English copy for submission; Indonesian notes for the builder. These are suggested sections, not verified DoraHacks form fields: the DoraHacks detail page could not be fetched. Program requirements were checked against the official Arc House announcement.

## Project name

arcflows

## Tagline

Lock. Vest. Stream. On Arc.

## Short description

arcflows is a token locking, vesting, and payment streaming application built on Arc. Teams can schedule token releases and USDC payments, while recipients and community members can inspect public proof pages without connecting a wallet.

## Project description

Token allocations and recurring payments often depend on spreadsheets, manual transfers, or screenshots of promises. Recipients need to know when funds become available, and communities need a way to inspect a release schedule directly.

arcflows brings these workflows on-chain with token locks, cliff-based linear vesting, and payment streams. Creators fund a position and define its recipient and schedule. Recipients claim funds as they become available. Public proof pages make position details accessible without requiring a wallet connection, and a CSV payroll workflow helps operators create streams for multiple recipients.

The application includes a wallet-connected dashboard, position management, and an activity explorer. Its core contracts are deployed on Arc mainnet. Solidity contracts handle funding and claims; a Next.js frontend provides the user experience; an Express/PostgreSQL backend indexes activity. The backend does not execute transactions on behalf of users.

Our focus is practical scheduling infrastructure for Arc teams: allocation vesting, contributor payments, and verifiable token release commitments.

## How the project uses Arc

Arc is the settlement layer for arcflows. Locking, vesting, stream creation, and claims execute through contracts deployed on Arc mainnet. USDC payments and USDC-denominated gas allow users to fund a payment workflow and pay transaction costs using the same asset, without obtaining a separate gas token.

The application distinguishes the native gas representation from the ERC-20 representation of USDC when handling amounts. This matters for accurate approvals, payment amounts, and transaction displays.

## What is built

- Token locks with scheduled beneficiary claims.
- Linear vesting with a cliff.
- Payment streams with configurable cancellation and top-up options.
- CSV-based payroll stream creation.
- Public position proof pages and a wallet-connected dashboard.
- An activity index backed by Express and PostgreSQL.

These features are documented in the repository and supported by its source. Include a working mainnet example below before submission. Airdrop, escrow, and staking contracts are documented as deployed, but their user interfaces are described as coming soon; they are not the focus of this application.

## What makes it useful

arcflows combines scheduled token releases and contributor payments with public verification. A team can share a position URL so a recipient or community member can inspect the schedule rather than rely on a private spreadsheet or a screenshot. On Arc, the same workflow also supports USDC payments with USDC gas.

## Current stage and security

arcflows is an early application with mainnet-deployed contracts and a publicly accessible website. The contracts have not received an external audit. Mainnet contracts use UUPS proxies, and the owner can upgrade their implementations. Under the locker implementation, there is no position cancellation or schedule-editing function; this should not be represented as a permanently immutable protocol.

No user counts, TVL, revenue, partnerships, or audit claims are included because independently verified figures have not been supplied.

## Suggested answer: How would you use the $500 USDC?

We would use the microgrant to improve the reliability and usability of the existing Arc application: $200 for application hosting, indexing, and RPC infrastructure; $150 for focused engineering on schedule previews, CSV validation, and claim error handling; $100 for mainnet demonstration transactions and deployment costs; and $50 for a short walkthrough and clearer onboarding documentation.

Our next deliverable would be a reproducible mainnet walkthrough showing a funded position, its public proof page, and a successful recipient claim. This budget is a proposal and should be adjusted to our actual costs before submission.

## Submission links and evidence

| Item | Link / value | Status |
|---|---|---|
| Website | https://arcflows.finance | HTTP 200 observed on 13 October 2026; full user journey not tested |
| Network | Arc mainnet, chain ID 5042 | Repository deployment record |
| Locker proxy | https://explorer.arc.io/address/0xCD1bEeE5856Cd0c57931258d9621FeB2052B5481 | Nonempty bytecode returned by mainnet RPC |
| Stream proxy | https://explorer.arc.io/address/0x4c6AaE1aDE8ec4f7b2E7f76135b203Fc0A500516 | Repository deployment record; not independently checked here |
| Locker deployment transaction | https://explorer.arc.io/tx/0x852f2f7da60fbb4b9a7d1787e0cd69bdb5a25f68013d811460966f0696a27883 | From repository broadcast documentation |
| Public source repo | [ADD ACCESSIBLE PUBLIC REPOSITORY URL] | Current git remote https://github.com/ponkssol/arcflow returned HTTP 404 without authentication |
| Builder profile | [ADD PUBLIC GITHUB / X / FARCASTER PROFILE] | Required |
| Mainnet proof page | [ADD URL FOR AN EXISTING MAINNET POSITION] | Use a real position; do not invent an ID |
| Creation transaction | [ADD MAINNET LOCK / STREAM TRANSACTION] | Recommended evidence of actual use |
| Successful claim transaction | [ADD MAINNET CLAIM TRANSACTION IF AVAILABLE] | Recommended end-to-end evidence |
| Demo video | [OPTIONAL: ADD SHORT WALKTHROUGH LINK] | Optional supporting evidence |

## Suggested 60–90 second demo

1. Open arcflows and show the Arc mainnet network selection.
2. Open an existing funded lock or stream and explain its amount, recipient, and schedule.
3. Show the public proof page without a connected wallet.
4. Open its creation transaction in the explorer.
5. Show a successful claim receipt, if available.
6. Briefly show the CSV payroll workflow and close with the next improvement the grant would support.

## Catatan sebelum submit

- Lengkapi repo publik, profil builder, dan satu proof page mainnet yang benar-benar bisa dibuka reviewer.
- Pastikan flow utama di website berjalan di mainnet. Bytecode kontrak dan HTTP 200 belum membuktikan keseluruhan flow berfungsi.
- Konfirmasi apakah project pernah mendapat pendanaan Circle atau Arc. Program mengecualikan pekerjaan yang sudah didanai program tersebut; jangan isi klaim belum pernah didanai tanpa konfirmasi.
- Sesuaikan anggaran usulan dengan penggunaan dana yang kamu inginkan.
- Hindari klaim “fully immutable”, “audited”, “first/only on Arc”, traction, atau partnership yang belum terbukti.
- Siapkan wallet penerima USDC di Arc untuk proses payout jika terpilih.

## Program reference

Official source: https://community.arc.io/public/events/arc-microgrants-f8tijfjhyq

The announcement lists 20 awards of 500 USDC, requires a working mainnet deployment, public repository, short description, and public builder profile. It states a deadline of 14 October 2026, 23:59 ET, equivalent to 15 October 2026, 10:59 WIB. Confirm the final deadline shown in DoraHacks before submitting because program dates may change.

Application: https://dorahacks.io/hackathon/arc-microgrants/detail
