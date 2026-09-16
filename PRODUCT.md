# ArcFlows — Product Document

**Lock. Vest. Stream. On Arc.**

Status: living spec · last updated 16 September 2026  
Audience: founders, builders, auditors, pad partners, anyone shipping the brand  
Stack: Foundry contracts in `contracts/src/` · Next.js app in `web/` · Express + Postgres index in `backend/`

Public wordmark is **arcflows** (all lowercase, as on the logo). Solidity identifiers stay `ArcFlow*` so deploys and ABIs do not move. Do not print `ArcFlow` on a proof page, tweet, or explorer label.

---

## 1. One-liner

Launchpads create supply. ArcFlows decides **when** that supply can move.

A creator deposits ERC-20s under a schedule on Arc. After the transaction confirms, nobody can cancel, shorten, or redirect the position. Only the named beneficiary can claim, and only when the clock allows. Every position has a public proof URL that reads live state.

## 2. Positioning

| | |
|---|---|
| Category | Token operations — lock, vest, stream (airdrop, escrow, stake next) |
| Chain | Arc (USDC gas, sub-second finality) |
| Analogy | [Streamflow](https://streamflow.finance/) for Solana, [Sablier](https://docs.sablier.com/) for EVM — Arc-native, proof-first, pad-adjacent |
| Enemy | Screenshot “team locked”, spreadsheet vesting, unlocked dev wallets |
| Not competing with | Launchpads, DEX terminals, bridges |

**LP lock ≠ ArcFlows.**  
LP lock = the pool cannot be pulled. That is the pad.  
ArcFlows = tokens that were sitting in a wallet cannot be sold until the schedule says so.

## 3. Problem

1. Arc day-1 is crowded with pads. Many lock LP. **Dev wallets stay liquid.**
2. Duplicate tickers: the contract address is the only identifier. A tweet is not proof.
3. Manual transfers do not scale for team, investors, airdrops, payroll.
4. Streamflow is not on Arc. Sablier is not on Arc. The slot was empty; this is the rail.
5. Holders had no page that reads a vault without connecting a wallet.

## 4. Jobs to be done

| Job | User | Moment |
|---|---|---|
| Prove I will not dump | Deployer | Seconds after pad create |
| Verify unlock date | Holder / CT | Before buying |
| Vest team + investors | Real project | After raise / after a meme survives |
| Pay people over time | Agency / DAO | USDC or token streams |
| Drop tokens without instant dump | Community | Airdrop campaigns |

## 5. Personas

**P1 — Pad deployer**  
Just launched. Has leftover allocation or a dev buy. Needs a link next to the CA. Will not read docs. Two clicks max.

**P2 — Holder / degen**  
Sees a CA on X. Wants “dev locked until when?” Opens the proof page. Does not connect a wallet.

**P3 — Team / investor**  
Cliff, then linear. Multiple wallets. CSV batch. A page per person.

**P4 — Operator**  
Pays USDC salary or vendor invoices on a schedule. Cares that gas is already dollars.

---

## 6. What is shipped

Arc public mainnet launched 16 September 2026 ([Arc](https://www.arc.io/blog/arc-mainnet-goes-live-on-september-16-2026)). ArcFlows is live on **Arc Testnet** (chain `5042002`). Mainnet deploy of the vault is the next freeze — see `contract-addres.md`. Do not tweet “ArcFlows is live on mainnet” until that address is in that file.

### Live for users

| Surface | Status |
|---|---|
| Immutable token lock (hard lock, $10 USDC fee) | Live on testnet |
| Linear vesting with cliff | Live on testnet |
| Streams (single + payroll CSV, cancelable / top-up) | Live on testnet |
| Public proof pages (`/lock/[id]`, `/stream/[id]`, …) | Live |
| Share / OG / Twitter cards on lock pages | Live |
| Dashboard (create + my positions) | Live |
| Marketing site, docs, litepaper | Live |
| In-app explorer | Live |
| Contacts list | Live |
| Wallet connect (Arc + USDC gas) | Live |

### Built on-chain, UI not opened yet

Contracts are deployed on testnet. Dashboard entries are marked coming soon so we do not send unaudited flows at real users.

| Module | Contract | UI |
|---|---|---|
| Airdrops / merkle distributor | `ArcFlowDistributor` | Coming soon |
| Escrow | `ArcFlowEscrow` | Coming soon |
| Staking | `ArcFlowStaking` | Coming soon |
| Referral | — | Coming soon |

### Content and brand kit

| Asset | Where |
|---|---|
| Wordmark | `web/public/logoarcflows-v2.png` |
| Mark only | `web/public/logo-mark.png` |
| Marketing stills + clips | `content/posts/out/` |
| Intro / launch videos | `content/intro/` |
| Source plates | `content/bahan/` |

### Not shipped

- External audit
- ArcFlows mainnet vault address (canonical freeze)
- Pad SDK / create+lock in one tx
- Protocol token or airdrop of a protocol coin — **will not ship**

---

## 7. Screens

| Route | Purpose |
|---|---|
| `/` | Marketing. Positioning, live proof, modules, FAQ |
| `/auth` | Wallet connect, then into dashboard |
| `/dashboard` | Home |
| `/dashboard/locks` | Create hard lock |
| `/dashboard/locks/positions` | My locks |
| `/dashboard/vesting` | Create linear vest |
| `/dashboard/vesting/positions` | My vests |
| `/dashboard/streams` | Create stream |
| `/dashboard/streams/payroll` | CSV batch payroll |
| `/dashboard/streams/positions` | My streams |
| `/dashboard/contacts/*` | Address book |
| `/dashboard/staking`, `/airdrops`, `/escrow`, `/referral` | Coming soon shells |
| `/lock/[id]` | Proof + claim. No wallet required to read |
| `/stream/[id]`, `/airdrop/[id]`, `/escrow/[id]`, `/staking/[id]` | Proof surfaces |
| `/explorer` | Recent activity |
| `/me` | Legacy list of created locks |
| `/docs` | Product docs |
| `/litepaper` | Protocol paper |

Copy on create: *Read it before you sign.*  
Proof page rule: **if it is not on this page, it is not locked.**

---

## 8. Contract rules

Lock vault: `contracts/src/ArcFlow.sol`  
Deployed immutable (no owner, no proxy) at `0xbfbc6d4889b21ABFAeDc145aef3760529E3329b6` on Arc Testnet.

| Rule | Why |
|---|---|
| Immutable after `lock` | Trust. No “I unlocked early” |
| `start ≤ cliff ≤ end` | Valid schedule |
| Hard lock = `cliff == end` | Nothing until T |
| Tokens pulled in on lock | Cannot stay in the dev wallet |
| Only `beneficiary` can `claim` | Proof of who receives |
| No admin rug on vault principal | A lock an owner could upgrade would not prove anything |
| Flat $10 USDC fee at creation | Revenue never sits inside locked principal |
| Anti-backdate + minimum duration | No “already unlocked” lock |

Streams, distributor, escrow, staking sit behind UUPS proxies. The **lock vault does not.** Old vaults stay live so existing positions keep their address.

Addresses, previous vaults, and upgrade txs: `contract-addres.md`.

---

## 9. Feature catalog vs Streamflow

| Module | Streamflow | ArcFlows |
|---|---|---|
| Wallet token lock | Yes | **Shipped** |
| Linear + cliff vest | Yes | **Shipped** |
| Shareable proof page | Yes | **Shipped** (OG unfurl) |
| Batch vest / payroll CSV | Yes | **Shipped** on streams |
| Airdrop + claim | Yes | Contract live, UI soon |
| USDC / token streaming | Yes (Solana) | **Shipped** — Arc advantage |
| Escrow / milestones | Yes | Contract live, UI soon |
| Staking-as-a-service | Yes | Contract live, UI soon |
| LP lock | Yes | Out of scope (pad job) |
| SDK into other apps | Yes | Later |
| White-label portals | Yes | Later |

---

## 10. Fees

| Surface | Fee | Notes |
|---|---|---|
| Hard lock / vest (vault) | **$10 USDC** flat | Per destination on split locks. Paid at creation |
| Network gas | USDC | Same asset as the fee. Native view 18 dp; ERC-20 USDC 6 dp at `0x3600…0000` |
| Streams | Creation gas only today | Do not hide a second token |
| Airdrop / escrow / stake | TBD when UI opens | Never take a cut of locked principal |

Fee goes to treasury `0x257666FaAd2A70180A5608711fBbe2A5B5BFE6C5` on testnet. Never minted out of vault balance.

---

## 11. Architecture

```
Wallet (Arc, USDC gas)
    → approve ERC-20 (+ USDC for the $10 fee)
    → ArcFlow.lock() / vest / ArcFlowStream
    → tokens in the contract
    → backend indexes logs into Postgres
    → /lock/{id} reads live RPC + proof card
    → beneficiary claim() after schedule
```

- Frontend: Next.js, wagmi, viem, Sora + IBM Plex Mono
- Testnet RPC `https://rpc.testnet.arc.network` · explorer `https://testnet.arcscan.app`
- Mainnet RPC `https://rpc.arc.network` · explorer `https://arcscan.app` · chain `5042` when `ARCFLOW_MODE=mainnet`
- Native USDC (gas) is 18 decimals. ERC-20 USDC is 6 decimals at `0x3600000000000000000000000000000000000000`. Same asset, two views — never double-count
- Mempool `maxFeePerGas` floor is 20 Gwei. Sub-second finality — no multi-block waits
- Backend: Express + Postgres, API key from the app via `/api/af`. Index only. It does not replace wallet txs

---

## 12. Security

- Lock vault is immutable. Proxied modules stay UUPS until a mainnet freeze
- **Audit before mainnet money.** The product is testnet until the report is public
- Warn users: unaudited. Landing and docs already say this
- Never ask for a signature that is not approve / lock / vest / stream / claim
- Immutable locks cannot be a backdoor for the team

---

## 13. Brand

| | |
|---|---|
| Public name | **arcflows** (lowercase, matches the wordmark) |
| Protocol / Solidity | `ArcFlow*` identifiers in code only |
| Contract labels | locker, stream, airdrop, escrow, staking — always prefixed `arcflows` |
| Tagline | Lock. Vest. Stream. On Arc. |
| Domain | [archflows.finance](https://archflows.finance) |
| X | @arcflow |
| Wordmark | `/logoarcflows-v2.png` — A-mark + “arcflows”, white on transparent |
| Favicon | `/favicon.png` |
| Voice | Direct, CT-literate, proof over screenshots. Not a bank brochure. Not a meme pad |
| Promise we never make | ArcFlows token, emissions, protocol airdrop |

**Name in copy**

- User-facing / tweets / OG / proof cards: **arcflows**
- Lock vault: **arcflows locker**
- Stream: **arcflows stream**
- Airdrop: **arcflows airdrop**
- Escrow: **arcflows escrow**
- Staking: **arcflows staking**
- Code, env, file names: `ArcFlow` is fine
- Never “Arc Flow” as two title-case words on a card
- Never “ArcFlow” as the public product name — that is the Solidity identifier, not the brand

**Voice**

- Short sentences. One claim per line.
- “If it is not on this page, it is not locked.”
- “LP lock is the pad. Wallet lock is ArcFlows.”
- Do not write “soon™”, “revolutionary”, or gold-coin energy.

---

## 14. Palette

Dark-only. Near-black charcoal plus one royal blue. **No gold, no rainbow, no meme-pad gradients on type.**

Sampled from the mark. Source of truth: `web/app/globals.css` (`:root` / `.dark`).

### Core

| Token | Hex / value | Use |
|---|---|---|
| `--void` | `#08090c` | Page wash, sidebar, html bg |
| `--deep` | `#0c0d12` | Default surface / `--background` |
| `--panel` | `#12131a` | Cards, dashboard chrome |
| `--ink` | `#ffffff` | Primary type |
| `--dim` | `#9ca3af` | Secondary type |
| `--brand` | `#0050e0` | Primary button, links, beam |
| `--brand-hover` | `#1a64e8` | Hover |
| `--ion` | `#4d8aff` | Highlights, LIVE pills, “USDC” accent in motion |
| `--glow` / `--beam-dim` | `rgba(0, 80, 224, 0.28)` | Focus rings, selection, bloom |

### Lines and glass

| Token | Value | Use |
|---|---|---|
| `--line` | `rgba(148, 163, 184, 0.1)` | Default border |
| `--line-strong` | `rgba(148, 163, 184, 0.18)` | Inputs |
| `--hairline` | `rgba(255, 255, 255, 0.08)` | Hairline rules |
| `--glass` | `rgba(148, 163, 184, 0.05)` | Quiet fills |
| `--glass-strong` | `rgba(148, 163, 184, 0.1)` | Hover fills |

### Semantic

| Token | Value | Use |
|---|---|---|
| `--destructive` | `#f87171` | Errors only |
| `--chart-1` | `#0050e0` | Brand series |
| `--chart-2` | `#4d8aff` | Secondary series |
| `--chart-3` | `#a5b8ff` | Tertiary |
| `--chart-4` | `#2a2d3a` | Track |
| `--chart-5` | `#1a1c24` | Track dark |

### Marketing motion

On X cards and videos, type is `--ink` on the `content/bahan/bcakgound.png` wash (void at the top, ion-blue at the bottom). Accent words (USDC, Arc.) use `#8bb7ff`. Watermarks are white at ~14–22% opacity. Do not add a second brand color.

### Pairing rules

- Primary button = `--brand` fill, white type
- Ghost / secondary = `--glass` fill, `--ink` type
- Proof numbers = `--ink`, labels = `--dim`, mono for addresses
- One blue per composition. If the dashboard shot is in frame, keep type white and let the UI carry the blue

---

## 15. Design system

Source of truth for product UI: `web/app/globals.css`, shadcn/ui wired to the tokens above, `web/components/ui/*`.

### Type

| Role | Family | Weights | Where |
|---|---|---|---|
| Sans / heading | **Sora** (`--font-sora`) | 400, 600, 700 | Product UI, marketing, motion videos |
| Mono | **IBM Plex Mono** (`--font-plex-mono`) | 400, 500, 600 | Addresses, chain IDs, fees, chips, proof meta |

Body size 15px / 1.55. Headlines letter-space slightly negative (`-0.03em` to `-0.045em` on motion). Never set marketing type in Plex.

### Space and radius

| Token | Value |
|---|---|
| `--radius` | `0.875rem` |
| Scale | sm 0.375 → md 0.5 → lg 0.75 → xl 1 → 2xl 1.25 → 3xl 1.5 → 4xl 2 |
| `--shell` | `min(1440px, calc(100% - 4rem))` |
| `--af-control-h` | `2.25rem` |
| `--blur` | `16px` |

Dashboard uses the shadcn sidebar (`--sidebar: #08090c`). Marketing uses `SpaceBackdrop` over `--void` with one `--bloom` (indigo, not rainbow).

### Components

- **Buttons:** `.btn` primary = brand fill. Keep height to `--af-control-h` in forms
- **Cards:** `--panel`, hairline border, no drop-shadow on product surfaces (motion videos may use a blue drop-shadow on the dashboard plate only)
- **Proof cards:** amount large, meta in Plex, status chip, share preview. OG route at `/lock/[id]/opengraph-image`
- **Forms:** one screen. Preview restates type, unlock UTC, duration, destination, amount, fee before sign
- **Coming soon:** `ComingSoon` card, not a fake disabled form
- **Toasts:** sonner, quiet

### Motion

| Surface | Rule |
|---|---|
| Marketing site | `ScrollReveal` — short fade/translate, no bounce |
| Product | Instant. Arc finality is the motion |
| X stills | 1600×900, 16:9. `content/posts/` |
| X clips | 1920×1080, 30 fps, H.264 + silent AAC. Kinetic Sora type |
| Kinetic type | One motion per scene (wipe, split, pop, flip, tracking, zoom-out, rise, slam). Do not reuse the same ease on two adjacent scenes |
| Extra chrome on clips | LIVE pill, kicker, proof card, chain chip, dashboard plate — **not on every scene** |

### Layout patterns

1. **Statement card** — huge type, void field, one blue word
2. **Hero shot** — headline + dashboard plate (`content/bahan/dsabord.png`)
3. **Proof** — live lock fields, not a screenshot of Discord
4. **Split** — LP lock vs wallet lock
5. **Stat** — “USDC is the gas”
6. **End card** — wordmark, optional watermark, optional dashboard, optional LIVE

### Do not

- Gold, orange, or meme-green accents
- Emoji as UI
- Drop shadows on every card
- Gradients on text (background wash only)
- Fake “mainnet” chrome on a testnet screenshot without covering the network badge
- Protocol-token imagery

---

## 16. Voice and content cadence

Launch week (Arc public mainnet, 16 Sep 2026):

1. Congrats to `@arc` — no product pitch. Clip: `content/intro/arcflows-congrats-arc.mp4`
2. Why we built on Arc (USDC gas)
3. Introducing ArcFlows — `content/intro/arcflows-intro-landscape.mp4`
4. LP lock vs wallet lock — `content/posts/out/01-lp-lock-is-the-pad.png`
5. Public proof
6. One form / product
7. Lock. Vest. Stream.

One post per day beats seven in one morning. Always fill alt text. Do not claim an audit or a token.

Renderer: `content/posts` (`npm run render`) and `content/intro` (`npm run render:landscape`, `render:congrats`, `render:mainnet`).

---

## 17. Roadmap

Do not start the next phase until the previous exit is hit.

### Now — Testnet habit

Ship: lock, vest, stream, proof, dashboard, docs, litepaper, brand kit.

**Exit:** 50+ real locks **or** 3 pads/CT accounts regularly linking ArcFlows proofs. Then freeze a mainnet vault (immutable, same as testnet).

### Next — Open the remaining modules

- Airdrop claim UI on the live distributor
- Escrow UI
- Staking UI
- `/token/{ca}` — every lock for that token
- Unlock calendar

**Exit:** Teams use ArcFlows for allocations, not only meme dev-buy.

### Later — Platform

- `@arcflow/sdk`
- Pad create → optional lock in the same flow
- White-label
- Arc House / docs listing

**Exit:** Default vesting rail mentioned next to Arc pads.

---

## 18. Go-to-market

**This window**  
- Tweet the Arc launch congratulations first  
- Then the LP vs wallet distinction  
- Lock a real token, share the proof URL, not a Discord screenshot  
- Reply under CA tweets that claim “dev locked” with “link the ArcFlows page”

**Not GTM**  
- Paid KOLs before mainnet vault + audit  
- Launching an ArcFlows meme as the company  
- Announcing mainnet before `contract-addres.md` has the address

---

## 19. Metrics

| Metric | Why |
|---|---|
| Locks created | Leading |
| Unique tokens with ≥1 lock | Quality |
| Proof page views / lock | Did CT actually open it? |
| Claim rate after unlock | Product works |
| TVL | Vanity until teams vest — ignore as a success metric |

**Success:** people paste an ArcFlows URL under a CA.  
**Not success:** TVL, our own token, beating a launchpad.

---

## 20. Risks

| Risk | Mitigation |
|---|---|
| Sablier deploys to Arc | Win on pad UX + proof culture, not bytecode |
| Pads add wallet lock themselves | Integrate as their locker (SDK), do not war |
| Nobody locks (dev wants to dump) | Product is optional; GTM is social proof |
| Users confuse LP lock vs wallet lock | Copy on every screen and in the first week of posts |
| Tolly-style 100% in LP | Empty state: “lock your dev buy” |
| Fake ArcFlows sites | Canonical domain only; no airdrop checkers |
| Saying mainnet too early | Addresses live only in `contract-addres.md` |

---

## 21. Legal / positioning

- Software. Not a custodian beyond the smart contract. Not investment advice
- Locks are not a guarantee the token is safe (honeypot, mint, tax still exist)
- No promise of an ArcFlows token or airdrop

---

## 22. Open questions

1. First pad partner: Tolly vs Warp vs Archemist?
2. Mainnet vault: freeze the same immutable bytecode, no proxy?
3. Open airdrop / escrow / stake UI before or after audit?
4. Do we show a “not locked” badge if someone pastes a CA with zero ArcFlows positions? (easy viral, easy to get hated)

---

## 23. Checklist

- [x] Spec this document
- [x] `ArcFlow.sol` lock + vest + claim, immutable vault
- [x] `ArcFlowStream`, distributor, escrow, staking (testnet)
- [x] Web: marketing, dashboard, proof, docs, litepaper
- [x] Backend index + `/api/af`
- [x] Deploy Arc Testnet (`contract-addres.md`)
- [x] `$10 USDC` lock fee + treasury
- [x] Brand: Sora, royal blue palette, wordmark, X kit
- [x] Motion/intro clips + one-week X cards
- [ ] External audit
- [ ] Mainnet vault address frozen
- [ ] First real CA + tweeted proof on mainnet
- [ ] Open airdrop / escrow / stake UI
