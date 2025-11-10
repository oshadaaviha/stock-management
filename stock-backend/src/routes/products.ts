import express from "express";
import { pool } from "../db";
import { z } from "zod";

const router = express.Router();

// Product schema
const productSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  generic_name: z.string().optional().nullable(),
  brand_name: z.string().optional().nullable(),
  strength: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  cost: z.number().nonnegative(),
  price: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  qty: z.number().int().nonnegative().default(0),
  status: z.enum(["Active","Inactive"]).default("Active"),
});

// list
router.get("/", async (_req, res) => {
  const [rows] = await pool.query("SELECT * FROM products ORDER BY id DESC");
  res.json(rows);
});

// create
router.post("/", async (req, res) => {
  const data = productSchema.parse(req.body);
  const [result]: any = await pool.query(
    `INSERT INTO products (
      sku, name, generic_name, brand_name, strength, category, 
      cost, price, discount, qty, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.sku,
      data.name,
      data.generic_name ?? null,
      data.brand_name ?? null,
      data.strength ?? null,
      data.category ?? null,
      data.cost,
      data.price,
      data.discount,
      data.qty,
      data.status
    ]
  );
  res.status(201).json({ 
    ok: true, 
    id: result.insertId,
    ...data
  });
});

// update
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const data = productSchema.parse(req.body);
  await pool.query(
    `UPDATE products SET 
      sku = ?, name = ?, generic_name = ?, brand_name = ?, 
      strength = ?, category = ?, cost = ?, price = ?, 
      discount = ?, qty = ?, status = ? 
    WHERE id = ?`,
    [
      data.sku,
      data.name,
      data.generic_name ?? null,
      data.brand_name ?? null,
      data.strength ?? null,
      data.category ?? null,
      data.cost,
      data.price,
      data.discount,
      data.qty,
      data.status,
      id
    ]
  );
  res.json({ ok: true });
});

// delete
router.delete("/:id", async (req, res) => {
  await pool.query("DELETE FROM products WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

export default router;