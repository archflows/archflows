# ArcFlow — Deployed Contract Addresses

**Network:** Arc Testnet · chain ID `5042002`
**RPC:** `https://rpc.testnet.arc.network`
**Explorer:** https://testnet.arcscan.app
**Deployer / owner:** `0x63B2614f9AE9eAe20483aD24718B419891A2657D`
**Deploy script:** `contracts/script/Deploy.s.sol`
**Deployed at block:** 62053385 – 62053417

Gas on Arc is paid in USDC. Fund the deployer from https://faucet.circle.com before broadcasting.

## Addresses to use

These are the addresses the frontend reads. Proxy addresses stay stable across upgrades.

| Contract | Type | Address | Frontend env var |
|---|---|---|---|
| `ArcFlow` | Immutable, no owner, no upgrade path | `0x003DE5DF8609E37b89EC91bF1cFDD65096cA98ee` | `NEXT_PUBLIC_ARCFLOW_ADDRESS` |
| `ArcFlowStream` | ERC1967 / UUPS proxy | `0x15f148de4c29C4af03d7d77CC75418669521Adb0` | `NEXT_PUBLIC_ARCFLOW_STREAM_ADDRESS` |
| `ArcFlowDistributor` | ERC1967 / UUPS proxy | `0xd826aC6cCA47Bb7f4C66DbFDB4a76131De0450c8` | `NEXT_PUBLIC_ARCFLOW_DISTRIBUTOR_ADDRESS` |
| `ArcFlowEscrow` | ERC1967 / UUPS proxy | `0x528b3E0e78CbD1a4f9aFA011aE374ba12996B2C2` | `NEXT_PUBLIC_ARCFLOW_ESCROW_ADDRESS` |
| `ArcFlowStaking` | ERC1967 / UUPS proxy | `0x2627e3f07574F47b2B5bc3EfD774576357658063` | `NEXT_PUBLIC_ARCFLOW_STAKING_ADDRESS` |

`ArcFlow` is deployed raw on purpose: a lock an owner could upgrade would not prove anything to holders.

## Implementations behind the proxies

Never point the frontend at these. They are the current logic contracts, verified against each proxy's ERC1967 implementation slot; all four still match the original deploy, so no upgrade has been executed yet.

| Proxy | Current implementation |
|---|---|
| `ArcFlowStream` | `0x0b03EE094fFc1f5d05F02Cd32b8e7dfD489B07e3` |
| `ArcFlowDistributor` | `0x4584A7686a859Df934D7568559d3E10e41243B70` |
| `ArcFlowEscrow` | `0xA2e774925C9516E182fF4626c31d4957607Af52c` |
| `ArcFlowStaking` | `0x233645B1a45F5A018C48e914AB476C0aCaCA50A0` |

All four proxies are owned by the deployer address and upgradeable via `contracts/script/Upgrade.s.sol`.

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

## Mainnet

Not deployed yet. `foundry.toml` already carries the `arc` RPC alias for when it is.
