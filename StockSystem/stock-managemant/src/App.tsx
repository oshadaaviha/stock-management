import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

/** ---------- Types ---------- */
export type Product = {
  id: string; // SKU-like id
  name: string;
  category?: string;
  cost: number;
  price: number;
  qty: number;
  status: "Active" | "Inactive";
};

type CartItem = { sku: string; name: string; price: number; qty: number };
type Invoice = {
  invoiceNo: string;
  dateIso: string;
  customer: { name: string; phone?: string };
  items: CartItem[];
  subTotal: number;
  tax: number;
  discount: number;
  total: number;
  company: { name: string; address: string; phone?: string; logoUrl?: string };
};

/** ---------- Storage Helpers ---------- */
const LS_PRODUCTS = "sms_products_v1";
const LS_INVOICE_COUNTER = "sms_invoice_counter";

function loadProducts(): Product[] {
  try {
    const raw = localStorage.getItem(LS_PRODUCTS);
    return raw ? (JSON.parse(raw) as Product[]) : [];
  } catch {
    return [];
  }
}
function saveProducts(list: Product[]) {
  localStorage.setItem(LS_PRODUCTS, JSON.stringify(list));
}
function nextInvoiceNo(): string {
  const today = new Date();
  const ymd =
    today.getFullYear().toString().slice(-2) +
    String(today.getMonth() + 1).padStart(2, "0") +
    String(today.getDate()).padStart(2, "0");
  const n = Number(localStorage.getItem(LS_INVOICE_COUNTER) ?? "0") + 1;
  localStorage.setItem(LS_INVOICE_COUNTER, String(n));
  return `INV-${ymd}-${String(n).padStart(4, "0")}`;
}

/** ---------- Utilities ---------- */
const money = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const uid = () =>
  "SKU-" +
  Math.random().toString(36).slice(2, 6).toUpperCase() +
  "-" +
  Date.now().toString().slice(-4);

/** ---------- App (multi-page) ---------- */
export default function App() {
  const [tab, setTab] = useState<"dashboard" | "products" | "purchase" | "sales">("dashboard");
  const [products, setProducts] = useState<Product[]>(() => loadProducts());

  useEffect(() => saveProducts(products), [products]);

  // Seed sample products
  useEffect(() => {
    if (products.length === 0) {
      setProducts([
        { id: "SKU-ESP-0001", name: "Espresso Beans 1kg", category: "Coffee", cost: 2500, price: 3600, qty: 20, status: "Active" },
        { id: "SKU-MILK-500", name: "UHT Milk 500ml", category: "Dairy", cost: 180, price: 260, qty: 80, status: "Active" },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container vstack">
      <header className="spread card">
        <div className="hstack" style={{ gap: 16 }}>
          <div className="tag">Stock Management (React + TS)</div>
          <nav className="hstack">
            <button className="btn ghost" onClick={() => setTab("dashboard")}>Dashboard</button>
            <button className="btn ghost" onClick={() => setTab("products")}>Products</button>
            <button className="btn ghost" onClick={() => setTab("purchase")}>Purchase (Stock-In)</button>
            <button className="btn ghost" onClick={() => setTab("sales")}>Sales / Invoice</button>
          </nav>
        </div>
        <div className="badge">LocalStorage • No backend</div>
      </header>

      {tab === "dashboard" && <Dashboard products={products} />}
      {tab === "products" && <ProductsPage products={products} setProducts={setProducts} />}
      {tab === "purchase" && <PurchasePage products={products} setProducts={setProducts} />}
      {tab === "sales" && <SalesPage products={products} setProducts={setProducts} />}
    </div>
  );
}

/** ---------- Dashboard ---------- */
function Dashboard({ products }: { products: Product[] }) {
  const totalSkus = products.length;
  const totalQty = products.reduce((a, p) => a + p.qty, 0);
  const stockValue = products.reduce((a, p) => a + p.qty * p.cost, 0);

  return (
    <section className="card vstack">
      <h2>Overview</h2>
      <div className="hstack" style={{ gap: 16, flexWrap: "wrap" }}>
        <Stat title="SKUs" value={String(totalSkus)} />
        <Stat title="Total Quantity" value={String(totalQty)} />
        <Stat title="Stock Value (Cost)" value={`Rs. ${money(stockValue)}`} />
      </div>
      <small className="muted">Tip: use the Products tab to manage items, Purchase to add stock, and Sales to create & print invoices.</small>
    </section>
  );
}
function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="card vstack" style={{ minWidth: 220 }}>
      <div className="badge">{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

/** ---------- Products CRUD ---------- */
function ProductsPage({ products, setProducts, }: { products: Product[]; setProducts: (p: Product[]) => void; }) {
  const blank: Product = { id: uid(), name: "", category: "", cost: 0, price: 0, qty: 0, status: "Active" };
  const [form, setForm] = useState<Product>(blank);
  const [editing, setEditing] = useState(false);
  const [q, setQ] = useState("");

  function reset() {
    setForm({ ...blank, id: uid() });
    setEditing(false);
  }

  function save() {
    if (!form.name.trim()) return alert("Product name is required");
    if (editing) {
      setProducts(products.map((p) => (p.id === form.id ? form : p)));
    } else {
      setProducts([form, ...products]);
    }
    reset();
  }

  function edit(p: Product) {
    setForm(p);
    setEditing(true);
  }

  function remove(id: string) {
    if (!confirm("Delete product?")) return;
    setProducts(products.filter((p) => p.id !== id));
  }

  const filtered = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.id.toLowerCase().includes(q.toLowerCase()));

  return (
    <section className="card vstack">
      <h2>Products</h2>
      <div className="hstack" style={{ gap: 12 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or SKU" />
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={() => { reset(); setEditing(false); }}>New Product</button>
      </div>

      <div className="hstack" style={{ gap: 20, marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Qty</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td>Rs. {money(p.price)}</td>
                  <td>{p.qty}</td>
                  <td>
                    <button className="btn ghost" onClick={() => edit(p)}>Edit</button>
                    <button className="btn danger" onClick={() => remove(p.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6}>No products</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ width: 360 }}>
          <div className="card vstack">
            <h3>{editing ? "Edit Product" : "New Product"}</h3>
            <label>SKU</label>
            <input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} />
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <label>Category</label>
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <label>Cost</label>
            <input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} />
            <label>Price</label>
            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            <label>Qty</label>
            <input type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })} />
            <div className="hstack" style={{ gap: 8 }}>
              <button className="btn primary" onClick={save}>{editing ? "Save" : "Add"}</button>
              <button className="btn" onClick={reset}>Reset</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** ---------- Purchase (stock-in) ---------- */
function PurchasePage({ products, setProducts }: { products: Product[]; setProducts: (p: Product[]) => void }) {
  const [sku, setSku] = useState("");
  const [amount, setAmount] = useState(0);

  function receive() {
    const idx = products.findIndex((p) => p.id === sku);
    if (idx === -1) return alert("SKU not found");
    const copy = [...products];
    copy[idx] = { ...copy[idx], qty: copy[idx].qty + amount };
    setProducts(copy);
    setSku("");
    setAmount(0);
  }

  return (
    <section className="card vstack">
      <h2>Purchase / Stock In</h2>
      <div className="hstack">
        <input placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
        <input type="number" placeholder="Quantity" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        <button className="btn primary" onClick={receive}>Receive</button>
      </div>
    </section>
  );
}

/** ---------- Sales / Invoice ---------- */
function SalesPage({ products, setProducts }: { products: Product[]; setProducts: (p: Product[]) => void }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sku, setSku] = useState("");
  const [qty, setQty] = useState(1);
  const invoiceNo = useRef(nextInvoiceNo());

  function addToCart() {
    const p = products.find((x) => x.id === sku);
    if (!p) return alert("Product not found");
    setCart((c) => {
      const existing = c.find((i) => i.sku === sku);
      if (existing) {
        return c.map((i) => (i.sku === sku ? { ...i, qty: i.qty + qty } : i));
      }
      return [...c, { sku: p.id, name: p.name, price: p.price, qty }];
    });
    setSku("");
    setQty(1);
  }

  function checkout() {
    if (cart.length === 0) return alert("Cart is empty");
    // reduce stock
    const copy = products.map((p) => {
      const item = cart.find((c) => c.sku === p.id);
      if (item) return { ...p, qty: p.qty - item.qty };
      return p;
    });
    setProducts(copy);
    // create invoice (here we just show and clear)
    const total = cart.reduce((s, i) => s + i.qty * i.price, 0);
    const inv: Invoice = {
      invoiceNo: invoiceNo.current,
      dateIso: new Date().toISOString(),
      customer: { name: "Walk-in Customer" },
      items: cart,
      subTotal: total,
      tax: 0,
      discount: 0,
      total,
      company: { name: "My Shop", address: "Address" },
    };
    alert(`Invoice ${inv.invoiceNo} created — total Rs. ${money(inv.total)}`);
    setCart([]);
    invoiceNo.current = nextInvoiceNo();
  }

  return (
    <section className="card vstack">
      <h2>Sales / Invoice</h2>
      <div className="hstack">
        <input placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
        <input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
        <button className="btn" onClick={addToCart}>Add</button>
        <div style={{ flex: 1 }} />
        <button className="btn primary" onClick={checkout}>Checkout</button>
      </div>

      <div style={{ marginTop: 12 }}>
        <h4>Cart</h4>
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Qty</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {cart.map((c) => (
              <tr key={c.sku}>
                <td>{c.sku}</td>
                <td>{c.name}</td>
                <td>{c.qty}</td>
                <td>Rs. {money(c.price)}</td>
              </tr>
            ))}
            {cart.length === 0 && (
              <tr>
                <td colSpan={4}>Cart is empty</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
