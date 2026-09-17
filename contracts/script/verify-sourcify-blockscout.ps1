param(
    [Parameter(Mandatory = $true)][string]$Address,
    [Parameter(Mandatory = $true)][string]$ArtifactPath,
    [string]$Explorer = "https://explorer.arc.io"
)

$ErrorActionPreference = "Stop"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$artifact = Get-Content $ArtifactPath -Raw | ConvertFrom-Json
$meta = $artifact.metadata | ConvertFrom-Json
$mainSource = ($meta.sources.PSObject.Properties | Where-Object { $_.Name -like "src/*" } | Select-Object -First 1)
if (-not $mainSource) { throw "No src/* source found in metadata" }

$tmp = Join-Path $env:TEMP ("arcflow-sourcify-{0}" -f ([guid]::NewGuid().ToString("n")))
New-Item -ItemType Directory -Path $tmp | Out-Null
$sourcePath = Join-Path $tmp "contract.sol"
$metaPath = Join-Path $tmp "metadata.json"
[System.IO.File]::WriteAllText($sourcePath, $mainSource.Value.content, $utf8NoBom)
[System.IO.File]::WriteAllText($metaPath, $artifact.metadata, $utf8NoBom)

$url = "$Explorer/api?module=contract&action=verify_via_sourcify"
Write-Host "Importing Sourcify files for $Address ..."
$response = curl.exe -s -X POST $url `
    -F "addressHash=$Address" `
    -F "files[0]=@$sourcePath;type=application/octet-stream" `
    -F "files[1]=@$metaPath;type=application/json"

Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
Write-Host $response
