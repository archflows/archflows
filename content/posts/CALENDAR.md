# ArcFlow — one week on X

Seven daily posts plus two clips. Images are 1600x900 (16:9), which is the safe
ratio for a single-image X post — nothing gets cropped in the timeline.

Everything in `out/` is generated. Edit `posts.json` and re-run `npm run render`
rather than touching the PNGs.

Copy rules baked into these posts: Arc Testnet only, chain `5042002`, gas in
USDC, `$10 USDC` lock fee, contracts not externally audited, no ArcFlow token or
airdrop, and Airdrops / Escrow / Staking marked coming soon.

---

## Day 1 — Positioning

**Image:** `out/01-lp-lock-is-the-pad.png`

> LP lock is the pad.
> Wallet lock is ArcFlow.
>
> Locking the pool means nobody pulls liquidity.
> It says nothing about the bag still sitting in the dev wallet.
>
> Two different promises. Only one of them is ours.
>
> arcflows.finance

**Alt text:** Dark ArcFlow card reading "LP lock is the pad. Wallet lock is ArcFlow." with the word ArcFlow in blue.

**Why it leads the week:** it is the one distinction the whole product rests on. Everything later in the week assumes the reader already got this.

---

## Day 2 — The form

**Image:** `out/02-one-form.png`

> Set the lock on one form.
>
> Pick the token. Drag the amount. Choose the date.
> Approve and lock in the same flow.
>
> No dashboard tour, no six-step wizard. One screen, then it is on-chain.
>
> Arc Testnet, chain 5042002. Gas is the USDC you already hold.

**Alt text:** The ArcFlow dashboard showing the lock form, lock preview and share preview, under the headline "Set the lock on one form."

---

## Day 3 — Public proof

**Image:** `out/03-public-proof.png`

> "Dev locked, trust me" is not proof. A screenshot is not proof.
>
> Every ArcFlow position gets a page: amount, beneficiary, unlock time, contract address. Read straight from the chain.
>
> No wallet needed to open it.
>
> If it is not on that page, it is not locked.

**Alt text:** ArcFlow public proof card showing 22.4848 USDC hard locked, unlock date and contract address.

**Note:** strongest reply-bait of the week. Good one to quote under any CA tweet claiming "dev locked".

---

## Day 4 — The comparison

**Image:** `out/04-lp-vs-wallet.png`

> Two locks people keep mixing up.
>
> LP lock: the pool cannot be pulled. The pad does this.
>
> Wallet lock: the tokens leave the dev wallet and sit under a schedule that cannot move. This is ArcFlow.
>
> A token can have the first and still get dumped on you.

**Alt text:** Side-by-side comparison of LP lock and wallet lock, listing what each one actually guarantees.

---

## Day 5 — Why Arc

**Image:** `out/05-gas-in-usdc.png`

> On Arc, gas is USDC.
>
> No second token to bridge before you can sign. No "insufficient native balance" on the one transaction that matters.
>
> You hold dollars, you pay in dollars, it confirms in under a second.
>
> Arc Testnet, chain 5042002.

**Alt text:** Large "USDC is the gas" statement card with Arc Testnet chain 5042002 and sub-second finality noted below.

---

## Day 6 — Before you sign

**Image:** `out/06-read-it-before-you-sign.png`

> Before you sign anything, ArcFlow shows you the whole lock in plain language.
>
> Type, unlock time, duration, who receives it, the amount, the fee.
>
> Read it, then sign. After that the schedule cannot move, so it is worth ten seconds.

**Alt text:** ArcFlow lock preview panel listing type, unlock date, duration, beneficiary, amount and fee before signing.

---

## Day 7 — The full surface

**Image:** `out/07-lock-vest-stream.png`

> Lock. Vest. Stream. On Arc.
>
> Live now: token locks, linear vesting with a cliff, and streams.
> Coming: airdrops, escrow, staking.
>
> One dashboard for token distribution, with a public proof page for every position.
>
> Testnet. Contracts are not externally audited yet.

**Alt text:** ArcFlow module grid listing token lock, linear vesting and streams as live, with airdrops, escrow and staking marked coming soon.

---

## Clips

Both are 1920x1080, 30fps, H.264 with a silent AAC track so X accepts the
upload. Post them as native video, not as a link.

### `out/clip-lock-vest-stream.mp4` — 9s

Brand beat. Wordmark, then Lock. / Vest. / Stream. / On Arc., then the endcard.
Use it as a pinned post or whenever the account needs a reset.

> Lock. Vest. Stream. On Arc.
>
> Token distribution on the chain where gas is already a dollar.
>
> arcflows.finance

### `out/clip-one-form.mp4` — 11s

Product beat, ends on the lock form. Pairs naturally with the Day 2 post if you
want to run video instead of the static card.

> Set the lock on one form.
>
> Pick the token, drag the amount, choose the date. Approve, sign, done — gas paid in USDC.
>
> Arc Testnet, chain 5042002.

---

## Rendering

```sh
cd content/posts
npm install          # once
npm run render       # all 7 cards -> out/*.png
npm run render:clips # both clips -> out/*.mp4
node render.mjs --only=03          # re-render one card
node render.mjs clips --only=one-form
```

To eyeball a template in a real browser, serve `content/` and open
`posts/card.html?slug=03-public-proof`, or `posts/clip.html?slug=clip-one-form&preview=1`
for the animated version. The `preview` flag starts the playback loop; the
renderer deliberately leaves it off so it can drive each frame itself.

Chrome is located automatically on macOS, Windows and Linux. Override with
`CHROME_PATH=/path/to/chrome` if needed.

## Posting notes

- One post per day beats seven in one morning. The Day 3 proof post is the one worth boosting with replies.
- Always fill in the alt text above; it is also the accessible description X reads out.
- Day 1, 4 and 7 work standalone. Day 2, 5 and 6 are better as replies in a thread off Day 1 if you would rather ship the week as a single thread.
- Do not add claims about audits, mainnet, or a token. The cards deliberately avoid all three.
