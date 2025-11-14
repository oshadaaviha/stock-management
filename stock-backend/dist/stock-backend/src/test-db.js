"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_js_1 = require("./db.js");
async function testConnection() {
    try {
        const connection = await db_js_1.pool.getConnection();
        console.log("Successfully connected to the database!");
        // Check if products table exists
        const [tables] = await connection.query("SHOW TABLES");
        console.log("Available tables:", tables);
        connection.release();
    }
    catch (error) {
        console.error("Database connection error:", error);
    }
    finally {
        process.exit();
    }
}
testConnection();
