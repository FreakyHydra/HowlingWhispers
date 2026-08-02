$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$packageInfo = Get-Content -LiteralPath (Join-Path $root "package.json") -Raw | ConvertFrom-Json
$releaseDirectory = Join-Path $root "release"
$stagingDirectory = Join-Path $env:TEMP "TheHowlingWhispersRelease"
$packageDirectory = Join-Path $stagingDirectory "The Howling Whispers"
$systemDirectory = Join-Path $packageDirectory "System"
$archiveName = "the-howling-whispers-windows.zip"
$archivePath = Join-Path $releaseDirectory $archiveName
$checksumPath = "$archivePath.sha256"

& (Join-Path $PSScriptRoot "build-windows-launcher.ps1")

Remove-Item -LiteralPath $stagingDirectory -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $systemDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $releaseDirectory -Force | Out-Null

$excludedNames = @(
    ".git",
    ".openai",
    ".next",
    ".sites-runtime",
    ".vinext",
    ".wrangler",
    "dist",
    "node_modules",
    "outputs",
    "release",
    "work",
    "The Howling Whispers.exe",
    "DEPENDENCIES AND FIRST START.txt",
    "START REMOTE ACCESS.bat",
    "DISABLE REMOTE ACCESS.bat",
    "REMOTE ACCESS - READ ME.txt",
    "tsconfig.tsbuildinfo"
)

Get-ChildItem -LiteralPath $root -Force |
    Where-Object { $excludedNames -notcontains $_.Name -and $_.Name -notlike ".env*" } |
    ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $systemDirectory -Recurse -Force
    }

Copy-Item -LiteralPath (Join-Path $root "The Howling Whispers.exe") -Destination $packageDirectory -Force
Copy-Item -LiteralPath (Join-Path $root "DEPENDENCIES AND FIRST START.txt") -Destination $packageDirectory -Force
Copy-Item -LiteralPath (Join-Path $root "START REMOTE ACCESS.bat") -Destination $packageDirectory -Force
Copy-Item -LiteralPath (Join-Path $root "DISABLE REMOTE ACCESS.bat") -Destination $packageDirectory -Force
Copy-Item -LiteralPath (Join-Path $root "REMOTE ACCESS - READ ME.txt") -Destination $packageDirectory -Force

Remove-Item -LiteralPath $archivePath, $checksumPath -Force -ErrorAction SilentlyContinue
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory(
    $stagingDirectory,
    $archivePath,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $false
)

$hash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath $checksumPath -Value "$hash  $archiveName" -Encoding Ascii
Remove-Item -LiteralPath $stagingDirectory -Recurse -Force

Write-Host "Packaged $($packageInfo.displayName) v$($packageInfo.version)"
Write-Host "ZIP: $archivePath"
Write-Host "SHA-256: $checksumPath"
