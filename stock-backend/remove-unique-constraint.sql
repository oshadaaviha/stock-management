-- Remove UNIQUE constraint from sales.invoice_no to allow multiple products per invoice
USE stockdb;

ALTER TABLE sales DROP INDEX invoice_no;
ALTER TABLE sales ADD KEY idx_invoice_no (invoice_no);

SELECT 'UNIQUE constraint removed successfully! Now you can have multiple products per invoice.' AS message;
