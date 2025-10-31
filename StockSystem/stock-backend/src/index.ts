import express from "express";
import cors from "cors";
import 'dotenv/config';
import { pool } from "./db";
import { z } from "zod";
import { invoiceHtml, nextInvoiceNo } from "./utils";

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? true }));

/* ---------- Products ---------- */

// list
app.get("/api/products", async (_req, res) => {
  const [rows] = await pool.query("SELECT * FROM products ORDER BY id DESC");
  res.json(rows);
});

// create
app.post("/api/products", async (req, res) => {
  const schema = z.object({
    sku: z.string().min(1),
    name: z.string().min(1),
    category: z.string().optional().nullable(),
    cost: z.number().nonnegative(),
    price: z.number().nonnegative(),
    qty: z.number().int().nonnegative().default(0),
    status: z.enum(["Active","Inactive"]).default("Active"),
  });
  const d = schema.parse(req.body);
  await pool.query(
    "INSERT INTO products (sku,name,category,cost,price,qty,status) VALUES (?,?,?,?,?,?,?)",
    [d.sku, d.name, d.category ?? null, d.cost, d.price, d.qty, d.status]
  );
  res.status(201).json({ ok: true });
});

// update
app.put("/api/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({
    sku: z.string().min(1),
    name: z.string().min(1),
    category: z.string().optional().nullable(),
    cost: z.number().nonnegative(),
    price: z.number().nonnegative(),
    qty: z.number().int().nonnegative(),
    status: z.enum(["Active","Inactive"]),
  });
  const d = schema.parse(req.body);
  await pool.query(
    `UPDATE products SET sku=?, name=?, category=?, cost=?, price=?, qty=?, status=? WHERE id=?`,
    [d.sku, d.name, d.category ?? null, d.cost, d.price, d.qty, d.status, id]
  );
  res.json({ ok: true });
});

// delete
app.delete("/api/products/:id", async (req, res) => {
  await pool.query("DELETE FROM products WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

/* ---------- Purchase (stock-in) ---------- */
app.post("/api/purchases", async (req, res) => {
  const schema = z.object({
    refNo: z.string().default(()=>"PO-"+Date.now()),
    supplier: z.string().optional().nullable(),
    items: z.array(z.object({
      productId: z.number().int(),
      qty: z.number().int().positive(),
      cost: z.number().nonnegative(),
    })).min(1),
  });
  const d = schema.parse(req.body);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const sub = d.items.reduce((a,i)=>a+i.qty*i.cost,0);
    const [res1]: any = await conn.query(
      "INSERT INTO purchases (ref_no,supplier,sub_total,total) VALUES (?,?,?,?)",
      [d.refNo, d.supplier ?? null, sub, sub]
    );
    const pid = res1.insertId;

    for (const it of d.items) {
      await conn.query(
        "INSERT INTO purchase_items (purchase_id,product_id,qty,cost,line_total) VALUES (?,?,?,?,?)",
        [pid, it.productId, it.qty, it.cost, it.qty*it.cost]
      );
      await conn.query("UPDATE products SET qty = qty + ?, cost=? WHERE id=?",
        [it.qty, it.cost, it.productId]);
    }
    await conn.commit();
    res.status(201).json({ ok: true, purchaseId: pid });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ ok:false, error: "purchase_failed" });
  } finally {
    conn.release();
  }
});

/* ---------- Sales (creates invoice, decrements stock) ---------- */
app.post("/api/sales", async (req, res) => {
  const schema = z.object({
    customer: z.object({ name: z.string().min(1), phone: z.string().optional() }),
    items: z.array(z.object({
      productId: z.number().int(),
      qty: z.number().int().positive(),
      price: z.number().nonnegative(),
    })).min(1),
    tax: z.number().nonnegative().default(0),
    discount: z.number().nonnegative().default(0),
  });
  const d = schema.parse(req.body);
  const invNo = nextInvoiceNo();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // ensure customer exists / insert quick
    const [cRes]: any = await conn.query("INSERT INTO customers (name,phone) VALUES (?,?)", [d.customer.name, d.customer.phone ?? null]);
    const customerId = cRes.insertId;

    // check stock
    for (const it of d.items) {
      const [rows]: any = await conn.query("SELECT qty FROM products WHERE id=?", [it.productId]);
      if (!rows.length || rows[0].qty < it.qty) throw new Error("INSUFFICIENT_STOCK");
    }

    const subTotal = d.items.reduce((a,i)=>a+i.qty*i.price,0);
    const total = subTotal + d.tax - d.discount;

    const [sRes]: any = await conn.query(
      "INSERT INTO sales (invoice_no, customer_id, sub_total, tax, discount, total) VALUES (?,?,?,?,?,?)",
      [invNo, customerId, subTotal, d.tax, d.discount, total]
    );
    const saleId = sRes.insertId;

    for (const it of d.items) {
      await conn.query(
        "INSERT INTO sale_items (sale_id, product_id, qty, price, line_total) VALUES (?,?,?,?,?)",
        [saleId, it.productId, it.qty, it.price, it.qty*it.price]
      );
      await conn.query("UPDATE products SET qty = qty - ? WHERE id=?", [it.qty, it.productId]);
    }

    await conn.commit();

    res.status(201).json({ ok:true, saleId, invoiceNo: invNo });

  } catch (e:any) {
    await conn.rollback();
    const code = e?.message === "INSUFFICIENT_STOCK" ? 400 : 500;
    res.status(code).json({ ok:false, error: e?.message ?? "sale_failed" });
  } finally {
    conn.release();
  }
});

// fetch invoice as HTML (ready to print)
app.get("/api/sales/:id/invoice", async (req, res) => {
  const saleId = Number(req.params.id);
  const [sRows]: any = await pool.query("SELECT * FROM sales WHERE id=?", [saleId]);
  if (!sRows.length) return res.status(404).send("Not found");
  const sale = sRows[0];

  const [cRows]: any = await pool.query("SELECT * FROM customers WHERE id=?", [sale.customer_id]);
  const customer = cRows[0];

  const [items]: any = await pool.query(
    `SELECT si.qty, si.price, si.line_total, p.name
     FROM sale_items si JOIN products p ON p.id=si.product_id
     WHERE si.sale_id=?`, [saleId]);

  const html = invoiceHtml({
    company: { name: "Aviha Group / Lenama", address: "Colombo, Sri Lanka", phone: "+94 70 000 0000" },
    invoice_no: sale.invoice_no,
    dateIso: new Date(sale.created_at).toISOString(),
    customer: { name: customer?.name ?? "Walk-in Customer", phone: customer?.phone ?? "" },
    items,
    sub_total: Number(sale.sub_total),
    tax: Number(sale.tax),
    discount: Number(sale.discount),
    total: Number(sale.total),
  });
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

/* ---------- Reports (optional) ---------- */
app.get("/api/reports/stock", async (_req, res) => {
  const [rows] = await pool.query("SELECT id,sku,name,qty,cost,price,(qty*cost) AS stock_value FROM products ORDER BY name");
  res.json(rows);
});

app.get("/api/health", (_req, res) => res.json({ ok:true }));

/* ---------- Start ---------- */
const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
