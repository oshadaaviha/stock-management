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
  price: z.number().nonnegative(),
  quantity: z.number().int().nonnegative(),
  status: z.enum(["Active", "Inactive"]).default("Active"),
});

// List stock with product details
router.get("/", async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT sb.*, p.name as product_name, p.sku
    FROM stock_batches sb
    JOIN products p ON p.id = sb.sku
    ORDER BY sb.created_at DESC
  `);
  res.json(rows);
});

// Get stock for a specific product
router.get("/by-product/:id", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT sb.*, p.name as product_name, p.sku
     FROM stock_batches sb
     JOIN products p ON p.id = sb.sku
     WHERE sb.sku = ?
     ORDER BY sb.exp_date ASC`,
    [req.params.id]
  );
  res.json(rows);
});

// Create stock batch
router.post("/", async (req, res) => {
  const data = stockBatchSchema.parse(req.body);
  const [result]: any = await pool.query(
    `INSERT INTO stock_batches (
      product_id, batch_number, mfg_date, exp_date,
      pack_size, price, quantity, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.product_id,
      data.batch_number,
      data.mfg_date,
      data.exp_date,
      data.pack_size,
      data.price,
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
});

// Update stock batch
router.put("/:id", async (req, res) => {
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
      pack_size = ?, price = ?, quantity = ?, status = ?
    WHERE id = ?`,
    [
      data.product_id,
      data.batch_number,
      data.mfg_date,
      data.exp_date,
      data.pack_size,
      data.price,
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

  res.json({ ok: true });
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