import { pool } from "./db";

async function createSuppliersTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(180) NOT NULL,
        contact VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✓ Suppliers table created/verified");
    
    // Check if table exists
    const [tables]: any = await pool.query("SHOW TABLES LIKE 'suppliers'");
    if (tables.length > 0) {
      console.log("✓ Suppliers table exists in database");
      
      // Show structure
      const [structure]: any = await pool.query("DESCRIBE suppliers");
      console.log("Table structure:", structure);
    } else {
      console.log("✗ Suppliers table not found");
    }
  } catch (err) {
    console.error("Error creating suppliers table:", err);
  } finally {
    process.exit(0);
  }
}

createSuppliersTable();
