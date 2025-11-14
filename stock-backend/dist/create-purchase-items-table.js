"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
async function createPurchaseItemsTable() {
    try {
        await db_1.pool.query(`
      CREATE TABLE IF NOT EXISTS purchase_items (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        purchase_id BIGINT UNSIGNED NOT NULL,
        product_id BIGINT UNSIGNED NOT NULL,
        mfg_date DATE NOT NULL,
        exp_date DATE NOT NULL,
        pack_size VARCHAR(50) NOT NULL,
        price DECIMAL(12,2) NOT NULL,
        cost DECIMAL(12,2) NOT NULL,
        qty INT NOT NULL,
        line_total DECIMAL(12,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);
        console.log("✓ purchase_items table created/verified");
        // Check if table exists
        const [tables] = await db_1.pool.query("SHOW TABLES LIKE 'purchase_items'");
        if (tables.length > 0) {
            console.log("✓ purchase_items table exists in database");
            // Show structure
            const [structure] = await db_1.pool.query("DESCRIBE purchase_items");
            console.log("Table structure:", structure);
        }
        else {
            console.log("✗ purchase_items table not found");
        }
    }
    catch (err) {
        console.error("Error creating purchase_items table:", err);
    }
    finally {
        process.exit(0);
    }
}
createPurchaseItemsTable();
