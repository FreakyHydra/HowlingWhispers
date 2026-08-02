$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root "launcher\HowlingWhispersLauncher.cs"
$output = Join-Path $root "The Howling Whispers.exe"

if (Test-Path -LiteralPath $output) {
    Remove-Item -LiteralPath $output -Force
}

Add-Type `
    -Path $source `
    -ReferencedAssemblies "System.dll", "System.Windows.Forms.dll" `
    -OutputAssembly $output `
    -OutputType WindowsApplication

Write-Host "Built $output"
