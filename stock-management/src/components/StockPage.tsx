import { useState, useRef, useEffect } from 'react';
import type { Product } from '../types';   // ← only import Product
import { money } from '../utils';

/** What the API returns for a stock row (joined with product fields) */
type StockBatchRow = {
  id: number;
  sku: string;
  name: string | null;
  batch_number: string;
  mfg_date: string;
  exp_date: string;
  pack_size: string;
  price: number;
  quantity: number;
  status: 'Active' | 'Inactive';
  created_at?: string;
  updated_at?: string;
};

interface StockBatch {
    id: number;
    sku: string;
    name: string | null;
    batch_number: string;
    mfg_date: string;
    exp_date: string;
    pack_size: string;
    price: number;
    quantity: number;
    status: 'Active' | 'Inactive';
    created_at?: string;
    updated_at?: string;
}

interface StockBatchBase {
    sku: string;
    name: string | null;
    batch_number: string;
    mfg_date: string;
    exp_date: string;
    pack_size: string;
    price: number;
    quantity: number;
    status: 'Active' | 'Inactive';
}

/** What the form edits (no id / no joined product fields) */
type StockFormData = Omit<
  StockBatchRow,
  'id' | 'name' | 'sku' | 'created_at' | 'updated_at'
>;

const stockApi = {
  async getAll(): Promise<StockBatchRow[]> {
    const r = await fetch(`/api/stock`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },

  // what backend needs to create/update a batch
  async create(payload: { sku: string } & StockFormData) {
    const r = await fetch(`/api/stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },

  async update(id: number, payload: { sku: string } & StockFormData) {
    const r = await fetch(`/api/stock/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },

  async remove(id: number) {
    const r = await fetch(`/api/stock/${id}`, { method: 'DELETE' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },
};

export function StockPage({ products }: { products: Product[] }) {
  const [stockBatches, setStockBatches] = useState<StockBatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // blank form
  const blank: StockFormData = {
    batch_number: '',
    mfg_date: '',
    exp_date: '',
    pack_size: '',
    price: 0,
    quantity: 0,
    status: 'Active',
  };
  const [form, setForm] = useState<StockFormData & { id?: number }>(blank);
  const [editing, setEditing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => { loadStock(); }, []);
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  async function loadStock() {
    try {
      setLoading(true);
      const data = await stockApi.getAll();
      setStockBatches(data);
    } catch (err: any) {
      alert('Failed to load stock: ' + (err?.message ?? 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setForm(blank);
    setEditing(false);
    setSelectedProduct(null);
    setQ('');
  }

  async function save() {
    if (!selectedProduct) return alert('Please select a product');
    if (!form.batch_number.trim()) return alert('Batch number is required');
    if (!form.mfg_date) return alert('Manufacturing date is required');
    if (!form.exp_date) return alert('Expiry date is required');
    if (!form.pack_size.trim()) return alert('Pack size is required');
    if (form.quantity < 0) return alert('Quantity must be zero or positive');
    if (form.price < 0) return alert('Price must be zero or positive');

    const payload = { sku: selectedProduct.sku, ...form };

    try {
      if (editing && form.id) {
        await stockApi.update(form.id, payload);
      } else {
        await stockApi.create(payload);
      }
      await loadStock();
      reset();
    } catch (err: any) {
      alert('Failed to save: ' + (err?.message ?? 'Unknown error'));
    }
  }

  function edit(batch: StockBatchRow) {
    // fill form with editable fields
    const { id, batch_number, mfg_date, exp_date, pack_size, price, quantity, status } = batch;
    setForm({ id, batch_number, mfg_date, exp_date, pack_size, price, quantity, status });
    setEditing(true);
    const product = products.find(p => p.sku === batch.sku) || null;
    setSelectedProduct(product);
    setQ(product ? product.name : '');
  }

  async function remove(id: number) {
    if (!confirm('Delete this batch?')) return;
    try {
      await stockApi.remove(id);
      await loadStock();
    } catch (err: any) {
      alert('Failed to delete: ' + (err?.message ?? 'Unknown error'));
    }
  }

  const filtered = products.filter(p => {
    if (!q.trim()) return true;
    const s = q.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(s) ||
      p.sku.toLowerCase().includes(s) ||
      p.generic_name?.toLowerCase().includes(s) ||
      p.brand_name?.toLowerCase().includes(s)
    );
  });


  return (
    <section className="container-fluid py-3">
      <div className="row mb-3">
        <div className="col">
          <h2>Stock Management</h2>
        </div>
      </div>

      {/* Search and Form Card */}
      <div className="card mb-4">
        <div className="card-body">
          <h3 className="card-title mb-4">{editing ? "Edit Stock" : "Add Stock"}</h3>
          
          {/* Product Search */}
          <div className="row mb-4">
            <div className="col-md-6" ref={containerRef}>
              <label className="form-label">Search & Select Product</label>
              <div className="position-relative">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name, SKU, generic name..."
                  value={q}
                  onChange={e => { setQ(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                />
                {showDropdown && filtered.length > 0 && (
                  <div className="position-absolute w-100 mt-1" style={{ zIndex: 1000 }}>
                    <div className="card">
                      <div className="list-group list-group-flush">
                        {filtered.map(p => (
                          <button
                            key={p.id}
                            className="list-group-item list-group-item-action"
                            onClick={() => {
                              setSelectedProduct(p);
                              setQ(p.name);
                              setShowDropdown(false);
                            }}
                          >
                            <div className="fw-bold">{p.name}</div>
                            <small className="text-muted">
                              {p.sku} • {p.generic_name} • {p.brand_name}
                            </small>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {selectedProduct && (
            <div className="row g-3">
              {/* Selected Product Details */}
              <div className="col-md-12 mb-3">
                <div className="alert alert-info">
                  <strong>Selected Product:</strong> {selectedProduct.name}<br />
                  <small>
                    SKU: {selectedProduct.sku} •
                    Generic: {selectedProduct.generic_name} •
                    Brand: {selectedProduct.brand_name} •
                    Current Stock: {selectedProduct.qty}
                  </small>
                </div>
              </div>

              {/* Batch Details Form */}
              <div className="col-md-3">
                <label className="form-label">Batch Number</label>
                <input
                  className="form-control"
                  value={form.batch_number}
                  onChange={e => setForm({ ...form, batch_number: e.target.value })}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Manufacturing Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.mfg_date}
                  onChange={e => setForm({ ...form, mfg_date: e.target.value })}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Expiry Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.exp_date}
                  onChange={e => setForm({ ...form, exp_date: e.target.value })}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Pack Size</label>
                <input
                  className="form-control"
                  value={form.pack_size}
                  onChange={e => setForm({ ...form, pack_size: e.target.value })}
                  placeholder="e.g., 10x10, 100ml"
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Price</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.price}
                  onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Quantity</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: Number(e.target.value) })}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value as 'Active' | 'Inactive' })}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="col-12">
                <button className="btn btn-primary me-2" onClick={save}>
                  {editing ? "Update Stock" : "Add Stock"}
                </button>
                <button className="btn btn-secondary" onClick={reset}>
                  Reset Form
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stock Table */}
      <div className="card">
        <div className="card-body">
          <h3 className="card-title mb-4">Stock Batches</h3>
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-bordered">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Batch #</th>
                    <th>Mfg Date</th>
                    <th>Exp Date</th>
                    <th>Pack Size</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stockBatches.map(batch => (
                    <tr key={batch.id}>
                      <td>
                        <div>{batch.name}</div>
                        <small className="text-muted">{batch.sku}</small>
                      </td>
                      <td>{batch.batch_number}</td>
                      <td>{new Date(batch.mfg_date).toLocaleDateString()}</td>
                      <td>{new Date(batch.exp_date).toLocaleDateString()}</td>
                      <td>{batch.pack_size}</td>
                      <td>Rs. {money(batch.price)}</td>
                      <td>{batch.quantity}</td>
                      <td>
                        <span className={`badge ${batch.status === 'Active' ? 'bg-success' : 'bg-danger'}`}>
                          {batch.status}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-sm btn-secondary me-1"
                          onClick={() => edit(batch)}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => remove(batch.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {stockBatches.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center">No stock batches found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}