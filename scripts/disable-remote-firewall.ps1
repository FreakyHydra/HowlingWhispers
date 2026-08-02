$ErrorActionPreference = "Stop"

$displayName = "The Howling Whispers Remote Test (TCP 5173)"
Get-NetFirewallRule -DisplayName $displayName -ErrorAction SilentlyContinue |
    Remove-NetFirewallRule

Write-Host "The Howling Whispers remote firewall rule was removed."
