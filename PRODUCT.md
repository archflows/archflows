# ArcFlow — Product Document

**Lock. Vest. Stream. On Arc.**

Status: living spec  
Audience: founders, builders, future auditors, pad partners  
Stack today: `contracts/src/ArcFlow.sol` + Next.js app in `web/`

---

## 1. One-liner

Launchpads create the token. ArcFlow decides **when** those tokens can be sold.

After a create on Tolly, Warp, Arcpad, or any pad, the developer locks leftover allocation or the **dev buy**. The lock is on-chain, immutable, and has a public proof URL.

## 2. Positioning

| | |
|---|---|
| Category | Token distribution (vesting / lock / later: stream, airdrop, stake) |
| Chain | Arc (USDC gas, sub-second finality) |
| Analogy | [Streamflow](https://streamflow.finance/) for Solana, [Sablier](https://docs.sablier.com/) for EVM — but Arc-native and pad-first |
| Enemy | Screenshot “team locked”, spreadsheet vesting, unlocked dev wallets |
| Not competing with | Launchpads, DEX terminals, bridges |

**LP lock ≠ ArcFlow.**  
LP lock = pool cannot be pulled (pad job).  
ArcFlow = tokens in a **wallet** cannot be sold until the schedule says so.

---

## 3. Problem

1. Arc day-1 is crowded with pads. Many lock LP. **Dev wallets stay liquid.**
2. Duplicate tickers: CA is the only ID. A tweet is not proof.
3. Manual transfers do not scale for team, investors, airdrops, payroll.
4. Streamflow is not on Arc. Sablier is not on Arc. The slot is empty.
5. Holders have no single page that lists *all* locks for a token CA.

## 4. Jobs to be done

| Job | User | Moment |
|---|---|---|
| Prove I will not dump | Deployer | Seconds after pad create |
| Verify unlock date | Holder / CT | Before buying |
| Vest team + investors | Real project | After raise / after meme survives |
| Pay people over time | Agency / DAO | Later, USDC streams |
| Drop tokens without instant dump | Community | Airdrop campaigns |

## 5. Personas

**P1 — Pad deployer (V1 only user that matters)**  
Just launched on Tolly/Warp. Has tokens from a dev buy or leftover mint. Needs a link to paste next to the CA. Will not read docs. Two clicks max.

**P2 — Holder / degen**  
Sees CA on X. Wants “dev locked until when?” Opens proof page. Does not connect a wallet.

**P3 — Team / investor (Phase 1)**  
Needs cliff + linear, multiple wallets, CSV batch, a page per person.

**P4 — Operator (Phase 2)**  
Pays USDC salary or vendor invoices on a schedule. Cares that gas is already dollars.

---

## 6. V1 scope

### In

- Hard lock: nothing until `end`, then claim all
- Linear vest: unlocks per second from `start` to `end`; claimable only after `cliff`
- Beneficiary (default: locker wallet)
- Public proof: `/lock/{id}`
- My locks: `/me`
- ERC-20 `approve` + `lock`
- Arc Testnet first (chain ID `5042002`), then mainnet
- Gas: USDC, `maxFeePerGas` ≥ 20 gwei

### Out (do not build in V1)

- Launchpad / swap / chart / sniper
- Cancel lock (anti-devsell must be immutable)
- Protocol fee (add when people already lock)
- Airdrop, staking, payroll, LP lock, price-based lock
- Mobile app
- Our own token

### Default UX

Hard lock, 90 days, beneficiary = connected wallet.

If the pad sent **100% supply to LP** (Tolly-style), the user locks **dev-buy tokens**, not LP.

---

## 7. User stories (V1)

1. As a deployer, I paste my new CA, amount, and duration, so the bag cannot hit the market.
2. As a deployer, I get a URL I can tweet with the CA.
3. As a holder, I open that URL without a wallet and see amount, beneficiary, unlock time.
4. As the beneficiary, I claim when the schedule allows.
5. As a deployer, I see all locks I created.

---

## 8. Screens (V1)

| Route | Purpose |
|---|---|
| `/` | Connect, paste CA, amount, duration, hard lock vs linear, submit |
| `/lock/[id]` | Proof + progress + claim |
| `/me` | List of created locks |

Copy on `/`: *Lock the dev bag before you tweet the CA.*

Proof page rule: **if it is not on this page, it is not locked.**

---

## 9. Contract rules (V1)

Source: `contracts/src/ArcFlow.sol`

| Rule | Why |
|---|---|
| Immutable after `lock` | Trust. No “I unlocked early” |
| `start ≤ cliff ≤ end` | Valid schedule |
| Hard lock = `cliff == end` | Nothing until T |
| Tokens pulled in on lock | Cannot stay in the dev wallet |
| Only `beneficiary` can `claim` | Proof of who receives |
| No admin rug on positions | If an owner is added later, it must not touch locked balances |
| `uint128` amounts | Fits pad supplies; cheaper storage |

### Later flags (Phase 1, default OFF)

- `cancelableBySender`
- `transferableByRecipient` (stream as NFT, Sablier-style)
- Protocol fee bps

Admin, if any, may only change **future** fee and treasury. Never existing positions.

---

## 10. Feature catalog vs Streamflow

Streamflow today: vesting, token locks, airdrops, staking, payouts, recurring transfers, dashboards, escrow, SDK, checkers, LP lock, price-based lock.

| Module | Streamflow | ArcFlow when |
|---|---|---|
| Wallet token lock | Yes | **V1** |
| Linear + cliff vest | Yes | **V1** (linear + hard lock) |
| Shareable dashboard | Yes | **V1** per lock; Phase 1 per CA |
| Batch vest / CSV | Yes | Phase 1 |
| Tranche / monthly | Yes | Phase 1 |
| LP lock | Yes | Phase 1 (only pads that do not lock LP) |
| Price-based lock | Yes | Phase 1 late |
| Airdrop + claim | Yes | Phase 1 |
| Sybil / eligibility checker | Yes | Phase 1 |
| USDC / token streaming payroll | Yes (Solana) | **Phase 2 — Arc advantage** |
| Recurring payments | Yes | Phase 2 |
| Escrow / milestones | Yes | Phase 2 |
| Staking-as-a-service | Yes | Phase 3 |
| White-label portals | Yes | Phase 3 |
| SDK into other apps | Yes | Phase 3 (pad create + lock in one tx) |
| Dust cleaner / mint helper | Yes | Phase 3, low priority |

---

## 11. Roadmap and exit criteria

Do not start the next phase until the previous exit is hit.

### Phase 0 — V1 (now)

Ship: lock, vest, proof, my locks, deploy, audit.

**Exit:** 50+ real locks on mainnet **or** 3 pads/CT accounts regularly linking ArcFlow proofs.

### Phase 1 — Token operations

- `/token/{ca}` — every lock for that token
- Unlock calendar + Telegram alert
- Batch vest
- Optional cancel/transfer flags (not on anti-dump locks)
- Airdrop claim (merkle)
- LP lock only if a major pad still has unlocked LP

**Exit:** Teams use ArcFlow for *allocations*, not only meme dev-buy. One pad or indexer (GMGN/Ave) shows “ArcFlow locked until”.

### Phase 2 — USDC movement

Gas is USDC. This is the Streamflow gap on Solana (they stream SPL; we stream dollars natively).

- Per-second USDC payroll
- Recurring vendor pay
- Milestone escrow
- Clawback grants

**Exit:** Recurring USDC volume, not one-off meme locks.

### Phase 3 — Platform

- `@arcflow/sdk`
- Pad integration: create → optional lock in same flow
- Staking-as-a-service
- White-label
- Arc House Verified Builder / docs listing

**Exit:** Default vesting rail mentioned next to Arc pads.

### Sequence (do not skip)

1. Proof links become a habit  
2. Per-CA dashboard  
3. Batch vest  
4. Airdrops  
5. USDC streams  
6. Pad SDK  
7. Staking / white-label  

---

## 12. Fees

| Phase | Fee | Notes |
|---|---|---|
| V1 | 0 | Distribution first |
| V1.1 | 0.10–0.25% of locked tokens | Or flat USDC (cleaner for users) |
| Airdrop | Per recipient or % of drop | |
| Streams | % of streamed USDC | |
| Staking | % of rewards | |
| White-label | Monthly USDC | |
| Pad widget | Rev share | |

Never take a fee that lets us steal locked principal. Fee is minted off the top at creation or paid in USDC separately.

---

## 13. Go-to-market

**Week 1 (mainnet window)**  
- Deploy, tweet: “LP lock is the pad. Wallet lock is ArcFlow.”  
- Lock a real token yourself, screenshot the proof.  
- Reply under CA tweets that claim “dev locked” with “link the ArcFlow page.”

**Week 2–4**  
- DM 2–3 pad teams for a “Lock on ArcFlow” link, not a merge into their create tx yet.  
- Telegram: new-lock feed (optional).

**Not GTM**  
- Paid KOLs before product is live.  
- Launching an ArcFlow meme as the company (conflicts with “we are infra”).

---

## 14. Metrics

| Metric | V1 target |
|---|---|
| Locks created | Leading |
| Unique tokens with ≥1 lock | Quality |
| Proof page views / lock | “Did CT actually open it?” |
| Claim rate after unlock | Product works |
| TVL | Vanity until Phase 1 — ignore for V1 success |

**V1 success:** people paste an ArcFlow URL under a CA.  
**Not success:** TVL, our own token, beating Tolly.

---

## 15. Architecture (now)

```
Wallet (Arc, USDC gas)
    → approve ERC-20
    → ArcFlow.lock()
    → tokens in contract
    → /lock/{id} reads positions(id)
    → claim() after schedule
```

- Frontend: Next.js, wagmi, viem, Arc Testnet RPC `https://rpc.testnet.arc.network`
- Native USDC = 18 decimals (gas only). Token locks use each ERC-20’s own decimals. Do not mix with native USDC 6-dec view unless locking USDC itself (then use ERC-20 `0x3600…0000`, 6 decimals).
- No indexer in V1. On-chain arrays `locksByCreator` / `locksByBeneficiary`.
- Phase 1: index `Locked` / `Claimed` for `/token/{ca}` and alerts.

---

## 16. Security

- V1 contract is small; still **audit before mainnet money**.
- No upgradeability on the lock vault in V1 (or: new contract version, old locks stay).
- Warn users: unaudited until the report is public.
- Never ask for a signature that is not a lock/claim/approve.
- Immutable locks cannot be a backdoor for the team.

---

## 17. Risks

| Risk | Mitigation |
|---|---|
| Sablier deploys to Arc | Win on pad UX + proof culture, not bytecode |
| Pads add wallet lock themselves | Integrate as their locker (SDK), do not war |
| Nobody locks (dev wants to dump) | Product is optional; GTM is social proof, not force |
| Users confuse LP lock vs wallet lock | Copy on every screen |
| Tolly-style 100% in LP | Explicit empty-wallet empty state: “lock your dev buy” |
| Fee too early | Keep 0% until habit exists |
| Fake ArcFlow sites | Canonical domain only; no airdrop checkers |

---

## 18. Legal / positioning

- Software. Not a custodian beyond the smart contract. Not investment advice.
- Locks are not a guarantee the token is safe (honeypot, mint, tax still exist).
- No promise of an ArcFlow token or airdrop.

---

## 19. Brand

| | |
|---|---|
| Name | **ArcFlow** |
| Tagline | Lock. Vest. Stream. On Arc. |
| Domain | arcflow.fun (or .fi) |
| X | @arcflow |
| Voice | Direct, CT-literate, not bank-brochure |
| Visual | Dark, proof-first, one gold accent — not a meme pad rainbow |

---

## 20. Open questions

1. Fee in locked tokens vs USDC?
2. First pad partner: Tolly vs Warp vs Archemist?
3. Mainnet address: freeze as canonical, no proxy?
4. Do we show a “not locked” badge if someone pastes a CA with zero ArcFlow positions? (Phase 1, easy viral, easy to get hated)

---

## 21. V1 checklist

- [x] Spec this document
- [x] `ArcFlow.sol` lock + vest + claim
- [x] Web: create, proof, my locks
- [ ] Deploy testnet
- [ ] `NEXT_PUBLIC_ARCFLOW_ADDRESS`
- [ ] Internal test: fake token → lock → proof → claim
- [ ] Audit
- [ ] Mainnet
- [ ] First real CA + tweeted proof
