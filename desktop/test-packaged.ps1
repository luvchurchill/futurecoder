$ErrorActionPreference = 'Stop'
$editions = @(
    @{ Name = 'x64'; Path = 'desktop/release/win-unpacked/futurecoder Offline.exe'; Machine = 0x8664; Electron = '44.0.0' },
    @{ Name = 'win7-ia32'; Path = 'desktop/release/win7-ia32/win-ia32-unpacked/futurecoder Offline.exe'; Machine = 0x014c; Electron = '22.3.27' }
)
foreach ($edition in $editions) {
    # Inspect the executable itself, not just its filename.
    $bytes = [System.IO.File]::ReadAllBytes((Resolve-Path $edition.Path))
    $pe = [BitConverter]::ToInt32($bytes, 0x3c)
    if ([BitConverter]::ToUInt16($bytes, $pe + 4) -ne $edition.Machine) {
        throw "Wrong PE architecture for $($edition.Name)"
    }
    $result = Join-Path (Resolve-Path 'desktop/release') "$($edition.Name)-smoke-result.json"
    Remove-Item $result -ErrorAction SilentlyContinue
    $env:FUTURECODER_SMOKE_RESULT = $result
    $process = Start-Process -FilePath $edition.Path -ArgumentList '--smoke-test' -PassThru
    try {
        $deadline = (Get-Date).AddMinutes(9)
        while (-not (Test-Path $result) -and (Get-Date) -lt $deadline) {
            Start-Sleep -Seconds 1
        }
        if (-not (Test-Path $result)) { throw "No smoke result for $($edition.Name)" }
        $smoke = Get-Content $result -Raw | ConvertFrom-Json
        if (-not $smoke.success) { throw "$($edition.Name): $($smoke.error)" }
        if ($smoke.electron -ne $edition.Electron -or $smoke.arch -ne $edition.Name.Replace('win7-', '')) {
            throw "Unexpected runtime: $(Get-Content $result -Raw)"
        }
        Write-Output (Get-Content $result -Raw)
    } finally {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        $process.WaitForExit(10000) | Out-Null
    }
}
