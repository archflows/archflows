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

Stream / escrow / staking **tidak di-redeploy**. Proxy lama tetap:

| Kontrak | Alamat |
|---|---|
| `ArcFlowStream` | `0x15f148de4c29C4af03d7d77CC75418669521Adb0` |
| `ArcFlowDistributor` | `0xd826aC6cCA47Bb7f4C66DbFDB4a76131De0450c8` |
| `ArcFlowEscrow` | `0x528b3E0e78CbD1a4f9aFA011aE374ba12996B2C2` |
| `ArcFlowStaking` | `0x2627e3f07574F47b2B5bc3EfD774576357658063` |

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

## Staking — implementasi standar (14 Sep 2026)

Kontrak: `contracts/src/ArcFlowStaking.sol`  
Model: Synthetix `rewardPerToken`, permissionless `createPool`, UUPS append-only.  
Proxy live **belum di-upgrade**: `0x2627e3f07574F47b2B5bc3EfD774576357658063`

Bytecode baru sudah lulus tes lokal. **Tidak di-broadcast** ke Arc Testnet sampai diminta. Upgrade proxy lama butuh `Upgrade.s.sol` + owner key.

### Yang sekarang ada

| Fitur | Perilaku |
|---|---|
| Stake / claim / `exit` | Ada |
| `unstake` | Auto-claim (Streamflow `unstakeAndClaim`) |
| `unstakeOnly` | Principal saja — jalan darurat kalau reward token di-denylist |
| Lock | `minLock` max **730 hari**; `unlockAt` overflow-safe |
| Fund | Max durasi **3650 hari** |
| `recoverRewards` | Hanya jika `totalStaked == 0`; sisa = reserves − pending (klaim user tidak diambil) |
| Pause | Per pool (`setPaused`) + protokol (`setProtocolPaused`); unstake tetap jalan |
| Cap / expiry | `setCap`, `setExpiry` (expiry hanya saat pool kosong) |
| `transferPool` | Pindah owner pool |
| `compound` | Hanya jika stake token == reward token; token tidak keluar kontrak |
| Index | `poolsByCreator`, `poolsByStaker` |
| Fee-on-transfer / reentrancy / idle schedule | Tetap |

Restake **masih** memperpanjang lock seluruh posisi — itu pola lock-staking standar, bukan bug yang dihapus.

### Temuan audit → status

| ID | Status |
|---|---|
| S-H1 | **Tetap** — owner UUPS bisa ganti logic dan menguras semua pool. Kunci owner = kunci brankas. |
| S-H2 | **Ditutup** — cap 2 tahun + overflow-safe unlock |
| S-M1 | **Ditutup** — `recoverRewards` (pool baru; `rewardAccounting`) |
| S-M2 | **Dibiarkan + didokumentasikan** — restake extends whole lock |
| S-M3 | **Sebagian** — ada pause; Ownable tetap 1 langkah (2-step akan geser storage proxy lama) |
| S-L1 | **Ditutup** — error `InsufficientStake` |
| S-L2 | **Tetap** — dust integer division (kecil; bisa di-recover setelah pool kosong) |
| S-L3 | **Ditutup** — index creator/staker |
| S-I1 | **Ditutup** — unstake auto-claim |
| S-I2 | **Tetap** — jangan stake token rebase |
| S-I3 | **Ditutup sebagian** — `unstakeOnly` kalau USDC denylist blokir reward |

Pool yang sudah ada di proxy lama punya `rewardAccounting = false`. Setelah upgrade, `recoverRewards` di pool itu **sengaja revert** supaya tidak menyedot reward user yang belum masuk `pendingRewards`.

### Tes

75 tes Foundry project **PASS**, termasuk 19 tes staking + tes denylist `unstakeOnly`.

### Yang sengaja tidak masuk V2

Cooldown (bukan hard lock), multi-reward token, receipt NFT / weight by duration, Ownable2Step / timelock on-chain, emergency unstake di tengah `minLock`.

### Produksi

Belum. S-H1 belum hilang selama kontrak UUPS. Baru aman-ish kalau owner di **multisig + timelock**, atau deploy **immutable** seperti lock. Arc public mainnet belum ada.

