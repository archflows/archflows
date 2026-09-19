# Once sealed, it stays sealed.

**Subtitle**  
Tokens leave the wallet the moment you sign. They sit in an immutable vault until the clock allows a claim. Holders don’t take a screenshot. They open the proof.

**Cover image (16:9)**  
`content/articles/once-sealed/out/cover.png`

---

Crypto still treats “tokens are locked” as a social claim. Teams post a Discord screenshot. A spreadsheet stands in for a contract. A tweet names a ticker that three other contracts also use. Holders are asked to trust a caption.

That is not a lock. That is a story about a lock.

Arc is live. Pads are shipping. Duplicate tickers are already a feature of the timeline, which means the contract address is the only identifier that matters. And almost every CA that trends arrives with the same sentence:

“Dev locked. Trust me.”

Trust is the wrong primitive. The right one is a vault that already holds the tokens, a clock nobody can move, and a page anyone can open without connecting a wallet.

That is ArcFlows. Launchpads create supply. ArcFlows decides when that supply can move.

## A lock is a withdrawal, not a caption

If the tokens are still sitting in the deployer wallet, they are not locked. They are available. A promise to “not sell until Q3” can be broken in one signature. A PNG of a dashboard is not state. A Google Sheet is not a schedule.

A real lock does one irreversible thing at creation: it pulls the ERC-20 out of the creator wallet and into a vault. After that transaction confirms, the bag is no longer the creator’s to dump. Only the named beneficiary can claim, and only when the clock allows.

ArcFlows writes that as a position: token, beneficiary, credited amount, start, cliff, end. Credited amount is what the vault actually received. The record does not get a cancel button, a shorten function, or an admin redirect.

## Two locks people keep mixing up

Liquidity lock and wallet lock are two different promises. Markets still mash them into one word.

**Insert image:** `out/two-promises.png`

An LP lock stops a pool from being pulled. That belongs to the launchpad. It says nothing about the leftover allocation or the dev buy still sitting in a wallet. A token can have the first and still get dumped on you.

Wallet lock is the other job. Tokens leave the wallet. They sit under an immutable schedule. Every position publishes a proof URL. If a pad sent 100% of supply into LP, lock the leftover — the bag that can still hit the market — not the pool the pad already sealed.

## Once it is written, it cannot move

A position that the creator can unwind is not proof of anything. It is a pause button with better branding.

**Insert image:** `out/no-cancel.png`

ArcFlows does not offer that path on vault principal. There is no admin cancel. No early exit. No “just this once” for the team that changed its mind. Parameters that change later apply only to future creates. Existing positions stay as written.

Two shapes cover the jobs that matter on day one.

- **Hard lock.** Nothing is claimable until the unlock timestamp. Then the remaining amount can be claimed in full. This is the anti-dump primitive: a public, dated commitment over a specific balance.
- **Linear vest.** Zero until the cliff, then release every second until end. Team, investors, advisors. Repeat claims are allowed. A vest that would already be liquid at confirm is rejected, so a proof page cannot advertise a lock while most of the bag is already spendable.

A lock that is already over is not proof of anything. The contract refuses it.

## Proof is a URL, not a screenshot

Duplicate tickers make a tweet an unreliable identifier. A screenshot of a dashboard is not live state. If holders cannot check amount, beneficiary, and unlock time without asking the team, the lock exists only for the creator.

**Insert image:** `out/proof.png`

Every ArcFlows position gets a public page. Amount, token, beneficiary, countdown, claimed, claimable — read from the contract. Share the URL and the card unfurls the same fields. The operational rule for the market is simple:

If it is not on that page, it is not locked.

An explorer lists activity by lock id, wallet, token, and transaction, so a holder who was never sent the link can still search.

## Read it before you sign

After you sign, the schedule cannot move. So the preview has to be boringly complete.

**Insert image:** `out/before-you-sign.png`

Pick the token from the connected wallet. Set the amount. Choose the date. Choose who receives the unlock: yourself, another address, or a split. Approve and lock in the same flow. The last dollars of USDC are left for the protocol fee and gas, so MAX does not drain the balance you still need to sign.

The fee is USDC, charged at creation. Ten dollars for a lock. Fifteen dollars flat for a split. It never enters the locked balance and cannot be claimed out of it. Referral, when it applies, is a cut of that fee — not of the vault.

## Why this belongs on Arc

On Arc, gas is USDC. There is no second token to source before the one transaction that matters. Native gas and the USDC ERC-20 are the same asset with two decimal views. Applications should show a single USDC figure. ArcFlows charges the fee in the ERC-20 view. Gas is paid in the native view. Same dollars.

Finality is sub-second. The preview you signed is the position that appears. A lock can be posted next to a contract address in the same beat as a create, not after a multi-block wait. Predictable dollar fees make proof a habit instead of a trade against a volatile gas token.

## The rest of the surface

Locks and vesting are the core. Adjacent modules reuse the same rule: they must not create an admin path over vault principal that already exists.

**Insert image:** `out/modules.png`

Streams pay continuously. Airdrops, escrow, and staking extend the same dashboard without weakening the rule that existing vault principal cannot be moved by an admin.

There is no ArcFlows coin. No emission. No promised airdrop of a protocol token. Users pay USDC. That is the commercial surface.

## What this is not

- Not a launchpad, AMM, or chart.
- Not an LP lock. That is the pad.
- Not a custodian beyond the smart contract.
- Not a guarantee that a token is safe. A lock covers the deposited balance. It does not cap total supply, un-honeypot a token, or freeze a malicious mint.

Verify the canonical deployment you are asked to approve. Treat unaudited bytecode with caution. A public proof page is evidence of a schedule, not of a project’s quality.

---

Markets discount claims they cannot check. ArcFlows makes the check cheap: a URL, a vault, a clock. Arc makes the act of writing that vault cheap and final.

Once sealed, it stays sealed. Stop posting screenshots. Start posting proof.

arcflows.finance
