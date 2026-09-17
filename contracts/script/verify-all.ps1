# Generate standard-json inputs and print Arc Blockscout verification status.
# Automated POST to explorer.arc.io is blocked by Cloudflare from CLI.
# Use the printed links and upload the JSON files in the browser UI.

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "Building contracts..."
forge build | Out-Null

$impls = @(
    @{ Label = "Lock";        Address = "0x8a4093de908e49e67cfa558694d44e8f05507c93"; File = "arcflows.sol";            Name = "arcflowsLocker" },
    @{ Label = "Stream";      Address = "0xbba0dcaaf15488f3d3f912e4e54a792f93f4082a"; File = "ArcFlowStream.sol";      Name = "ArcFlowStream" },
    @{ Label = "Distributor"; Address = "0x3479604612233bed56c7713cf4275f119032ac6b"; File = "ArcFlowDistributor.sol"; Name = "ArcFlowDistributor" },
    @{ Label = "Escrow";      Address = "0x92d2575b18cc7bc54f45f15e56f652732f1cc6d3"; File = "ArcFlowEscrow.sol";      Name = "ArcFlowEscrow" },
    @{ Label = "Staking";     Address = "0x333fcd911b76285e349d3806c5bfce2877d2d4af"; File = "ArcFlowStaking.sol";     Name = "ArcFlowStaking" }
)

$proxies = @(
    @{ Label = "Lock proxy";        Address = "0xCD1bEeE5856Cd0c57931258d9621FeB2052B5481" },
    @{ Label = "Stream proxy";      Address = "0x4c6AaE1aDE8ec4f7b2E7f76135b203Fc0A500516" },
    @{ Label = "Distributor proxy"; Address = "0x01CA506129dd74E5e2302eaD2A9ae75Ef80E0047" },
    @{ Label = "Escrow proxy";      Address = "0x814ea63b4B01e6d36617FDdDc9B5B05ca17c544F" },
    @{ Label = "Staking proxy";     Address = "0x290D0ED8823E5E18B19113C0Af5b8F84580D58F5" }
)

Write-Host "`nGenerating standard JSON inputs..."
foreach ($impl in $impls) {
    $out = "verify-$($impl.Name).json"
    forge verify-contract $impl.Address "src/$($impl.File):$($impl.Name)" `
        --chain 5042 --show-standard-json-input `
        --compiler-version 0.8.24 --num-of-optimizations 200 --via-ir `
        2>$null | Out-File -Encoding utf8 $out
}

Write-Host "`nImplementation status on https://explorer.arc.io"
foreach ($impl in $impls) {
    try {
        $r = Invoke-RestMethod "https://explorer.arc.io/api/v2/smart-contracts/$($impl.Address)"
        $status = if ($r.is_verified) { "VERIFIED ($($r.name))" } else { "PENDING" }
    } catch {
        $status = "PENDING"
    }
    Write-Host ("  {0,-12} {1}  {2}" -f $impl.Label, $status, $impl.Address)
    if ($status -eq "PENDING") {
        Write-Host ("    -> https://explorer.arc.io/address/{0}/contract-verification" -f $impl.Address)
        Write-Host ("       Upload verify-{0}.json as Solidity standard JSON input" -f $impl.Name)
        Write-Host "       Compiler: v0.8.24+commit.e11b9ed9 | Optimization: yes, 200 runs | via-ir | EVM: cancun"
        Write-Host ("       Contract name: {0}" -f $impl.Name)
    }
    Start-Sleep -Milliseconds 800
}

Write-Host "`nProxy status"
foreach ($proxy in $proxies) {
    try {
        $r = Invoke-RestMethod "https://explorer.arc.io/api/v2/smart-contracts/$($proxy.Address)"
        $status = if ($r.is_verified) { "VERIFIED ($($r.name))" } else { "PENDING" }
    } catch {
        $status = "PENDING"
    }
    Write-Host ("  {0,-18} {1}  {2}" -f $proxy.Label, $status, $proxy.Address)
    if ($status -eq "PENDING") {
        Write-Host ("    -> https://explorer.arc.io/address/{0}/contract-verification" -f $proxy.Address)
        Write-Host "       Method: Verify via Sourcify (already on sourcify.dev) OR ERC1967Proxy + autodetect constructor args"
    }
    Start-Sleep -Milliseconds 800
}

Write-Host "`nSourcify (all implementations):"
Write-Host "  forge verify-contract <addr> src/<file>:<name> --chain 5042 --verifier sourcify --compiler-version 0.8.24 --num-of-optimizations 200 --via-ir"
