$ErrorActionPreference = 'Stop'
function Test-Application($name, $exe, $machine, $electron, $arch) {
    # Inspect the executable itself, not just its filename.
    $bytes = [System.IO.File]::ReadAllBytes((Resolve-Path $exe))
    $pe = [BitConverter]::ToInt32($bytes, 0x3c)
    if ([BitConverter]::ToUInt16($bytes, $pe + 4) -ne $machine) {
        throw "Wrong PE architecture for $name"
    }
    $result = Join-Path (Resolve-Path 'desktop/release') "$name-smoke-result.json"
    Remove-Item $result -ErrorAction SilentlyContinue
    $env:FUTURECODER_SMOKE_RESULT = $result
    $process = Start-Process -FilePath $exe -ArgumentList '--smoke-test' -PassThru
    try {
        $deadline = (Get-Date).AddMinutes(9)
        while (-not (Test-Path $result) -and (Get-Date) -lt $deadline) {
            Start-Sleep -Seconds 1
        }
        if (-not (Test-Path $result)) { throw "No smoke result for $name" }
        $smoke = Get-Content $result -Raw | ConvertFrom-Json
        if (-not $smoke.success) { throw "${name}: $($smoke.error)" }
        if ($smoke.electron -ne $electron -or $smoke.arch -ne $arch) {
            throw "Unexpected runtime: $(Get-Content $result -Raw)"
        }
        Write-Output (Get-Content $result -Raw)
    } finally {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        $process.WaitForExit(10000) | Out-Null
    }
}
Test-Application 'x64' 'desktop/release/win-unpacked/futurecoder Offline.exe' 0x8664 '44.0.0' 'x64'
Test-Application 'win7-ia32' 'desktop/release/win7-ia32/win-ia32-unpacked/futurecoder Offline.exe' 0x014c '22.3.27' 'ia32'

# Exercise the distributable installer and its uninstaller, not just win-unpacked.
$installers = @(Get-ChildItem 'desktop/release/win7-ia32/*-win7-ia32.exe')
if ($installers.Count -ne 1) { throw 'Expected exactly one ia32 installer' }
$installDir = Join-Path ([System.IO.Path]::GetTempPath()) ('futurecoder-install-' + [guid]::NewGuid().ToString('N'))
$setup = Start-Process -FilePath $installers[0].FullName -ArgumentList @('/S', "/D=$installDir") -PassThru
if (-not $setup.WaitForExit(120000)) { $setup.Kill(); throw 'Installer timed out' }
if ($setup.ExitCode -ne 0) { throw "Installer failed: $($setup.ExitCode)" }
Test-Application 'installed-win7-ia32' (Join-Path $installDir 'futurecoder Offline.exe') 0x014c '22.3.27' 'ia32'
$uninstall = Start-Process -FilePath (Join-Path $installDir 'Uninstall futurecoder Offline.exe') -ArgumentList '/S' -PassThru
if (-not $uninstall.WaitForExit(120000)) { $uninstall.Kill(); throw 'Uninstaller timed out' }
if ($uninstall.ExitCode -ne 0) { throw "Uninstaller failed: $($uninstall.ExitCode)" }
$deadline = (Get-Date).AddSeconds(60)
while ((Test-Path (Join-Path $installDir 'futurecoder Offline.exe')) -and (Get-Date) -lt $deadline) { Start-Sleep -Seconds 1 }
if (Test-Path (Join-Path $installDir 'futurecoder Offline.exe')) { throw 'Uninstall left application executable behind' }
Write-Output 'ia32 silent installation, installed application validation, and uninstallation passed'
