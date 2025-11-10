# Fresh Migration Script for Stock Management Database
# This will DROP the entire database and recreate it from schema.sql

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fresh Database Migration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "WARNING: This will delete ALL existing data!" -ForegroundColor Red
Write-Host ""

$confirmation = Read-Host "Are you sure you want to continue? (yes/no)"

if ($confirmation -ne "yes") {
    Write-Host "Migration cancelled." -ForegroundColor Yellow
    exit
}

# Find MySQL executable
$mysqlPaths = @(
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe",
    "C:\xampp\mysql\bin\mysql.exe",
    "C:\wamp64\bin\mysql\mysql8.0.27\bin\mysql.exe"
)

$mysql = $null
foreach ($path in $mysqlPaths) {
    if (Test-Path $path) {
        $mysql = $path
        break
    }
}

if (-not $mysql) {
    Write-Host "MySQL not found. Please provide the full path to mysql.exe:" -ForegroundColor Yellow
    $mysql = Read-Host "MySQL path"
    if (-not (Test-Path $mysql)) {
        Write-Host "Invalid MySQL path!" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Using MySQL: $mysql" -ForegroundColor Green
Write-Host "Enter your MySQL root password when prompted..." -ForegroundColor Yellow
Write-Host ""

# Create SQL script
$sqlFile = "temp_migrate.sql"
@"
DROP DATABASE IF EXISTS stockdb;
CREATE DATABASE stockdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE stockdb;
"@ | Out-File -FilePath $sqlFile -Encoding utf8

Get-Content "src/schema.sql" | Out-File -FilePath $sqlFile -Append -Encoding utf8

# Execute migration
Get-Content $sqlFile | & $mysql -u root -p

if ($LASTEXITCODE -eq 0) {
    Write-Host "Database migrated successfully!" -ForegroundColor Green
    Write-Host "Database is ready to use!" -ForegroundColor Cyan
} else {
    Write-Host "Migration failed!" -ForegroundColor Red
}

# Cleanup
Remove-Item $sqlFile -ErrorAction SilentlyContinue
