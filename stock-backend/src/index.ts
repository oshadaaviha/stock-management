import express from "express";
import cors from "cors";
import 'dotenv/config';
import { pool } from "./db";
import { z } from "zod";
import { invoiceHtml, invoiceDotMatrixHtml, invoiceOverlayHtml, nextInvoiceNo } from "./utils";
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
    refNo: z.string().default(() => "PO-" + Date.now()),
    supplier: z.string().optional().nullable(),
    batch_number: z.string().min(1),
    items: z.array(z.object({
      productId: z.number().int(),
      mfg_date: z.string().min(1),
      exp_date: z.string().min(1),
      pack_size: z.string().min(1),
      price: z.number().nonnegative(),
      cost: z.number().nonnegative(),
      qty: z.number().int().positive(),
    })).min(1),
  });
  const d = schema.parse(req.body);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const sub = d.items.reduce((a, i) => a + i.qty * i.cost, 0);
    // Save batch_number in purchases table
    const [res1]: any = await conn.query(
      "INSERT INTO purchases (ref_no, supplier, batch_number, sub_total, total) VALUES (?,?,?,?,?)",
      [d.refNo, d.supplier ?? null, d.batch_number, sub, sub]
    );
    const pid = res1.insertId;

    for (const it of d.items) {
      await conn.query(
        "INSERT INTO purchase_items (purchase_id, product_id, mfg_date, exp_date, pack_size, price, cost, qty, line_total) VALUES (?,?,?,?,?,?,?,?,?)",
        [pid, it.productId, it.mfg_date, it.exp_date, it.pack_size, it.price, it.cost, it.qty, it.qty * it.cost]
      );
      await conn.query("UPDATE products SET qty = qty + ?, cost=?, price=? WHERE id=?",
        [it.qty, it.cost, it.price, it.productId]);
    }
    await conn.commit();
    res.status(201).json({ ok: true, purchaseId: pid });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ ok: false, error: "purchase_failed" });
  } finally {
    conn.release();
  }
});

/* ---------- Sales (creates invoice, decrements stock) ---------- */
app.post("/api/sales", async (req, res) => {
  const schema = z.object({
    customer: z.object({
      name: z.string().min(1),
      phone: z.string().optional(),
  customer_address: z.string().optional(),
      customer_vat: z.string().optional(),
      sales_rep_id: z.number().int().optional()
    }),
    items: z.array(z.object({
      sku: z.string(),
      qty: z.number().int().positive(), // number of packs being sold
      price: z.number().nonnegative(), // unit price (per 1 unit)
      discount: z.number().nonnegative().default(0), // unit discount
      packSize: z.string().optional(), // e.g. "10" or "6x10"
      batchNo: z.string().optional(), // item-level batch selection
    })).min(1),
    tax: z.number().nonnegative().default(0),
    discount: z.number().nonnegative().default(0),
    subTotal: z.number().nonnegative(),
    total: z.number().nonnegative(),
    invoiceDate: z.string().optional(),
    batchNo: z.string().optional(), // legacy / fallback
    paymentType: z.string().optional(),
    routeRepCode: z.string().optional(),
    salesRepName: z.string().optional(),
  });
  const d = schema.parse(req.body);
  const invNo = await nextInvoiceNo(d.invoiceDate);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Check if customer exists (by name and phone match)
    let customerId: number;
    const [existingCustomers]: any = await conn.query(
      "SELECT id FROM customers WHERE name=? AND is_system=TRUE LIMIT 1", 
      [d.customer.name]
    );
    
    if (existingCustomers.length > 0) {
      // Use existing system customer
      customerId = existingCustomers[0].id;
      // Optionally update address/vat/sales_rep_id if provided
      await conn.query(
        "UPDATE customers SET customer_address=?, customer_vat=?, sales_rep_id=? WHERE id=?",
        [d.customer.customer_address ?? null, d.customer.customer_vat ?? null, d.customer.sales_rep_id ?? null, customerId]
      );
    } else {
      // Create walk-in customer (mark as auto-created with is_system=FALSE)
      const [cRes]: any = await conn.query(
        "INSERT INTO customers (name, phone, customer_address, customer_vat, sales_rep_id, is_system) VALUES (?,?,?,?,?,?)", 
        [d.customer.name, d.customer.phone ?? null, d.customer.customer_address ?? null, d.customer.customer_vat ?? null, d.customer.sales_rep_id ?? null, false]
      );
      customerId = cRes.insertId;
    }

    // check stock and insert sales rows (one per product)
    for (const it of d.items) {
      // Units per pack (e.g. "6x10" => 60). Defaults to 1.
      const packUnits = (() => {
        const nums = (it.packSize || '').match(/\d+/g)?.map(Number);
        if (!nums || nums.length === 0) return 1;
        return nums.reduce((a,b)=>a*b,1);
      })();
      const unitsNeededTotal = it.qty * packUnits;
      let piUsed: { id: number, qty: number }[] = [];
      if (it.batchNo && it.batchNo.startsWith('PI#')) {
        // If a specific purchase_items row is selected, only check and decrement that row
        const piId = Number(it.batchNo.replace('PI#', ''));
        const [piRows]: any = await conn.query("SELECT id, qty FROM purchase_items WHERE id=?", [piId]);
        if (!piRows.length || piRows[0].qty < unitsNeededTotal) throw new Error("INSUFFICIENT_STOCK");
        piUsed.push({ id: piId, qty: unitsNeededTotal });
      } else {
        // Use purchase_items for stock validation and decrement (FIFO by expiry)
        const [piRows]: any = await conn.query(
          "SELECT id, qty, exp_date FROM purchase_items WHERE product_id = (SELECT id FROM products WHERE sku=?) AND qty > 0 ORDER BY exp_date ASC, id ASC",
          [it.sku]
        );
        let remaining = unitsNeededTotal;
        for (const pi of piRows) {
          if (remaining <= 0) break;
          const take = Math.min(pi.qty, remaining);
          if (take > 0) {
            piUsed.push({ id: pi.id, qty: take });
            remaining -= take;
          }
        }
        if (remaining > 0) throw new Error("INSUFFICIENT_STOCK");
      }

      // Decrement qty from each used purchase_items row
      for (const used of piUsed) {
        await conn.query("UPDATE purchase_items SET qty = qty - ? WHERE id = ?", [used.qty, used.id]);
      }

      // If batch specified and not a PI# row, also decrement stock_batches
      if (it.batchNo && !it.batchNo.startsWith('PI#')) {
        const [batchRows]: any = await conn.query(
          "SELECT id, quantity FROM stock_batches WHERE batch_number=? AND product_id=(SELECT id FROM products WHERE sku=?) LIMIT 1",
          [it.batchNo, it.sku]
        );
        if (!batchRows.length || batchRows[0].quantity < unitsNeededTotal) throw new Error("INSUFFICIENT_BATCH_STOCK");
        await conn.query(
          "UPDATE stock_batches SET quantity = quantity - ? WHERE id=?",
          [unitsNeededTotal, batchRows[0].id]
        );
      }

      // Insert sales row
      const [prodRows]: any = await conn.query("SELECT id, name FROM products WHERE sku=?", [it.sku]);
      const productName = prodRows.length ? prodRows[0].name : it.sku;
      const lineTotal = (it.qty * packUnits) * (it.price - it.discount);
      await conn.query(
        `INSERT INTO sales (invoice_no, invoice_date, customer_id, sales_rep_id, payment_type, batch_no, route_rep_code, sales_rep_name, customer_address, customer_vat, sku, name, pack_size, qty, price, sub_total, tax, discount, total) 
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          invNo,
          d.invoiceDate || new Date().toISOString().split('T')[0],
          customerId,
          d.customer.sales_rep_id ?? null,
          d.paymentType || null,
          d.batchNo || it.batchNo || null,
          d.routeRepCode || null,
          d.salesRepName || null,
          d.customer.customer_address ?? null,
          d.customer.customer_vat ?? null,
          it.sku,
          productName,
          it.packSize || '',
          it.qty,
          it.price,
          lineTotal,
          d.tax,
          it.discount,
          lineTotal
        ]
      );
      // Update product aggregate stock
      await conn.query("UPDATE products SET qty = qty - ? WHERE sku= ?", [unitsNeededTotal, it.sku]);
    }

    await conn.commit();
    res.status(201).json({ ok:true, saleId: customerId, invoiceNo: invNo });

  } catch (e:any) {
    await conn.rollback();
    const code = ["INSUFFICIENT_STOCK", "INSUFFICIENT_BATCH_STOCK"].includes(e?.message) ? 400 : 500;
    res.status(code).json({ ok:false, error: e?.message ?? "sale_failed" });
  } finally {
    conn.release();
  }
});

// Get all sales (grouped by invoice)
app.get("/api/sales", async (_req, res) => {
  try {
    const [rows]: any = await pool.query(`
      SELECT 
        s.invoice_no,
        s.invoice_date,
        c.name as customer_name,
        c.phone as customer_phone,
        s.payment_type,
        s.batch_no,
        COUNT(DISTINCT s.sku) as item_count,
        SUM(s.sub_total) as sub_total,
        SUM(s.tax) as tax,
        SUM(s.discount) as discount,
        SUM(s.total) as total
      FROM sales s
      LEFT JOIN customers c ON c.id = s.customer_id
      GROUP BY s.invoice_no, s.invoice_date, c.name, c.phone, s.payment_type, s.batch_no
      ORDER BY s.invoice_date DESC, s.invoice_no DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Sales list error:", err);
    res.status(500).json({ ok: false, error: "sales_fetch_failed" });
  }
});

// fetch invoice as HTML (ready to print)
app.get("/api/sales/:id/invoice", async (req, res) => {
  const invoiceNo = req.params.id;
  const format = (req.query.format || req.query.mode || '').toString().toLowerCase();
  const offsetX = req.query.offsetX ? Number(req.query.offsetX) : undefined;
  const offsetY = req.query.offsetY ? Number(req.query.offsetY) : undefined;
  const scale = req.query.scale ? Number(req.query.scale) : undefined;
  const bg = req.query.showBg === '1' || req.query.showBg === 'true';
  const bgUrl = typeof req.query.bgUrl === 'string' ? req.query.bgUrl : undefined;
  // fine tuning
  const leftValueX = req.query.leftValueX ? Number(req.query.leftValueX) : undefined;
  const rightValueX = req.query.rightValueX ? Number(req.query.rightValueX) : undefined;
  const descX = req.query.descX ? Number(req.query.descX) : undefined;
  const packX = req.query.packX ? Number(req.query.packX) : undefined;
  const qtyX = req.query.qtyX ? Number(req.query.qtyX) : undefined;
  const priceX = req.query.priceX ? Number(req.query.priceX) : undefined;
  const discX = req.query.discX ? Number(req.query.discX) : undefined;
  const valueX = req.query.valueX ? Number(req.query.valueX) : undefined;
  const tableStartY = req.query.tableStartY ? Number(req.query.tableStartY) : undefined;
  const rowHeight = req.query.rowHeight ? Number(req.query.rowHeight) : undefined;
  const totalsX = req.query.totalsX ? Number(req.query.totalsX) : undefined;
  const totalsTopY = req.query.totalsTopY ? Number(req.query.totalsTopY) : undefined;
  const fontSizePt = req.query.fontSize ? Number(req.query.fontSize) : undefined;
  const lineHeight = req.query.lineHeight ? Number(req.query.lineHeight) : undefined;
  const finalDiscount = req.query.finalDiscount ? Number(req.query.finalDiscount) : 0;
  
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
    line_total: row.qty * row.price  // Gross line value (before discount)
  }));

  const itemDiscountTotal = items.reduce((sum: number, item: any) => sum + (item.qty * item.discount), 0);
  const grossTotal = items.reduce((sum: number, item: any) => sum + item.line_total, 0);
  const grossAfterItemDiscounts = grossTotal - itemDiscountTotal;  // Gross value shown on invoice (after item discounts)
  const subTotal = grossAfterItemDiscounts - finalDiscount;  // Net after final bill discount

  // Generate customer code
  const customerCode = customer ? `CUST-${customer.id.toString().padStart(4, '0')}` : '';

  // Choose template based on format param
  const html = format === 'dot'
    ? invoiceDotMatrixHtml({
        invoice_no: firstRow.invoice_no,
        dateIso: new Date(firstRow.invoice_date || firstRow.created_at).toISOString(),
        customer: {
          code: customerCode,
          name: customer?.name ?? "Walk-in Customer",
          phone: customer?.phone ?? "",
          vat: customer?.customer_vat ?? "",
          address: customer?.customer_address ?? "",
          salesRep: firstRow.sales_rep_name ?? ""
        },
        items,
        sub_total: grossAfterItemDiscounts,
        tax: Number(firstRow.tax) || 0,
        discount: finalDiscount,
        total: subTotal + (Number(firstRow.tax) || 0),
        batchNo: firstRow.batch_no ?? "",
        paymentType: firstRow.payment_type ?? "",
        routeRepCode: firstRow.route_rep_code ?? "",
        offsetX, offsetY, fontSizePt, lineHeight
      })
    : format === 'overlay'
    ? invoiceOverlayHtml({
        invoice_no: firstRow.invoice_no,
        dateIso: new Date(firstRow.invoice_date || firstRow.created_at).toISOString(),
        customer: {
          code: customerCode,
          name: customer?.name ?? "Walk-in Customer",
          phone: customer?.phone ?? "",
          vat: customer?.customer_vat ?? "",
          address: customer?.customer_address ?? "",
          salesRep: firstRow.sales_rep_name ?? ""
        },
        items,
        sub_total: grossAfterItemDiscounts,
        tax: Number(firstRow.tax) || 0,
        discount: finalDiscount,
        total: subTotal + (Number(firstRow.tax) || 0),
        batchNo: firstRow.batch_no ?? "",
        paymentType: firstRow.payment_type ?? "",
        routeRepCode: firstRow.route_rep_code ?? "",
        offsetX, offsetY, scale, showBg: bg, bgUrl,
        leftValueX, rightValueX, descX, packX, qtyX, priceX, discX, valueX,
        tableStartY, rowHeight, totalsX, totalsTopY
      })
    : invoiceHtml({
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
      address: customer?.customer_address ?? "",
      salesRep: firstRow.sales_rep_name ?? ""
    },
    items,
    sub_total: grossAfterItemDiscounts,
    tax: Number(firstRow.tax) || 0,
    discount: finalDiscount,
    total: subTotal + (Number(firstRow.tax) || 0),
    batchNo: firstRow.batch_no ?? "",
    paymentType: firstRow.payment_type || "",
    routeRepCode: firstRow.route_rep_code ?? ""
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
  const [rows] = await pool.query("SELECT * FROM customers ORDER BY created_at DESC");
  res.json(rows);
});

// create
app.post("/api/customers", async (req, res) => {
  const schema = z.object({ 
    name: z.string().min(1), 
    phone: z.string().optional().nullable(), 
    email: z.string().optional().nullable(),
    customer_address: z.string().optional().nullable(),
    customer_vat: z.string().optional().nullable(),
    route: z.string().optional().nullable(),
    sales_rep_id: z.number().optional().nullable()
  });
  const d = schema.parse(req.body);
  const [r]: any = await pool.query(
    "INSERT INTO customers (name, phone, email, customer_address, customer_vat, route, sales_rep_id, is_system) VALUES (?,?,?,?,?,?,?,?)", 
    [d.name, d.phone ?? null, d.email ?? null, d.customer_address ?? null, d.customer_vat ?? null, d.route ?? null, d.sales_rep_id ?? null, true]
  );
  res.status(201).json({ ok: true, id: r.insertId, ...d, is_system: true });
});

// update
app.put("/api/customers/:id", async (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({ 
    name: z.string().min(1), 
    phone: z.string().optional().nullable(), 
    email: z.string().optional().nullable(),
    customer_address: z.string().optional().nullable(),
    customer_vat: z.string().optional().nullable(),
    route: z.string().optional().nullable(),
    sales_rep_id: z.number().optional().nullable()
  });
  const d = schema.parse(req.body);
  await pool.query(
    "UPDATE customers SET name=?, phone=?, email=?, customer_address=?, customer_vat=?, route=?, sales_rep_id=? WHERE id=?", 
    [d.name, d.phone ?? null, d.email ?? null, d.customer_address ?? null, d.customer_vat ?? null, d.route ?? null, d.sales_rep_id ?? null, id]
  );
  res.json({ ok: true });
});

// delete
app.delete("/api/customers/:id", async (req, res) => {
  await pool.query("DELETE FROM customers WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

/* ---------- Suppliers ---------- */
app.get("/api/suppliers", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name, phone, email, address, created_at FROM suppliers ORDER BY name ASC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "supplier_fetch_failed" });
  }
});

app.post("/api/suppliers", async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    phone: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
  });
  const d = schema.parse(req.body);
  try {
    const [result]: any = await pool.query(
      "INSERT INTO suppliers (name, phone, email, address) VALUES (?, ?, ?, ?)",

      [d.name, d.phone ?? null, d.email ?? null, d.address ?? null]
    );
    const [rows]: any = await pool.query("SELECT * FROM suppliers WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "supplier_create_failed" });
  }
});

app.put("/api/suppliers/:id", async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).optional(),
    phone: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
  });
  const d = schema.parse(req.body);
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "invalid_id" });
  try {
    await pool.query(
      "UPDATE suppliers SET name = COALESCE(?, name), phone = COALESCE(?, phone), email = COALESCE(?, email), address = COALESCE(?, address) WHERE id = ?",
      [d.name ?? null, d.phone ?? null, d.email ?? null, d.address ?? null, id]
    );
    const [rows]: any = await pool.query("SELECT * FROM suppliers WHERE id = ?", [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "supplier_update_failed" });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok:true }));

/* ---------- Start ---------- */
const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
