param(
    [Parameter(Mandatory = $true)][string]$Address,
    [Parameter(Mandatory = $true)][string]$ArtifactPath,
    [Parameter(Mandatory = $true)][string]$ContractName,
    [string]$Explorer = "https://explorer.arc.io"
)

$ErrorActionPreference = "Stop"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$artifact = Get-Content $ArtifactPath -Raw | ConvertFrom-Json
$standardJson = @{
    language = "Solidity"
    sources = $artifact.metadata | ConvertFrom-Json | Select-Object -ExpandProperty sources
    settings = $artifact.metadata | ConvertFrom-Json | Select-Object -ExpandProperty settings
} | ConvertTo-Json -Depth 100 -Compress

$tmp = Join-Path $env:TEMP ("arcflow-verify-{0}" -f ([guid]::NewGuid().ToString("n")))
New-Item -ItemType Directory -Path $tmp | Out-Null
$jsonPath = Join-Path $tmp "standard-input.json"
[System.IO.File]::WriteAllText($jsonPath, $standardJson, $utf8NoBom)

$uri = "$Explorer/api/v2/smart-contracts/$Address/verification/via/standard-input"
$form = @{
    compiler_version = "v0.8.24+commit.e11b9ed9"
    contract_name = $ContractName
    autodetect_constructor_args = "true"
    license_type = "mit"
    "files[0]" = Get-Item $jsonPath
}

Write-Host "Verifying $ContractName at $Address ..."
try {
    $response = Invoke-RestMethod -Method Post -Uri $uri -Form $form
    Write-Host "OK: $($response | ConvertTo-Json -Compress)"
} catch {
    Write-Host "FAILED: $($_.Exception.Message)"
    if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
    exit 1
} finally {
    Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}
