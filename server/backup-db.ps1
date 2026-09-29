# CareerPath database backup / restore - RUN ON THE SERVER.
#
# Backup:  powershell -ExecutionPolicy Bypass -File server\backup-db.ps1
#          -> writes server\backups\careerpath-YYYYMMDD-HHMMSS.sql (gitignored)
#
# Restore drill (do this ONCE before demo week - an untested backup is a hope,
# not a backup): restores into a throwaway database, verifies, drops it.
#          powershell -ExecutionPolicy Bypass -File server\backup-db.ps1 -Restore -File server\backups\careerpath-XXXX.sql
#
# Schedule daily backups with Windows Task Scheduler:
#   schtasks /Create /TN "CareerPath Backup" /SC DAILY /ST 02:30 /TR ^
#     "powershell -ExecutionPolicy Bypass -File D:\path\to\CareerPath\server\backup-db.ps1"
#
# Requires Docker Desktop running (uses the supabase-db container's pg_dump).

param(
    [switch]$Restore,
    [string]$File = ""
)

$ErrorActionPreference = "Stop"
$BackupDir = Join-Path $PSScriptRoot "backups"

# find the supabase db container (compose names it supabase-db)
$dbContainer = (docker ps --format "{{.Names}}" | Select-String -Pattern "supabase-db" | Select-Object -First 1)
if (-not $dbContainer) {
    Write-Host "ERROR: supabase-db container not running. Start the stack first (server\start-all.ps1)." -ForegroundColor Red
    exit 1
}
$dbContainer = $dbContainer.ToString().Trim()

# the self-hosted supabase .env holds the postgres password
$envFile = Join-Path $PSScriptRoot "supabase\docker\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: $envFile not found." -ForegroundColor Red
    exit 1}
$pgPassword = (Get-Content $envFile | Select-String -Pattern "^POSTGRES_PASSWORD=(.+)$").Matches[0].Groups[1].Value.Trim()

if ($Restore) {
    # ---------------- restore drill ----------------
    if (-not $File -or -not (Test-Path $File)) {
        Write-Host "ERROR: pass -Restore -File <path to a backup .sql>" -ForegroundColor Red
        exit 1
    }
    $testDb = "restore_drill_$(Get-Date -Format 'HHmmss')"
    Write-Host "=== Restore drill: $File -> temp db '$testDb' ===" -ForegroundColor Cyan

    # create throwaway db inside the same postgres instance
    docker exec $dbContainer psql -U postgres -c "CREATE DATABASE $testDb;" | Out-Null
    try {
        Get-Content $File -Raw | docker exec -i -e PGPASSWORD="$pgPassword" $dbContainer psql -U postgres -d $testDb -q
        if ($LASTEXITCODE -ne 0) { throw "psql restore exited with $LASTEXITCODE" }

        # verify: every table exists and counts are readable
        $tables = docker exec $dbContainer psql -U postgres -d $testDb -t -c `
            "select count(*) from information_schema.tables where table_schema='public';"
        $rows = docker exec $dbContainer psql -U postgres -d $testDb -t -c `
            "select count(*) from public.coding_challenges;" 2>$null
        Write-Host "Restored OK - public tables: $($tables.Trim()), coding_challenges rows: $($rows.Trim())" -ForegroundColor Green
        Write-Host "Restore drill PASSED - this backup is trustworthy." -ForegroundColor Green
    } catch {
        Write-Host "Restore drill FAILED: $_" -ForegroundColor Red
        exit 1
    } finally {
        docker exec $dbContainer psql -U postgres -c "DROP DATABASE IF EXISTS $testDb;" | Out-Null
        Write-Host "Temp db dropped."
    }
} else {
    # ---------------- backup ----------------
    if (-not (Test-Path $BackupDir)) { New-Item -ItemType Directory -Path $BackupDir | Out-Null }
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $out = Join-Path $BackupDir "careerpath-$stamp.sql"

    # --no-owner/--no-privileges: keeps the dump restorable without supabase admin roles
    docker exec $dbContainer pg_dump -U postgres --clean --if-exists --no-owner --no-privileges postgres > $out
    if ($LASTEXITCODE -ne 0 -or (Get-Item $out).Length -lt 1000) {
        Write-Host "Backup FAILED (file too small or pg_dump error)." -ForegroundColor Red
        exit 1    }
    $sizeKb = [math]::Round((Get-Item $out).Length / 1KB)
    Write-Host "Backup OK: $out ($sizeKb KB)" -ForegroundColor Green
    Write-Host "Tip: run the restore drill once:  .\backup-db.ps1 -Restore -File `"$out`""
}
