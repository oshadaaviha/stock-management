"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
async function testStockQuery() {
    try {
        console.log("Testing stock query...\n");
        const [rows] = await db_1.pool.query(`
      SELECT 
        pi.id,
        pi.purchase_id,
        pi.product_id,
        p.sku,
        p.name,
        pi.mfg_date,
        pi.exp_date,
        pi.pack_size,
        pi.price,
        pi.cost,
        pi.qty as quantity,
        pi.line_total
      FROM purchase_items pi
      JOIN products p ON p.id = pi.product_id
      ORDER BY pi.id DESC
      LIMIT 5
    `);
        console.log(`Found ${rows.length} purchase items:`);
        console.table(rows);
    }
    catch (err) {
        console.error("❌ Error:", err.message);
        console.error("SQL State:", err.sqlState);
        console.error("Error code:", err.code);
    }
    finally {
        process.exit(0);
    }
}
testStockQuery();
