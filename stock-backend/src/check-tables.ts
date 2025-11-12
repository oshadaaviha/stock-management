import { pool } from "./db";

async function checkTables() {
  try {
    console.log("Checking purchase_items table structure...\n");
    
    const [structure]: any = await pool.query("DESCRIBE purchase_items");
    console.log("Current purchase_items columns:");
    console.table(structure);
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

checkTables();
