import { pool } from "./db.js";

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("Successfully connected to the database!");
    
    // Check if products table exists
    const [tables] = await connection.query("SHOW TABLES");
    console.log("Available tables:", tables);
    
    connection.release();
  } catch (error) {
    console.error("Database connection error:", error);
  } finally {
    process.exit();
  }
}

testConnection();