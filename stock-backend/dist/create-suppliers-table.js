"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
async function createSuppliersTable() {
    try {
        await db_1.pool.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(180) NOT NULL,
        contact VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log("✓ Suppliers table created/verified");
        // Check if table exists
        const [tables] = await db_1.pool.query("SHOW TABLES LIKE 'suppliers'");
        if (tables.length > 0) {
            console.log("✓ Suppliers table exists in database");
            // Show structure
            const [structure] = await db_1.pool.query("DESCRIBE suppliers");
            console.log("Table structure:", structure);
        }
        else {
            console.log("✗ Suppliers table not found");
        }
    }
    catch (err) {
        console.error("Error creating suppliers table:", err);
    }
    finally {
        process.exit(0);
    }
}
createSuppliersTable();
