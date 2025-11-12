import express from "express";
import { pool } from "../db";
import { z } from "zod";

const router = express.Router();

// Stock schema
const stockBatchSchema = z.object({
  product_id: z.number().int().positive(),
  batch_number: z.string().min(1),
  mfg_date: z.string(), // will be validated as YYYY-MM-DD
  exp_date: z.string(), // will be validated as YYYY-MM-DD
  pack_size: z.string().min(1),
  unit_cost: z.number().nonnegative(),
  mrp: z.number().nonnegative().optional(),
  sell_price: z.number().nonnegative(),
  quantity: z.number().int().nonnegative(),
  status: z.enum(["Active", "Inactive"]).default("Active"),
});

// List raw purchase item rows (existing behaviour kept at "/")
router.get("/", async (_req, res) => {
  try {
    const [rows] = await pool.query(`
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
      ORDER BY p.sku ASC, pi.exp_date ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Stock list error:", err);
    res.status(500).json({ ok: false, error: "stock_fetch_failed" });
  }
});

// Aggregated stock by product (totals & expiry range)
router.get("/aggregate", async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        p.id as product_id,
        p.sku,
        p.name,
        SUM(pi.qty) as total_quantity,
        MIN(pi.exp_date) as earliest_exp,
        MAX(pi.exp_date) as latest_exp,
        SUM(pi.qty * pi.cost) as total_cost_value,
        SUM(pi.qty * pi.price) as total_price_value
      FROM purchase_items pi
      JOIN products p ON p.id = pi.product_id
      GROUP BY p.id, p.sku, p.name
      ORDER BY p.sku ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Stock aggregate error:", err);
    res.status(500).json({ ok: false, error: "stock_aggregate_failed" });
  }
});

// List stock batches from stock_batches table (distinct from purchase_items)
router.get("/batches", async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        sb.id,
        sb.product_id,
        p.sku,
        p.name,
        sb.batch_number,
        sb.mfg_date,
        sb.exp_date,
        sb.pack_size,
        sb.unit_cost as cost,
        sb.sell_price as price,
        sb.quantity,
        (sb.quantity * sb.unit_cost) as line_total,
        sb.status
      FROM stock_batches sb
      JOIN products p ON p.id = sb.product_id
      ORDER BY p.sku ASC, sb.exp_date ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Stock batches error:", err);
    res.status(500).json({ ok: false, error: "stock_batches_failed" });
  }
});

// Get stock for a specific product
router.get("/by-product/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT sb.*, p.name as product_name, p.sku
       FROM stock_batches sb
       JOIN products p ON p.id = sb.product_id
       WHERE sb.product_id = ?
       ORDER BY sb.exp_date ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("Stock by product error:", err);
    res.status(500).json({ ok: false, error: "stock_fetch_failed" });
  }
});

// Create stock batch
router.post("/", async (req, res) => {
  try {
    const data = stockBatchSchema.parse(req.body);
    const [result]: any = await pool.query(
      `INSERT INTO stock_batches (
        product_id, batch_number, mfg_date, exp_date,
        pack_size, unit_cost, mrp, sell_price, quantity, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.product_id,
        data.batch_number,
        data.mfg_date,
        data.exp_date,
        data.pack_size,
        data.unit_cost,
        data.mrp ?? null,
        data.sell_price,
        data.quantity,
        data.status
      ]
    );
    
    // Update total product quantity
    await pool.query(
      "UPDATE products SET qty = qty + ? WHERE id = ?",
      [data.quantity, data.product_id]
    );

    res.status(201).json({ 
      ok: true, 
      id: result.insertId,
      ...data
    });
  } catch (err) {
    console.error("Stock create error:", err);
    res.status(500).json({ ok: false, error: "stock_create_failed" });
  }
});

// Update stock batch
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = stockBatchSchema.parse(req.body);
    
    // Get old quantity to adjust product total
    const [oldRows]: any = await pool.query(
      "SELECT quantity, product_id FROM stock_batches WHERE id = ?",
      [id]
    );
    
    if (!oldRows.length) {
      return res.status(404).json({ ok: false, error: "Batch not found" });
    }
    
    const oldQty = oldRows[0].quantity;
    const qtyDiff = data.quantity - oldQty;

    await pool.query(
      `UPDATE stock_batches SET 
        product_id = ?, batch_number = ?, mfg_date = ?, exp_date = ?,
        pack_size = ?, unit_cost = ?, mrp = ?, sell_price = ?, quantity = ?, status = ?
      WHERE id = ?`,
      [
        data.product_id,
        data.batch_number,
        data.mfg_date,
        data.exp_date,
        data.pack_size,
        data.unit_cost,
        data.mrp ?? null,
        data.sell_price,
        data.quantity,
        data.status,
        id
      ]
    );

    // Update product quantity if it changed
    if (qtyDiff !== 0) {
      await pool.query(
        "UPDATE products SET qty = qty + ? WHERE id = ?",
        [qtyDiff, data.product_id]
      );
    }

    res.json({ ok: true, ...data });
  } catch (err) {
    console.error("Stock update error:", err);
    res.status(500).json({ ok: false, error: "stock_update_failed" });
  }
});

// Delete stock batch
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  
  // Get quantity to subtract from product total
  const [rows]: any = await pool.query(
    "SELECT quantity, product_id FROM stock_batches WHERE id = ?",
    [id]
  );
  
  if (!rows.length) {
    return res.status(404).json({ ok: false, error: "Batch not found" });
  }
  
  const { quantity, product_id } = rows[0];

  await pool.query("DELETE FROM stock_batches WHERE id = ?", [id]);
  
  // Update product quantity
  await pool.query(
    "UPDATE products SET qty = qty - ? WHERE id = ?",
    [quantity, product_id]
  );

  res.json({ ok: true });
});

export default router;