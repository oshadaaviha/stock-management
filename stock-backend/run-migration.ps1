# PowerShell script to run the migration
# Usage: .\run-migration.ps1

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$host = "localhost"
$user = "root"
$database = "stockdb"
$sqlFile = "src\migrate-sales-fields.sql"

# Check if MySQL exists at the default path
if (-not (Test-Path $mysqlPath)) {
    Write-Host "MySQL not found at default path. Please run manually:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Open MySQL Workbench or command line and run these commands:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "USE stockdb;" -ForegroundColor Green
    Write-Host "ALTER TABLE sales ADD COLUMN IF NOT EXISTS batch_no VARCHAR(100) NULL AFTER payment_type;" -ForegroundColor Green
    Write-Host "ALTER TABLE sales ADD COLUMN IF NOT EXISTS route_rep_code VARCHAR(100) NULL AFTER batch_no;" -ForegroundColor Green
    Write-Host "ALTER TABLE sales ADD COLUMN IF NOT EXISTS sales_rep_name VARCHAR(255) NULL AFTER route_rep_code;" -ForegroundColor Green
    Write-Host ""
    exit
}

# Run migration
Write-Host "Running migration..." -ForegroundColor Cyan
& $mysqlPath -h $host -u $user -p $database -e "source $sqlFile"
Write-Host "Migration completed!" -ForegroundColor Green
