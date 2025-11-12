# Migration script to add customer_address column
# Run this with: .\add-customer-address.ps1

$env:MYSQL_PWD = "" # Add your MySQL password here if needed
$MySQLExe = "C:\xampp\mysql\bin\mysql.exe"
$Database = "stockdb"

Write-Host "Adding customer_address column to customers table..."

# Add customer_address column
$query = @"
USE $Database;
ALTER TABLE customers ADD COLUMN customer_address VARCHAR(255) NULL AFTER email;
"@

$query | & $MySQLExe -u root

Write-Host "Migration completed!"

# Show the customers table structure to verify
Write-Host "`nCustomers table structure:"
& $MySQLExe -u root -e "USE $Database; DESCRIBE customers;"
