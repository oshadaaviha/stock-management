"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
async function testPurchaseInsert() {
    console.log("Testing purchase insert...");
    const conn = await db_1.pool.getConnection();
    try {
        // Test data
        const testData = {
            refNo: "TEST-" + Date.now(),
            supplier: "Test Supplier",
            batch_number: "BATCH-001",
            sub_total: 100.00,
            total: 100.00
        };
        console.log("\n1. Testing purchases table insert:");
        console.log("Data:", testData);
        const [res1] = await conn.query("INSERT INTO purchases (ref_no, supplier, batch_number, sub_total, total) VALUES (?,?,?,?,?)", [testData.refNo, testData.supplier, testData.batch_number, testData.sub_total, testData.total]);
        console.log("✓ Purchases insert successful! ID:", res1.insertId);
        const pid = res1.insertId;
        // Test purchase_items insert
        console.log("\n2. Testing purchase_items table insert:");
        const itemData = {
            purchase_id: pid,
            product_id: 1, // Make sure you have a product with ID 1
            mfg_date: "2025-01-01",
            exp_date: "2026-01-01",
            pack_size: "10x100g",
            price: 15.00,
            cost: 10.00,
            qty: 10,
            line_total: 100.00
        };
        console.log("Data:", itemData);
        await conn.query("INSERT INTO purchase_items (purchase_id, product_id, mfg_date, exp_date, pack_size, price, cost, qty, line_total) VALUES (?,?,?,?,?,?,?,?,?)", [itemData.purchase_id, itemData.product_id, itemData.mfg_date, itemData.exp_date, itemData.pack_size, itemData.price, itemData.cost, itemData.qty, itemData.line_total]);
        console.log("✓ Purchase_items insert successful!");
        console.log("\n3. Success! Both tables are working correctly.");
    }
    catch (err) {
        console.error("\n❌ Error occurred:");
        console.error("Error code:", err.code);
        console.error("Error message:", err.message);
        console.error("SQL State:", err.sqlState);
        console.error("SQL:", err.sql);
        console.error("\nFull error:", err);
    }
    finally {
        conn.release();
        process.exit(0);
    }
}
testPurchaseInsert();
