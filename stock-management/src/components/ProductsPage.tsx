import { useState, useRef, useEffect } from 'react';
import type { Product } from '../types';
import { generateSku} from '../utils';
import { productsApi } from '../api';

export function ProductsPage({ products, setProducts }: { products: Product[]; setProducts: (p: Product[]) => void; }) {
  const blank: Product = { 
    id: 0,  // Backend will assign real ID
    sku: generateSku(),
    name: "",
    generic_name: "",
    brand_name: "",
    strength: "",
    category: "",
    cost: 0,
    price: 0,
    discount: 0,
    qty: 0,
    status: "Active"
  };
  const [form, setForm] = useState<Product>(blank);
  const [editing, setEditing] = useState(false);
  const [q, setQ] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

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
    const genericMatch = p.generic_name?.toLowerCase().includes(searchTerm);
    const brandMatch = p.brand_name?.toLowerCase().includes(searchTerm);
    const strengthMatch = p.strength?.toLowerCase().includes(searchTerm);
    
    return nameMatch || skuMatch || categoryMatch || genericMatch || brandMatch || strengthMatch;
  });

  return (
    <section className="container-fluid py-3">
      <div className="row mb-3">
        <div className="col">
          <h2>Products Management</h2>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row">
            <div className="col" ref={containerRef}>
              <div className="position-relative">
                <input 
                  value={q} 
                  onChange={(e) => { setQ(e.target.value); setShowDropdown(true); }} 
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search by name, SKU, generic name, or brand..." 
                  className="form-control"
                  style={{ maxWidth: '400px' }}
                />
                {showDropdown && q.trim() && (
                  <div className="position-absolute start-0 w-100 mt-1" style={{ zIndex: 1000 }}>
                    <div className="card">
                      <div className="list-group list-group-flush">
                        {filtered.slice(0, 8).map((p) => (
                          <button 
                            key={p.id} 
                            className="list-group-item list-group-item-action" 
                            onClick={() => { setQ(p.name); setShowDropdown(false); }}
                          >
                            <div className="fw-bold">{p.name}</div>
                            <small className="text-muted">
                              {p.sku} • {p.generic_name} • {p.brand_name} • {p.category}
                            </small>
                          </button>
                        ))}
                        {filtered.length === 0 && (
                          <div className="list-group-item text-muted">No results found</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {q.trim() && (
                <small className="text-muted">
                  Showing {filtered.length} of {products.length} products
                </small>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Product Form */}
      <div className="card mb-4">
        <div className="card-body">
          <h3 className="card-title mb-4">{editing ? "Edit Product" : "New Product"}</h3>
          <div className="row g-3">
            <div className="col-md-3">
              <div className="form-group">
                <label className="form-label">Product ID</label>
                <input 
                  className="form-control" 
                  value={form.sku} 
                  onChange={(e) => setForm({ ...form, sku: e.target.value })} 
                  disabled={editing}
                />
              </div>
            </div>
            <div className="col-md-3">
              <div className="form-group">
                <label className="form-label">Product Name</label>
                <input 
                  className="form-control" 
                  value={form.name} 
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>
            <div className="col-md-3">
              <div className="form-group">
                <label className="form-label">Generic Name</label>
                <input 
                  className="form-control" 
                  value={form.generic_name ?? ""} 
                  onChange={(e) => setForm({ ...form, generic_name: e.target.value })}
                />
              </div>
            </div>
            <div className="col-md-3">
              <div className="form-group">
                <label className="form-label">Brand Name</label>
                <input 
                  className="form-control" 
                  value={form.brand_name ?? ""} 
                  onChange={(e) => setForm({ ...form, brand_name: e.target.value })}
                />
              </div>
            </div>
            <div className="col-md-3">
              <div className="form-group">
                <label className="form-label">Strength</label>
                <input 
                  className="form-control" 
                  value={form.strength ?? ""} 
                  onChange={(e) => setForm({ ...form, strength: e.target.value })}
                />
              </div>
            </div>
            <div className="col-md-3">
              <div className="form-group">
                <label className="form-label">Category</label>
                <input 
                  className="form-control" 
                  value={form.category ?? ""} 
                  onChange={(e) => setForm({ ...form, category: e.target.value || null })}
                />
              </div>
            </div>
            {/* <div className="col-md-3">
              <div className="form-group">
                <label className="form-label">Cost</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={form.cost} 
                  onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="col-md-3">
              <div className="form-group">
                <label className="form-label">Price</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={form.price} 
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="col-md-3">
              <div className="form-group">
                <label className="form-label">Discount</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={form.discount ?? 0} 
                  onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="col-md-3">
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={form.qty} 
                  onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })}
                />
              </div>
            </div> */}
          </div>
          <div className="mt-4">
            <button className="btn btn-primary me-2" onClick={save}>
              {editing ? "Save Changes" : "Add Product"}
            </button>
            <button className="btn btn-secondary" onClick={reset}>Reset Form</button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="card">
        <div className="card-body">
          <h3 className="card-title mb-4">Product List</h3>
          <div className="table-responsive">
            <table className="table table-striped table-bordered">
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Product Name</th>
                  <th>Generic Name</th>
                  <th>Brand Name</th>
                  <th>Strength</th>
                  <th>Category</th>
                  {/* <th>Price</th>
                  <th>Discount</th>
                  <th>Qty</th> */}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>{p.sku}</td>
                    <td>{p.name}</td>
                    <td>{p.generic_name}</td>
                    <td>{p.brand_name}</td>
                    <td>{p.strength}</td>
                    <td>{p.category}</td>
                    {/* <td>Rs. {money(p.price)}</td>
                    <td>Rs. {money(p.discount)}</td>  
                    <td>{p.qty}</td> */}
                    <td>
                      <button className="btn btn-sm btn-secondary me-1" onClick={() => edit(p)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(p.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center">No products found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
