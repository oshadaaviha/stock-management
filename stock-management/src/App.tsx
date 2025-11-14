import { useEffect, useState } from "react";
import "./App.css";
import { productsApi } from "./api";
import { Dashboard } from "./components/Dashboard";
import { ProductsPage } from "./components/ProductsPage";
import { PurchasePage } from "./components/PurchasePage";
import { SalesPage } from "./components/SalesPage";
import { SalesReferencePage } from "./components/SalesReferencePage";
import { CustomersPage } from "./components/CustomersPage";
import { StockPage } from './components/StockPage';
import { SuppliersPage } from './components/SuppliersPage';
import { UsersPage } from './components/UsersPage';
import { LoginPage } from './components/LoginPage';
import { useAuth } from './AuthContext';
import type { Product } from "./types";
import logo from './logo.png';

export default function App() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const [tab, setTab] = useState<"dashboard" | "products" | "purchase" | "sales" | "salesRef" | "customers" | "stock" | "suppliers" | "users">("dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load products from backend
  useEffect(() => {
    if (!user) return; // Don't load products if not logged in
    
    // Reporter doesn't need products loaded
    if (user.role === 'Reporter') {
      setLoading(false);
      return;
    }
    
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
  }, [user]);

  // Role-based default tab
  useEffect(() => {
    if (user && user.role === 'Reporter') {
      setTab('stock');
    }
  }, [user]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="app-container">
        <div className="container vstack card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔄</div>
            <div>Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage />;
  }

  if (error) {
    return (
      <div className="app-container">
        <div className="container vstack card error">{error}</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app-container">
        <div className="container vstack card">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="hstack" style={{ gap: 16, flex: 1, minWidth: 0 }}>
          <div className="hstack" style={{ gap: 12, alignItems: 'center' }}>
            <div className="logo-container">
              <img 
                src={logo} 
                alt="Lenama Healthcare Logo" 
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div className="logo-fallback" style={{ display: 'none' }}>
                <div className="logo-icon">🏥</div>
              </div>
            </div>
            <div className="brand-text">
              <div className="brand-name">LENAMA</div>
              <div className="brand-subtitle">Stock Management</div>
            </div>
          </div>
          <nav className="hstack" style={{ flex: 1, flexWrap: 'wrap', gap: 8 }}>
            {(user.role === 'Finance' || user.role === 'Admin') && (
              <>
                <button className="btn ghost" onClick={() => setTab("dashboard")}>Dashboard</button>
                <button className="btn ghost" onClick={() => setTab("products")}>Products</button>
                <button className="btn ghost" onClick={() => setTab("purchase")}>Purchase</button>
                <button className="btn ghost" onClick={() => setTab("sales")}>Sales</button>
                <button className="btn ghost" onClick={() => setTab("salesRef")}>References</button>
                <button className="btn ghost" onClick={() => setTab("customers")}>Customers</button>
                <button className="btn ghost" onClick={() => setTab("suppliers")}>Suppliers</button>
                <button className="btn ghost" onClick={() => setTab("stock")}>Stock</button>
                {user.role === 'Admin' && (
                  <button className="btn ghost" onClick={() => setTab("users")} style={{ borderLeft: '2px solid #e2e8f0', marginLeft: '8px', paddingLeft: '16px' }}>Users</button>
                )}
              </>
            )}
            {user.role === 'Reporter' && (
              <button className="btn ghost" onClick={() => setTab("stock")}>Stock</button>
            )}
          </nav>
        </div>
        <div className="hstack" style={{ gap: 16, alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: '#666' }}>
            {user.name} ({user.role})
          </span>
          <button className="btn ghost" onClick={logout} style={{ color: '#c33' }}>
            Logout
          </button>
        </div>
      </header>

      <main className="app-content">
        {(user.role === 'Finance' || user.role === 'Admin') && (
          <>
            {tab === "dashboard" && <Dashboard products={products} />}
            {tab === "products" && <ProductsPage products={products} setProducts={setProducts} />}
            {tab === "purchase" && <PurchasePage products={products} setProducts={setProducts} />}
            {tab === "sales" && <SalesPage products={products} setProducts={setProducts} />}
            {tab === "salesRef" && <SalesReferencePage />}
            {tab === "customers" && <CustomersPage />}
            {tab === "suppliers" && <SuppliersPage />}
            {tab === "stock" && <StockPage />}
            {tab === "users" && user.role === 'Admin' && <UsersPage />}
          </>
        )}
      
        {user.role === 'Reporter' && tab === "stock" && <StockPage />}
      </main>
    </div>
  );
}
