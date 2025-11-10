import { useEffect, useState } from "react";
import "./App.css";
import { productsApi } from "./api";
import { Dashboard } from "./components/Dashboard";
import { ProductsPage } from "./components/ProductsPage";
import { PurchasePage } from "./components/PurchasePage";
import { SalesPage } from "./components/SalesPage";
import { CustomersPage } from "./components/CustomersPage";
import { StockPage } from './components/StockPage';
import type { Product } from "./types";

export default function App() {
  const [tab, setTab] = useState<"dashboard" | "products" | "purchase" | "sales" | "customers" | "stock">("dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load products from backend
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const data = await productsApi.getAll();
        setProducts(data);
      } catch (err: any) {
        setError(err?.message ?? "Failed to load products");
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  if (error) {
    return <div className="container vstack card error">{error}</div>;
  }

  if (loading) {
    return <div className="container vstack card">Loading products...</div>;
  }

  return (
    <div className="container vstack">
      <header className="spread card">
        <div className="hstack" style={{ gap: 16 }}>
          <div className="tag">Lenama Stock Management</div>
          <nav className="hstack">
            <button className="btn ghost" onClick={() => setTab("dashboard")}>Dashboard</button>
            <button className="btn ghost" onClick={() => setTab("products")}>Products</button>
            <button className="btn ghost" onClick={() => setTab("purchase")}>Purchase (Stock-In)</button>
            <button className="btn ghost" onClick={() => setTab("sales")}>Sales / Invoice</button>
            <button className="btn ghost" onClick={() => setTab("customers")}>Customers</button>
            <button className="btn ghost" onClick={() => setTab("stock")}>Stock</button>
          </nav>
        </div>
      </header>

      {tab === "dashboard" && <Dashboard products={products} />}
      {tab === "products" && <ProductsPage products={products} setProducts={setProducts} />}
      {tab === "purchase" && <PurchasePage products={products} setProducts={setProducts} />}
      {tab === "sales" && <SalesPage products={products} setProducts={setProducts} />}
      {tab === "customers" && <CustomersPage />}
          {tab === "stock" && <StockPage products={products} />}
    </div>
  );
}


