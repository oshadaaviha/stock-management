# Apply fix to remove UNIQUE constraint from sales.invoice_no
# This allows multiple products per invoice

Write-Host "Applying database fix for sales table..." -ForegroundColor Cyan

# Try to find MySQL installation
$mysqlPaths = @(
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe",
    "C:\xampp\mysql\bin\mysql.exe",
    "C:\wamp64\bin\mysql\mysql8.0.27\bin\mysql.exe"
)

$mysqlExe = $null
foreach ($path in $mysqlPaths) {
    if (Test-Path $path) {
        $mysqlExe = $path
        Write-Host "Found MySQL at: $path" -ForegroundColor Green
        break
    }
}

if (-not $mysqlExe) {
    Write-Host "MySQL not found in standard paths. Please enter the full path to mysql.exe:" -ForegroundColor Yellow
    $mysqlExe = Read-Host "MySQL path"
    if (-not (Test-Path $mysqlExe)) {
        Write-Host "Error: Invalid MySQL path" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "This will modify the sales table to allow multiple rows per invoice." -ForegroundColor Yellow
Write-Host "Press Enter to continue or Ctrl+C to cancel..."
Read-Host

# Execute the fix
Get-Content "fix-sales-constraint.sql" | & $mysqlExe -u root -p

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Database fix applied successfully!" -ForegroundColor Green
    Write-Host "You can now create sales with multiple products per invoice." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Error applying database fix. Please check the error messages above." -ForegroundColor Red
}
