"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
async function checkStockBatches() {
    try {
        console.log("Checking stock_batches table...\n");
        const [tables] = await db_1.pool.query("SHOW TABLES LIKE 'stock_batches'");
        if (tables.length === 0) {
            console.log("❌ stock_batches table does NOT exist");
            console.log("\nCreating stock_batches table...");
            await db_1.pool.query(`
        CREATE TABLE IF NOT EXISTS stock_batches (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          product_id BIGINT UNSIGNED NOT NULL,
          batch_number VARCHAR(50) NOT NULL,
          mfg_date DATE NOT NULL,
          exp_date DATE NOT NULL,
          pack_size VARCHAR(50) NOT NULL,
          price DECIMAL(10, 2) NOT NULL,
          quantity INT NOT NULL DEFAULT 0,
          status ENUM('Active', 'Inactive') DEFAULT 'Active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )
      `);
            console.log("✓ stock_batches table created successfully");
        }
        else {
            console.log("✓ stock_batches table exists");
            const [structure] = await db_1.pool.query("DESCRIBE stock_batches");
            console.log("\nTable structure:");
            console.table(structure);
        }
    }
    catch (err) {
        console.error("Error:", err);
    }
    finally {
        process.exit(0);
    }
}
checkStockBatches();
