$ErrorActionPreference = "Stop"

$displayName = "The Howling Whispers Remote Test (TCP 5173)"
$existing = Get-NetFirewallRule -DisplayName $displayName -ErrorAction SilentlyContinue
if (-not $existing) {
    New-NetFirewallRule `
        -DisplayName $displayName `
        -Direction Inbound `
        -Action Allow `
        -Protocol TCP `
        -LocalPort 5173 `
        -Profile Any | Out-Null
}

Write-Host "Windows Firewall allows inbound TCP port 5173."
