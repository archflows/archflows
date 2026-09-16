# ArcFlow — Deployed Contract Addresses

**Mainnet is live** (16 Sep 2026) — chain ID `5042`, deployer/owner/treasury `0x41DF1A903afddED647246e1FC6Af07D2338AB352`. See [Mainnet](#mainnet).

**Network (testnet notes below):** Arc Testnet · chain ID `5042002`
**RPC:** `https://rpc.testnet.arc.network`
**Explorer:** https://testnet.arcscan.app
**Deployer / owner:** `0x63B2614f9AE9eAe20483aD24718B419891A2657D`
**Deploy script:** `contracts/script/Deploy.s.sol`
**Deployed at block:** 62053385 – 62053417 (original suite); **ArcFlow v2 lock** at block `62092286`

Gas on Arc is paid in USDC. Fund the deployer from https://faucet.circle.com before broadcasting.

## Addresses to use

These are the addresses the frontend reads. Proxy addresses stay stable across upgrades.

| Contract | Label | Type | Address | Frontend env var |
|---|---|---|---|---|
| `ArcFlow` / `arcflows` | arcflows locker | Testnet: immutable. New deploys: ERC1967 / UUPS proxy | `0xbfbc6d4889b21ABFAeDc145aef3760529E3329b6` | `NEXT_PUBLIC_ARCFLOW_ADDRESS` |
| `ArcFlowStream` | arcflows stream | ERC1967 / UUPS proxy | `0x15f148de4c29C4af03d7d77CC75418669521Adb0` | `NEXT_PUBLIC_ARCFLOW_STREAM_ADDRESS` |
| `ArcFlowDistributor` | arcflows airdrop | ERC1967 / UUPS proxy | `0xd826aC6cCA47Bb7f4C66DbFDB4a76131De0450c8` | `NEXT_PUBLIC_ARCFLOW_DISTRIBUTOR_ADDRESS` |
| `ArcFlowEscrow` | arcflows escrow | ERC1967 / UUPS proxy | `0x528b3E0e78CbD1a4f9aFA011aE374ba12996B2C2` | `NEXT_PUBLIC_ARCFLOW_ESCROW_ADDRESS` |
| `ArcFlowStaking` | arcflows staking | ERC1967 / UUPS proxy | `0x2627e3f07574F47b2B5bc3EfD774576357658063` | `NEXT_PUBLIC_ARCFLOW_STAKING_ADDRESS` |

Live testnet locker is still the raw deploy. New deploys (mainnet) use a UUPS proxy so the owner can replace the implementation without moving the address.

**Current lock vault (15 Sep 2026)** — fee $10 USDC, anti-backdate, manual duration. Treasury = `0x257666FaAd2A70180A5608711fBbe2A5B5BFE6C5`.

| | |
|---|---|
| Address | [`0xbfbc6d4889b21ABFAeDc145aef3760529E3329b6`](https://testnet.arcscan.app/address/0xbfbc6d4889b21ABFAeDc145aef3760529E3329b6) |
| `LOCK_FEE` | 10 USDC (6 decimals) |
| `MIN_DURATION` | 60 seconds |
| `usdc` | `0x3600000000000000000000000000000000000000` |
| `treasury` | `0x257666FaAd2A70180A5608711fBbe2A5B5BFE6C5` |

Previous lock vault: `0xeAA89395055b4A044645067E38cDd49c37C5538F` (treasury was deployer). Leave it; old positions stay there.

Previous lock (no fee): `0x003DE5DF8609E37b89EC91bF1cFDD65096cA98ee` — leave it; old positions stay there.

## Implementations behind the proxies

Never point the frontend at these. They are the current logic contracts, verified against each proxy's ERC1967 implementation slot.

| Proxy | Current implementation |
|---|---|
| `ArcFlowStream` | `0x0b03EE094fFc1f5d05F02Cd32b8e7dfD489B07e3` |
| `ArcFlowDistributor` | `0x4C0A2292DABeBfF959c3F3F7A7d7942E7Ff292b1` (upgraded 15 Sep 2026) |
| `ArcFlowEscrow` | `0xA2e774925C9516E182fF4626c31d4957607Af52c` |
| `ArcFlowStaking` | `0xB620276470dE35cC83484fAf2432aB887f4A87bE` (upgraded 15 Sep 2026) |

All four proxies are owned by the deployer address and upgradeable via `contracts/script/Upgrade.s.sol`. UUPS stays on until Arc public mainnet exists.

**Airdrop / distributor upgrade (15 Sep 2026)** — merkle claim, claimTo, cancel-before-start, topUp. Proxy address unchanged.

| | |
|---|---|
| Proxy | [`0xd826aC6cCA47Bb7f4C66DbFDB4a76131De0450c8`](https://testnet.arcscan.app/address/0xd826aC6cCA47Bb7f4C66DbFDB4a76131De0450c8) |
| Implementation | [`0x4C0A2292DABeBfF959c3F3F7A7d7942E7Ff292b1`](https://testnet.arcscan.app/address/0x4C0A2292DABeBfF959c3F3F7A7d7942E7Ff292b1) |
| Tx impl | [`0x7ae82c67d3ddd55df97fc09d7ffd87f2a09a8409e30348d44901198527dd9bf2`](https://testnet.arcscan.app/tx/0x7ae82c67d3ddd55df97fc09d7ffd87f2a09a8409e30348d44901198527dd9bf2) |
| Tx upgrade | [`0x690ebf1987c28f6d7f951e52e38a7d210b56a238b14a7b7e84ad4ce4521fe0df`](https://testnet.arcscan.app/tx/0x690ebf1987c28f6d7f951e52e38a7d210b56a238b14a7b7e84ad4ce4521fe0df) |
| Block | `62108675` |
| Previous impl | `0x4584A7686a859Df934D7568559d3E10e41243B70` |

**Staking upgrade (15 Sep 2026)** — lot-based lock, recover, pause, 2-step ownership. Proxy address unchanged.

**Staking upgrade (15 Sep 2026)** — lot-based lock, recover, pause, 2-step ownership. Proxy address unchanged.

| | |
|---|---|
| Proxy | [`0x2627e3f07574F47b2B5bc3EfD774576357658063`](https://testnet.arcscan.app/address/0x2627e3f07574F47b2B5bc3EfD774576357658063) |
| Implementation | [`0xB620276470dE35cC83484fAf2432aB887f4A87bE`](https://testnet.arcscan.app/address/0xB620276470dE35cC83484fAf2432aB887f4A87bE) |
| Tx impl | [`0xc3495f291d8d5485ce47206b01845dd871b42fede32e652d69462b0cdda3fcf4`](https://testnet.arcscan.app/tx/0xc3495f291d8d5485ce47206b01845dd871b42fede32e652d69462b0cdda3fcf4) |
| Tx upgrade | [`0xa7bce1f996c821b2c83961e1a568052a1c60b593486828606face5db77562747`](https://testnet.arcscan.app/tx/0xa7bce1f996c821b2c83961e1a568052a1c60b593486828606face5db77562747) |
| Block | `62105466` |
| Previous impl | `0x233645B1a45F5A018C48e914AB476C0aCaCA50A0` |

## Deploy transactions

| # | Nonce | Contract | Tx hash | Block |
|---|---|---|---|---|
| 1 | 0 | `ArcFlow` | `0xca8b2608f540fd328ea7024858ff73c98eb4c2284ab1cc7ca439c9e968b957f3` | 62053385 |
| 2 | 1 | `ArcFlowStream` impl | `0xd28017ced868ec7ced1c659ba015ee400f633bfaf9658127752a0c896ca35b7d` | 62053390 |
| 3 | 2 | `ArcFlowStream` proxy | `0x5d79df5e95c7feb61b2f71a33642a76beea3aa48d3c638a42af4a5e004a4120c` | 62053395 |
| 4 | 3 | `ArcFlowDistributor` impl | `0xa525af37ffedc2549a5cb186382b62b11ea7047531c5f9d9aabde586b74382dd` | 62053399 |
| 5 | 4 | `ArcFlowDistributor` proxy | `0x7ec96b395947b17ff46fdb0d4fd4ff763e57f06d4f8ef18cd93cc786d121ef14` | 62053403 |
| 6 | 5 | `ArcFlowEscrow` impl | `0x0086dd48fd814671eb1d7fcb786a0e92c660293a2ea35d8732e47fef88fb7ab0` | 62053406 |
| 7 | 6 | `ArcFlowEscrow` proxy | `0x1d51d2af3235f254a0072bc57700472ca4b7034d2eb91309beadd970aae6aeb3` | 62053408 |
| 8 | 7 | `ArcFlowStaking` impl | `0x73aa2914a483c88c7741ff17f645abb4565eaaf64f008e1b254020fc34f7f362` | 62053413 |
| 9 | 8 | `ArcFlowStaking` proxy | `0x64c9c171ab00bdc3471abe3ef786743bbdd5b37a45351367dee148610496ad56` | 62053417 |

Full receipts: `contracts/broadcast/Deploy.s.sol/5042002/run-latest.json`.

## Reference tokens on Arc

| Asset | Address | Notes |
|---|---|---|
| USDC (ERC-20 view) | `0x3600000000000000000000000000000000000000` | 6 decimals. Same asset as native gas, which is shown with 18 decimals — never double-count. |
| ArcFlow Mock (`AFMOCK`) | [`0x36FD4DFAD3fee0948C44276584448fa371A54d4b`](https://testnet.arcscan.app/address/0x36FD4DFAD3fee0948C44276584448fa371A54d4b) | 18 decimals. Public `mint` (max 1M per call). Deployed 15 Sep 2026 for lock / vest / stake / airdrop demos. |

**Mock token deploy (15 Sep 2026)**

| | |
|---|---|
| Address | [`0x36FD4DFAD3fee0948C44276584448fa371A54d4b`](https://testnet.arcscan.app/address/0x36FD4DFAD3fee0948C44276584448fa371A54d4b) |
| Tx deploy | [`0xe91b8c63e47760152f2326b4971bf6c7e5e19899171e319fcd9c1c7712720898`](https://testnet.arcscan.app/tx/0xe91b8c63e47760152f2326b4971bf6c7e5e19899171e319fcd9c1c7712720898) |
| Tx seed mint | [`0x27e9bea64cfa856f74021c131498dda6958ed9a67e6cd76fcf957134bd662ab1`](https://testnet.arcscan.app/tx/0x27e9bea64cfa856f74021c131498dda6958ed9a67e6cd76fcf957134bd662ab1) |
| Block | `62111049` |
| Script | `contracts/script/DeployMockToken.s.sol` |
| Name / symbol | `ArcFlow Mock` / `AFMOCK` |
| Decimals | 18 |
| Seeded to deployer | 1,000,000 AFMOCK |

## Mainnet

**Network:** Arc · chain ID `5042`
**RPC:** `https://rpc.mainnet.arc.io`
**Explorer:** https://explorer.arc.io
**Deployer / owner / treasury:** `0x41DF1A903afddED647246e1FC6Af07D2338AB352`
**Identifier:** `arcflows`
**Deploy script:** `contracts/script/Deploy.s.sol`
**Deployed at block:** `21127763` – `21127764`

All five modules are ERC1967 / UUPS proxies. Point the frontend at the proxy addresses. Owner can upgrade implementations later without moving these addresses.

**Verified** on Sourcify (chain `5042`, `exact_match`) — implementations + proxies. Locker implementation name is `arcflows`. Official explorer `explorer.arc.io` is still Cloudflare-gated, so the Contract tab there may lag until that explorer is public.

| Contract | Label | Type | Address | Frontend env var |
|---|---|---|---|---|
| `arcflows` | arcflows locker | ERC1967 / UUPS proxy | `0xCD1bEeE5856Cd0c57931258d9621FeB2052B5481` | `ARCFLOW_ADDRESS` |
| `ArcFlowStream` | arcflows stream | ERC1967 / UUPS proxy | `0x4c6AaE1aDE8ec4f7b2E7f76135b203Fc0A500516` | `ARCFLOW_STREAM_ADDRESS` |
| `ArcFlowDistributor` | arcflows airdrop | ERC1967 / UUPS proxy | `0x01CA506129dd74E5e2302eaD2A9ae75Ef80E0047` | `ARCFLOW_DISTRIBUTOR_ADDRESS` |
| `ArcFlowEscrow` | arcflows escrow | ERC1967 / UUPS proxy | `0x814ea63b4B01e6d36617FDdDc9B5B05ca17c544F` | `ARCFLOW_ESCROW_ADDRESS` |
| `ArcFlowStaking` | arcflows staking | ERC1967 / UUPS proxy | `0x290D0ED8823E5E18B19113C0Af5b8F84580D58F5` | `ARCFLOW_STAKING_ADDRESS` |

| Proxy | Implementation |
|---|---|
| locker | `0x77CFCa1c13BdB2e0c2d6e7d35aACC81735aA58d9` |
| stream | `0xbba0dCAAF15488f3d3f912e4e54a792f93F4082a` |
| airdrop | `0x3479604612233beD56c7713cF4275F119032aC6B` |
| escrow | `0x92d2575B18cC7Bc54F45F15e56F652732f1cC6D3` |
| staking | `0x333FCd911b76285E349D3806C5bFCE2877D2d4aF` |

| # | Nonce | Contract | Tx hash | Block |
|---|---|---|---|---|
| 1 | 0 | `arcflows` impl | `0x3ee1ac4a6a1d191c1d7cdeef0a687114eb0d42ba5f0398a405ccfec626f4f574` | 21127763 |
| 2 | 1 | locker proxy | `0x852f2f7da60fbb4b9a7d1787e0cd69bdb5a25f68013d811460966f0696a27883` | 21127763 |
| 3 | 2 | `ArcFlowStream` impl | `0x6034847913e06b96c100e79876b7c71b2acb4d95fb2e417a1c055fbbf33ffc9c` | 21127763 |
| 4 | 3 | stream proxy | `0x0b2a0f923e170e30ae06e770df255646ebe7e01e3812e25f04576f86d989376b` | 21127763 |
| 5 | 4 | `ArcFlowDistributor` impl | `0x12b83c0df3850e0bd834df9d25d5a155deb0b63ae604c1946e64a11d95392376` | 21127764 |
| 6 | 5 | airdrop proxy | `0x87e1fd5fb4a183d5ce9fdca0b1712c29b5cf29d298f598467846b25b929d910e` | 21127764 |
| 7 | 6 | `ArcFlowEscrow` impl | `0xb645cf165329dcce83c82697dbed6764bba3d1374f12c5ca123164fe7e126d9a` | 21127764 |
| 8 | 7 | escrow proxy | `0xd7d64ad666cd0174ce59dd8f7b012c2e4bf41425d9c7d96cd683f6c65925107e` | 21127764 |
| 9 | 8 | `ArcFlowStaking` impl | `0x6ba9038e19c6c7876e2dc6c3f4c594ca7f9b012bf75625d17c74578e2e2b2de4` | 21127764 |
| 10 | 9 | staking proxy | `0x0b8d1d9a061d6ca169316c855582a983943638cbda116e8ef1b606c0cdc6b2b5` | 21127764 |

Full receipts: `contracts/broadcast/Deploy.s.sol/5042/run-latest.json`.
