# ArcFlow — Laporan Pengerjaan Token Lock & Vesting

**Tanggal:** 14 September 2026  
**Fokus:** `ArcFlow.sol` (vault lock/vest immutable) + form create lock di web  
**Bukan fokus:** Stream, airdrop, escrow, staking

---

## Ringkasan

Token lock dan linear vesting **sudah live di Arc Testnet**. Satu kontrak `lock()` handle hard lock + linear vest, fee $10 USDC flat, durasi input manual. Tes Foundry lulus. On-chain: `LOCK_FEE`, `MIN_DURATION`, `usdc`, dan `treasury` sudah diverifikasi. **Belum siap mainnet** (jaringan public Arc belum ada; kontrak belum audit).

---

## Deploy terbaru (Arc Testnet)

| Field | Value |
|---|---|
| Network | Arc Testnet · chain ID `5042002` |
| RPC | `https://rpc.testnet.arc.network` |
| Kontrak | `ArcFlow` (immutable, no owner) |
| Alamat | [`0xeAA89395055b4A044645067E38cDd49c37C5538F`](https://testnet.arcscan.app/address/0xeAA89395055b4A044645067E38cDd49c37C5538F) |
| Tx | [`0x4eef43b8558dc5c109dcd5a2e0587aaee14e9da5f91f1186977d3eaa02d6234e`](https://testnet.arcscan.app/tx/0x4eef43b8558dc5c109dcd5a2e0587aaee14e9da5f91f1186977d3eaa02d6234e) |
| Block | `62092286` |
| Script | `contracts/script/DeployLock.s.sol` |
| Deployer / treasury | `0x63B2614f9AE9eAe20483aD24718B419891A2657D` |
| USDC (ERC-20, 6 desimal) | `0x3600000000000000000000000000000000000000` |

Verifikasi `cast call` setelah broadcast:

| Getter | On-chain |
|---|---|
| `LOCK_FEE()` | `10000000` (= $10 USDC, 6 desimal) |
| `MIN_DURATION()` | `60` detik |
| `usdc()` | `0x3600…0000` |
| `treasury()` | deployer di atas |

Frontend sudah diarahkan ke alamat baru: `NEXT_PUBLIC_ARCFLOW_ADDRESS` di `.env` dan `web/.env.local`. **Restart `next dev`** supaya Next.js membaca env baru.

Stream / escrow **tidak di-redeploy**. Staking dan airdrop **proxy yang sama** sudah di-upgrade (15 Sep 2026):

| Kontrak | Alamat |
|---|---|
| `ArcFlowStream` | `0x15f148de4c29C4af03d7d77CC75418669521Adb0` |
| `ArcFlowDistributor` | `0xd826aC6cCA47Bb7f4C66DbFDB4a76131De0450c8` |
| `ArcFlowEscrow` | `0x528b3E0e78CbD1a4f9aFA011aE374ba12996B2C2` |
| `ArcFlowStaking` (proxy) | `0x2627e3f07574F47b2B5bc3EfD774576357658063` |

Lock lama `0x003DE5DF8609E37b89EC91bF1cFDD65096cA98ee` dibiarkan. Posisi yang sudah dibuat di sana tetap di kontrak itu.

---

## Yang sudah dikerjakan

### 1. Review kontrak

Temuan kritis di lock lama:

- `start` bisa di masa lalu → vest terlihat terkunci di halaman proof, padahal hampir semua sudah claimable.
- Durasi terlalu pendek bisa dipakai sebagai “bukti lock” palsu.

Modul Stream / Escrow / Staking **tidak disentuh** di sprint ini.

### 2. Token lock — `contracts/src/ArcFlow.sol`

| Item | Status | Keterangan |
|---|---|---|
| Hard lock | Ada | `cliff == end` — nol sampai tanggal unlock, lalu claim full |
| Linear vest | Ada | Unlock per detik `amount * elapsed / duration`; sebelum cliff = 0; di `end` = full |
| Immutable | Ada | Tidak bisa cancel, shorten, atau pindah beneficiary |
| Claim | Ada | Hanya `beneficiary` |
| Fee-on-transfer | Ada | Posisi dikredit sesuai token yang benar-benar masuk |
| Anti-backdate | Baru | `start` di masa lalu ditolak; `start = 0` / `cliff = 0` = `block.timestamp` |
| Durasi bebas | Baru | Minimum 1 menit |
| Fee $10 USDC | Baru | `LOCK_FEE = 10 * 1e6` (ERC-20 6 desimal, bukan native 18-dec) |
| Treasury | Baru | Immutable di constructor; fee tidak masuk `totalLocked` |

Gas dan fee USDC adalah aset yang sama — jangan dihitung dua kali. Faucet: https://faucet.circle.com. Mempool Arc menolak `maxFeePerGas` di bawah 20 gwei.

### 3. Form create lock — `web/app/app/page.tsx`

- Preset 7d / 30d / 90d dihapus.
- Input manual: hari, jam, menit, atau datetime unlock.
- Mode **Hard lock** vs **Linear vest**.
- Summary fee $10 USDC; `MAX` pada lock USDC menyisakan $10.
- Linear vest mengirim `start = 0`, `cliff = 0`.

### 4. Tes Foundry (linear vest)

6 tes vest, semua **PASS**:

| Tes | Hasil |
|---|---|
| `test_Vest_LinearRelease` | 25% / 50% di 100 hari, claim tengah tidak merusak sisa |
| `test_Vest_CliffHoldsThenReleasesAccrued` | Sebelum cliff 0; di cliff dapat porsi terakumulasi |
| `test_Vest_NeverOverReleases` | Skip 1000 hari tetap max = amount |
| `test_Vest_UiPath_StartCliffZeroPartialThenFinalClaim` | Jalur form + fee ke treasury |
| `test_Vest_CustomDuration_17Days8Hours` | Durasi bebas; tengah 50%, akhir 100% |
| `test_Vest_OnlyBeneficiaryCanClaimMidStream` | Orang lain tidak bisa claim |

---

## Mapping ke Streamflow

| Streamflow | ArcFlow | Perilaku |
|---|---|---|
| Time-based lock | Hard lock | Semua cair di satu tanggal |
| Time-based / linear vesting | Linear vest | Cair bertahap per detik |

Belum ada di vault lock V1: vesting per periode (harian/bulanan), price-based lock. Form vest belum punya input cliff terpisah (kontrak sudah support `start < cliff < end`).

---

## Yang belum

| Item | Status |
|---|---|
| Tes on-chain manual: lock → proof → claim + fee $10 | Siap dicoba di UI setelah restart Next |
| Audit eksternal | Belum |
| Arc Mainnet | Belum ada (docs Circle: Public Mainnet = Upcoming) |
| Stream / escrow / staking production | Jangan diandalkan |

---

## Kesimpulan

Lock + linear vesting **selesai, lulus tes lokal, dan sudah di-deploy ke Arc Testnet** di `0xeAA89395055b4A044645067E38cDd49c37C5538F`. Restart frontend, lalu tes lock/vest + fee $10 dengan wallet. Belum untuk uang produksi / mainnet.

---

## Staking — live di Arc Testnet (15 Sep 2026)

Kontrak: `contracts/src/ArcFlowStaking.sol`  
Model: Synthetix `rewardPerToken`, permissionless `createPool`, UUPS.  
Proxy **sudah di-upgrade** (alamat tidak berubah):

| Field | Value |
|---|---|
| Proxy | [`0x2627e3f07574F47b2B5bc3EfD774576357658063`](https://testnet.arcscan.app/address/0x2627e3f07574F47b2B5bc3EfD774576357658063) |
| Implementation baru | [`0xB620276470dE35cC83484fAf2432aB887f4A87bE`](https://testnet.arcscan.app/address/0xB620276470dE35cC83484fAf2432aB887f4A87bE) |
| Tx deploy impl | [`0xc3495f291d8d5485ce47206b01845dd871b42fede32e652d69462b0cdda3fcf4`](https://testnet.arcscan.app/tx/0xc3495f291d8d5485ce47206b01845dd871b42fede32e652d69462b0cdda3fcf4) |
| Tx `upgradeToAndCall` | [`0xa7bce1f996c821b2c83961e1a568052a1c60b593486828606face5db77562747`](https://testnet.arcscan.app/tx/0xa7bce1f996c821b2c83961e1a568052a1c60b593486828606face5db77562747) |
| Block (upgrade) | `62105466` |
| Script | `contracts/script/Upgrade.s.sol` |
| Owner | `0x63B2614f9AE9eAe20483aD24718B419891A2657D` |

Verifikasi `cast call` setelah broadcast:

| Getter | On-chain |
|---|---|
| `owner()` | deployer di atas |
| `MAX_MIN_LOCK()` | `63072000` (730 hari) |
| `MAX_FUND_DURATION()` | `315360000` (3650 hari) |
| `MAX_LOTS()` | `16` |
| `nextId()` | `0` (belum ada pool) |

Frontend tetap ke proxy yang sama (`NEXT_PUBLIC_ARCFLOW_STAKING_ADDRESS`). UUPS **tetap hidup**. Storage append-only — posisi lama (kalau ada) aman. Kunci owner = kunci brankas — pakai multisig, bukan hot wallet.

### Aturan yang adil ke dua belah pihak

**Staker**
- Restake **tidak** mengunci ulang lot yang sudah terbuka. Setiap deposit = lot sendiri (`minLock` hanya untuk dana baru).
- `exit` menarik semua yang sudah unlock; lot yang masih kunci tetap.
- `unstake` auto-claim; `unstakeOnly` kalau reward token di-denylist.
- Pause hanya menutup setoran baru — tarik dana tetap jalan.

**Owner pool**
- Dana baru tetap kena `minLock` (max 730 hari) — tidak bisa di-dump instan.
- `recoverRewards` setelah pool kosong, tanpa mengambil klaim user.
- Pause, cap, expiry, fund, handoff pool (2 langkah: `transferPool` + `acceptPool`).

**Owner protokol**
- Pause darurat setoran baru.
- Ganti owner 2 langkah (`transferOwnership` + `acceptOwnership`).
- Tidak bisa renounce saat `protocolPaused` (supaya pause tidak terkunci selamanya).

### Temuan audit → status

| ID | Status |
|---|---|
| S-H1 | **Tetap (trust)** — UUPS `onlyOwner`; owner bisa ganti logic. Lindungi dengan 2-step ownership + multisig. |
| S-H2 | **Ditutup** — cap 2 tahun + overflow-safe unlock |
| S-M1 | **Ditutup** — `recoverRewards` (pool baru; `rewardAccounting`) |
| S-M2 | **Ditutup** — lock per-lot, restake tidak relock |
| S-M3 | **Ditutup** — pause + Ownable 2-step (storage append, bukan OZ Ownable2Step) |
| S-L1 | **Ditutup** — `InsufficientStake` |
| S-L2 | **Tetap** — dust integer division (kembali ke owner lewat recover saat pool kosong) |
| S-L3 | **Ditutup** — index creator/staker + `lotAt` / `unlockedOf` |
| S-I1 | **Ditutup** — unstake auto-claim |
| S-I2 | **Tetap** — jangan stake token rebase |
| S-I3 | **Ditutup sebagian** — `unstakeOnly` |
| MAX_LOTS | **Info** — setoran ke-17+ bisa memperpanjang lot unlock paling jauh (staker sendiri) |

### Tes (15 Sep 2026)

**Lokal:** 24 tes `ArcFlowStakingTest` **PASS** (termasuk restake adil, recover, 2-step owner, UUPS, MAX_LOTS).

**Fork proxy live** (`LiveStakingFork.t.sol`, RPC Arc Testnet, tanpa broadcast): 4/4 **PASS**

| Tes | Hasil |
|---|---|
| Implementation slot = `0xB620…A87bE`, cap lock/lots | PASS |
| `createPool` minLock > 730 hari revert | PASS |
| create → fund → stake → skip 1 hari → unstake auto-claim → recover | PASS |
| Non-owner tidak bisa `upgradeToAndCall` | PASS |

Audit kode (security review pada diff): **tidak ada temuan medium / high / critical yang bisa dieksploitasi pihak ketiga.** S-H1 tetap asumsi trust admin.

### Produksi

Belum audit firma eksternal. Arc public mainnet belum ada. Proxy staking testnet sudah memakai logic terbaru. Jangan pakai uang produksi.

---

## Airdrop — live di Arc Testnet (15 Sep 2026)

Kontrak: `contracts/src/ArcFlowDistributor.sol`  
Model: Merkle + claim instan / vest ke stream. UUPS **tetap hidup**.  
Proxy **sudah di-upgrade** (alamat tidak berubah):

| Field | Value |
|---|---|
| Proxy | [`0xd826aC6cCA47Bb7f4C66DbFDB4a76131De0450c8`](https://testnet.arcscan.app/address/0xd826aC6cCA47Bb7f4C66DbFDB4a76131De0450c8) |
| Implementation baru | [`0x4C0A2292DABeBfF959c3F3F7A7d7942E7Ff292b1`](https://testnet.arcscan.app/address/0x4C0A2292DABeBfF959c3F3F7A7d7942E7Ff292b1) |
| Tx deploy impl | [`0x7ae82c67d3ddd55df97fc09d7ffd87f2a09a8409e30348d44901198527dd9bf2`](https://testnet.arcscan.app/tx/0x7ae82c67d3ddd55df97fc09d7ffd87f2a09a8409e30348d44901198527dd9bf2) |
| Tx `upgradeToAndCall` | [`0x690ebf1987c28f6d7f951e52e38a7d210b56a238b14a7b7e84ad4ce4521fe0df`](https://testnet.arcscan.app/tx/0x690ebf1987c28f6d7f951e52e38a7d210b56a238b14a7b7e84ad4ce4521fe0df) |
| Block | `62108675` |
| Script | `contracts/script/Upgrade.s.sol` |
| `stream()` | `0x15f148de4c29C4af03d7d77CC75418669521Adb0` (tidak berubah) |
| `MIN_WINDOW()` | `3600` (1 jam) |
| `MAX_WINDOW()` | `315360000` (3650 hari) |
| `nextId()` | `0` |

### Aturan yang adil

**Penerima**
- Jendela claim tidak bisa di-pause atau di-clawback di tengah jalan.
- Siapa pun bisa bayar gas `claim`; token tetap ke alamat di merkle.
- `claimTo`: hanya pemilik leaf yang boleh alihkan (dompet baru / denylist USDC).
- Vest: stream `cancelable = false`, `transferable = true`.

**Funder**
- `cancel` hanya **sebelum** `claimStart` (set start di masa depan kalau butuh jeda).
- `clawback` hanya setelah `claimEnd`, sisa yang tidak diklaim.
- `topUp` kalau tree kelebihan alokasi dibanding deposit.
- Jendela 1 jam – 3650 hari; vest 1 menit – 3650 hari; start max 365 hari ke depan; start masa lalu ditolak.

**Owner protokol**
- Pause hanya menutup **kampanye baru** / topUp — claim yang sudah jalan tetap hidup.
- Ganti owner 2 langkah. UUPS tetap hidup (trust: kunci owner = brankas).

### Tes (15 Sep 2026)

Upgrade **tidak di-broadcast ulang**: proxy sudah menunjuk impl `0x4C0A…292b1`. Tes di bawah memakai bytecode live itu.

| Suite | Tes | Hasil |
|---|---|---|
| `ArcFlowDistributorTest` | 11 (claim instan, vest, claimTo, cancel, clawback, topUp, pause, window) | PASS |
| `SecurityTest` H-1 | clawback ditolak di tengah jendela; sisa saja yang kembali setelah `claimEnd` | PASS |
| `LiveDistributorForkTest` (fork RPC, tanpa broadcast) | 6 | PASS |

Fork live (`contracts/test/LiveDistributorFork.t.sol`):

| Tes | Hasil |
|---|---|
| Implementation slot = `0x4C0A…292b1`, `MIN_WINDOW` / `MAX_WINDOW` / `stream()` | PASS |
| Jendela < 1 jam revert `InvalidWindow` | PASS |
| create → claim instan → clawback ditolak di tengah jendela → clawback sisa setelah `claimEnd` | PASS |
| `claimTo` ke vest stream live → withdraw 50% di tengah durasi; non-owner leaf ditolak | PASS |
| `cancel` sebelum `claimStart` refund penuh | PASS |
| Non-owner tidak bisa `upgradeToAndCall` | PASS |

### UI Streamflow-parity (15 Sep 2026)

Dashboard sekarang menghubungkan kontrak live:

| Route | Fitur |
|---|---|
| `/dashboard/vesting` | Stream / payroll: create, CSV `createBatch`, list, withdraw, cancel, top-up, transfer |
| `/dashboard/airdrops` | Create dari CSV→merkle + auto proof JSON, claim / claimTo, manage cancel/topUp/clawback |
| `/dashboard/escrow` | Fund deal, release, refund, daftar buyer/seller |
| `/dashboard/staking` | Create pool + stake / unstake / claim reward |

Lock anti-dump tetap di `/dashboard/locks` (`ArcFlow.sol`). Stream payroll pakai `ArcFlowStream` (cancelable). Proxy airdrop testnet sudah logic terbaru; UUPS sengaja tetap hidup sampai Arc public mainnet.

