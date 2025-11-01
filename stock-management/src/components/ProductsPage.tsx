import { useState } from 'react';
import type { Product } from '../types';
import { generateSku, money } from '../utils';
import { productsApi } from '../api';

export function ProductsPage({ products, setProducts }: { products: Product[]; setProducts: (p: Product[]) => void; }) {
  const blank: Product = { 
    id: 0,  // Backend will assign real ID
    sku: generateSku(),
    name: "",
    category: "",
    cost: 0,
    price: 0,
    qty: 0,
    status: "Active"
  };
  const [form, setForm] = useState<Product>(blank);
  const [editing, setEditing] = useState(false);
  const [q, setQ] = useState("");

  function reset() {
    setForm({ ...blank, sku: generateSku() });
    setEditing(false);
  }

  async function save() {
    if (!form.name.trim()) return alert("Product name is required");
    try {
      if (editing) {
        await productsApi.update(form.id, form);
        setProducts(products.map((p) => (p.id === form.id ? form : p)));
      } else {
        const created = await productsApi.create(form);
        setProducts([created, ...products]);
      }
      reset();
    } catch (err: any) {
      alert("Failed to save: " + (err?.message ?? "Unknown error"));
    }
  }

  function edit(p: Product) {
    setForm(p);
    setEditing(true);
  }

  async function remove(id: number) {
    if (!confirm("Delete product?")) return;
    try {
      await productsApi.remove(id);
      setProducts(products.filter((p) => p.id !== id));
    } catch (err: any) {
      alert("Failed to delete: " + (err?.message ?? "Unknown error"));
    }
  }

  // Filter products based on search query
  const filtered = products.filter((p) => {
    if (!q.trim()) return true; // Show all when no search query
    
    const searchTerm = q.trim().toLowerCase();
    const nameMatch = p.name?.toLowerCase().includes(searchTerm);
    const skuMatch = p.sku?.toLowerCase().includes(searchTerm);
    const categoryMatch = p.category?.toLowerCase().includes(searchTerm);
    
    return nameMatch || skuMatch || categoryMatch;
  });

  return (
    <section className="card vstack">
      <h2>Products</h2>
      <div className="hstack" style={{ gap: 12 }}>
        <div className="search-box" style={{ flex: 1 }}>
          <input 
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
            placeholder="Search by name, SKU or category..." 
            className="input"
            style={{ maxWidth: '300px' }}
          />
          {q.trim() && (
            <small style={{ color: 'var(--text-secondary)' }}>
              Showing {filtered.length} of {products.length} products
            </small>
          )}
        </div>
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
                  <td>{p.sku}</td>
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
            <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} disabled={editing} />
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <label>Category</label>
            <input value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value || null })} />
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