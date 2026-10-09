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
$anon = $envVars['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']
if (-not $anon) { $anon = $envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'] }

if (-not $url -or -not $anon) {
    Write-Error "NEXT_PUBLIC_SUPABASE_URL atau NEXT_PUBLIC_SUPABASE_ANON_KEY tidak ditemukan di .env.local"
    exit 1
}

if ($url.TrimEnd('/') -ne 'https://lpgrivowdcepcxradavu.supabase.co') {
    Write-Error "Load tests are staging-only"
    exit 1
}
if (-not $env:LOAD_TEST_LEARNER_JWT -or -not $env:LOAD_TEST_EXAM_IDS) {
    Write-Error "Set a disposable staging learner JWT and exam IDs before running Schema V2 reads."
    exit 1
}
Write-Host "Schema V2 staging smoke: 1 VU, 3 iterations. Stress requires explicit opt-in."

$scriptPath = Join-Path $PSScriptRoot "03_supabase_stress.js"
$outputPath = Join-Path $PSScriptRoot "results_stress.json"

$env:NEXT_PUBLIC_SUPABASE_URL = $url
$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = $anon
k6 run `
    --out "json=$outputPath" `
    $scriptPath
