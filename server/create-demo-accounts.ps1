# CareerPath demo accounts - RUN ON THE SERVER (needs the local Supabase up).
#
# Creates 3 ready-to-demo student accounts with completed profiles so
# evaluators never see an empty platform. Safe to re-run (skips existing).
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File server\create-demo-accounts.ps1
#
# Accounts: @demo.careerpath.local emails, shared demo password (printed at
# the end). Log in on the login page like any student.

$ErrorActionPreference = "Stop"

$envFile = Join-Path $PSScriptRoot "supabase\docker\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: $envFile not found - is the supabase folder in place?" -ForegroundColor Red
    exit 1
}
$url = (Get-Content $envFile | Select-String -Pattern "^SITE_URL=(.+)$").Matches[0].Groups[1].Value.Trim()
$anon = (Get-Content $envFile | Select-String -Pattern "^ANON_KEY=(.+)$").Matches[0].Groups[1].Value.Trim()

$apiBase = "http://localhost:8000/auth/v1"
$headers = @{ apikey = $anon; "Content-Type" = "application/json" }

$DemoPassword = "Demo@2026!"

$accounts = @(
    @{ email = "aarav@student.demo.careerpath.local"; name = "Aarav Sharma";  college = "Demo Institute of Technology"; career = "Software Engineer" },
    @{ email = "priya@student.demo.careerpath.local"; name = "Priya Iyer";     college = "Demo Institute of Technology"; career = "Data Analyst" },
    @{ email = "rohit@student.demo.careerpath.local"; name = "Rohit Verma";    college = "Demo Institute of Technology"; career = "Full Stack Developer" }
)

Write-Host ""
Write-Host "=== Creating demo accounts ===" -ForegroundColor Cyan

foreach ($a in $accounts) {
    $body = @{
        email    = $a.email
        password = $DemoPassword
        data     = @{ full_name = $a.name; role = "student" }
    } | ConvertTo-Json

    try {
        $resp = Invoke-RestMethod -Method Post -Uri "$apiBase/signup" -Headers $headers -Body $body
        $uid = $resp.user.id
        Write-Host ("  created  {0}  ({1})" -f $a.name, $a.email) -ForegroundColor Green
    } catch {
        # Supabase returns 422 "already registered" - treat as skip
        $msg = $_.ErrorDetails.Message
        if ($msg -match "already") {
            Write-Host ("  exists   {0}" -f $a.email) -ForegroundColor Yellow
            continue
        } else {
            Write-Host ("  FAILED   {0} - {1}" -f $a.email, $msg) -ForegroundColor Red
            continue
        }
    }

    # fill the profile so evaluators see a complete dashboard
    if ($uid) {
        $profileBody = @{
            full_name          = $a.name
            college            = $a.college
            current_education  = "B.Tech CSE - Final Year"
            onboarding_complete = $true
        } | ConvertTo-Json
        try {
            Invoke-RestMethod -Method Patch `
                -Uri "http://localhost:8000/rest/v1/profiles?id=eq.$uid" `
                -Headers ($headers + @{ Authorization = "Bearer $($resp.access_token)"; Prefer = "return=minimal" }) `
                -Body $profileBody | Out-Null
        } catch {
            Write-Host "  (profile update skipped: $($_.Exception.Message))" -ForegroundColor DarkYellow
        }
    }
}

Write-Host ""
Write-Host "Demo password for ALL accounts: $DemoPassword" -ForegroundColor Cyan
Write-Host "Log in at your app URL with e.g. aarav@student.demo.careerpath.local"
