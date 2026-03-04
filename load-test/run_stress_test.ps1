# run_stress_test.ps1
# Membaca .env.local dan menjalankan k6 stress test (03_supabase_stress.js)
# Jalankan dari root project: .\load-test\run_stress_test.ps1

$envFile = Join-Path (Join-Path $PSScriptRoot "..") ".env.local"

if (-not (Test-Path $envFile)) {
    Write-Error "File .env.local tidak ditemukan di: $envFile"
    exit 1
}

# Parse .env.local
$envVars = @{}
Get-Content $envFile | Where-Object { $_ -match '^\s*[^#]' -and $_ -match '=' } | ForEach-Object {
    $parts = $_ -split '=', 2
    $key = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"').Trim("'")
    $envVars[$key] = $value
}

$url = $envVars['NEXT_PUBLIC_SUPABASE_URL']
$anon = $envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY']

if (-not $url -or -not $anon) {
    Write-Error "NEXT_PUBLIC_SUPABASE_URL atau NEXT_PUBLIC_SUPABASE_ANON_KEY tidak ditemukan di .env.local"
    exit 1
}

Write-Host "=== SUPABASE FREE TIER STRESS TEST ===" -ForegroundColor Cyan
Write-Host "URL  : $($url.Substring(0, [Math]::Min(40, $url.Length)))..." -ForegroundColor Gray
Write-Host "Anon : $($anon.Substring(0, 20))..." -ForegroundColor Gray
Write-Host ""
Write-Host "Ramp-up plan:" -ForegroundColor Yellow
Write-Host "  20s →  50 VUs (warm-up)"
Write-Host "  30s → 100 VUs (lewati 60 direct conn)"
Write-Host "  30s → 150 VUs"
Write-Host "  30s → 200 VUs (TEP batas pooler)"
Write-Host "  30s → 250 VUs (LEWAT batas pooler)"
Write-Host "  30s → 300 VUs (stress)"
Write-Host "  20s →   0 VUs (cool-down)"
Write-Host ""

$scriptPath = Join-Path $PSScriptRoot "03_supabase_stress.js"
$outputPath = Join-Path $PSScriptRoot "results_stress.json"

k6 run `
    -e "NEXT_PUBLIC_SUPABASE_URL=$url" `
    -e "NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon" `
    --out "json=$outputPath" `
    $scriptPath
