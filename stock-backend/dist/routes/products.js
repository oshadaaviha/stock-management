"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../db");
const zod_1 = require("zod");
const router = express_1.default.Router();
// Product schema
const productSchema = zod_1.z.object({
    sku: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    generic_name: zod_1.z.string().optional().nullable(),
    brand_name: zod_1.z.string().optional().nullable(),
    strength: zod_1.z.string().optional().nullable(),
    category: zod_1.z.string().optional().nullable(),
    cost: zod_1.z.number().nonnegative(),
    price: zod_1.z.number().nonnegative(),
    discount: zod_1.z.number().nonnegative().default(0),
    qty: zod_1.z.number().int().nonnegative().default(0),
    status: zod_1.z.enum(["Active", "Inactive"]).default("Active"),
});
// list
router.get("/", async (_req, res) => {
    const [rows] = await db_1.pool.query("SELECT * FROM products ORDER BY id DESC");
    res.json(rows);
});
// create
router.post("/", async (req, res) => {
    const data = productSchema.parse(req.body);
    const [result] = await db_1.pool.query(`INSERT INTO products (
      sku, name, generic_name, brand_name, strength, category, 
      cost, price, discount, qty, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
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
    ]);
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
    await db_1.pool.query(`UPDATE products SET 
      sku = ?, name = ?, generic_name = ?, brand_name = ?, 
      strength = ?, category = ?, cost = ?, price = ?, 
      discount = ?, qty = ?, status = ? 
    WHERE id = ?`, [
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
    ]);
    res.json({ ok: true });
});
// delete
router.delete("/:id", async (req, res) => {
    await db_1.pool.query("DELETE FROM products WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
});
exports.default = router;
