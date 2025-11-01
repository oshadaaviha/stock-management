$env:MYSQL_PWD = "" # Set your MySQL password here if needed
$MySQLExe = "mysql"
$Database = "stockdb"

# Create Database and Tables
Get-Content ".\src\schema.sql" | & $MySQLExe -u root

Write-Host "Database and tables created successfully!"

# Verify tables
& $MySQLExe -u root -e "USE $Database; SHOW TABLES;"