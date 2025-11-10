import express from "express";
import cors from "cors";
import 'dotenv/config';
import { pool } from "./db";
import { z } from "zod";
import { invoiceHtml, nextInvoiceNo } from "./utils";
import productsRouter from "./routes/products";
import stockRouter from "./routes/stock";

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? true }));

/* ---------- Products (router) ---------- */
app.use("/api/products", productsRouter);

/* ---------- Stock (router) ---------- */
app.use("/api/stock", stockRouter);

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
      sku: z.string(),
      qty: z.number().int().positive(),
      price: z.number().nonnegative(),
      discount: z.number().nonnegative().default(0),
    })).min(1),
    tax: z.number().nonnegative().default(0),
    discount: z.number().nonnegative().default(0),
    subTotal: z.number().nonnegative(),
    total: z.number().nonnegative(),
  });
  const d = schema.parse(req.body);
  const invNo = nextInvoiceNo();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // ensure customer exists / insert quick
    const [cRes]: any = await conn.query("INSERT INTO customers (name,phone) VALUES (?,?)", [d.customer.name, d.customer.phone ?? null]);
    const customerId = cRes.insertId;

    // check stock and insert sales rows (one per product)
    for (const it of d.items) {
      const [prodRows]: any = await conn.query("SELECT name, qty FROM products WHERE sku=?", [it.sku]);
      if (!prodRows.length || prodRows[0].qty < it.qty) throw new Error("INSUFFICIENT_STOCK");
      
      const productName = prodRows[0].name;
      const lineTotal = it.qty * (it.price - it.discount);
      
      // Insert one sales row per product
      await conn.query(
        `INSERT INTO sales (invoice_no, customer_id, sku, name, pack_size, qty, price, sub_total, tax, discount, total) 
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [invNo, customerId, it.sku, productName, '', it.qty, it.price, lineTotal, d.tax, it.discount, lineTotal]
      );
      
      // Update product stock
      await conn.query("UPDATE products SET qty = qty - ? WHERE sku=?", [it.qty, it.sku]);
    }

    await conn.commit();
    res.status(201).json({ ok:true, saleId: customerId, invoiceNo: invNo });

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
  const invoiceNo = req.params.id;
  
  // Get all sales rows for this invoice (flat table structure)
  const [sRows]: any = await pool.query("SELECT * FROM sales WHERE invoice_no=?", [invoiceNo]);
  if (!sRows.length) return res.status(404).send("Not found");
  
  const firstRow = sRows[0];
  const [cRows]: any = await pool.query("SELECT * FROM customers WHERE id=?", [firstRow.customer_id]);
  const customer = cRows[0];

  // Format items from sales rows
  const items = sRows.map((row: any) => ({
    name: row.name,
    pack_size: row.pack_size || '',
    qty: row.qty,
    price: row.price,
    discount: row.discount || 0,
    line_total: row.qty * (row.price - (row.discount || 0))
  }));

  const subTotal = items.reduce((sum: number, item: any) => sum + item.line_total, 0);
  const totalDiscount = items.reduce((sum: number, item: any) => sum + (item.qty * item.discount), 0);

  const html = invoiceHtml({
    company: { 
      name: "Lenama Healthcare (Pvt) Ltd", 
      address: "15 B 1/2, Alfred Place, Colombo 03", 
      phone: "+94 11 45 88 355" 
    },
    invoice_no: firstRow.invoice_no,
    dateIso: new Date(firstRow.invoice_date || firstRow.created_at).toISOString(),
    customer: { 
      name: customer?.name ?? "Walk-in Customer", 
      phone: customer?.phone ?? "",
      vat: customer?.customer_vat ?? "",
      address: "",
      salesRep: ""
    },
    items,
    sub_total: subTotal,
    tax: Number(firstRow.tax) || 0,
    discount: totalDiscount,
    total: subTotal + (Number(firstRow.tax) || 0) - totalDiscount,
    batchNo: "",
    paymentType: firstRow.payment_type || "",
    routeRepCode: ""
  });
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

/* ---------- Reports (optional) ---------- */
app.get("/api/reports/stock", async (_req, res) => {
  const [rows] = await pool.query("SELECT id,sku,name,qty,cost,price,(qty*cost) AS stock_value FROM products ORDER BY name");
  res.json(rows);
});

/* ---------- Customers ---------- */
// list
app.get("/api/customers", async (_req, res) => {
  const [rows] = await pool.query("SELECT * FROM customers ORDER BY id DESC");
  res.json(rows);
});

// create
app.post("/api/customers", async (req, res) => {
  const schema = z.object({ name: z.string().min(1), phone: z.string().optional().nullable(), email: z.string().optional().nullable() });
  const d = schema.parse(req.body);
  const [r]: any = await pool.query("INSERT INTO customers (name,phone,email) VALUES (?,?,?)", [d.name, d.phone ?? null, d.email ?? null]);
  res.status(201).json({ ok: true, id: r.insertId, ...d });
});

// update
app.put("/api/customers/:id", async (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({ name: z.string().min(1), phone: z.string().optional().nullable(), email: z.string().optional().nullable() });
  const d = schema.parse(req.body);
  await pool.query("UPDATE customers SET name=?, phone=?, email=? WHERE id=?", [d.name, d.phone ?? null, d.email ?? null, id]);
  res.json({ ok: true });
});

// delete
app.delete("/api/customers/:id", async (req, res) => {
  await pool.query("DELETE FROM customers WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

app.get("/api/health", (_req, res) => res.json({ ok:true }));

/* ---------- Start ---------- */
const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
