"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
async function checkTables() {
    try {
        console.log("Checking purchase_items table structure...\n");
        const [structure] = await db_1.pool.query("DESCRIBE purchase_items");
        console.log("Current purchase_items columns:");
        console.table(structure);
    }
    catch (err) {
        console.error("Error:", err);
    }
    finally {
        process.exit(0);
    }
}
checkTables();
