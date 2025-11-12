import { useEffect, useState, useRef } from "react";
import type { Customer } from "../types";
import { customersApi } from "../api";

export function CustomersPage() {
  const blank: Customer = { id: 0, customer_code: "", name: "", phone: "", email: "", customer_address: "", customer_vat: "", route: "", sales_rep_id: undefined } as Customer;
  const [list, setList] = useState<Customer[]>([]);
  const [form, setForm] = useState<Customer>(blank);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  async function load() {
    try {
      const data = await customersApi.getAll();
      // Filter to show only manually added customers (exclude auto-created from sales)
      const systemCustomers = data.filter((c: Customer) => c.is_system !== false);
      setList(systemCustomers);
    } catch (err: any) {
      alert("Failed to load customers: " + (err?.message ?? ""));
    }
  }

  function reset() {
    setForm({ ...blank, id: 0 });
    setEditing(false);
  }

  async function save() {
    if (!form.name?.trim()) return alert("Customer name is required");
    setLoading(true);
    try {
      if (editing) {
        await customersApi.update(form.id, form);
        setList(list.map((c) => (c.id === form.id ? form : c)));
        alert("Customer updated successfully!");
      } else {
        const created = await customersApi.create(form);
        // backend returns created object with id
        setList([created, ...list]);
        alert("Customer added successfully!");
      }
      reset();
    } catch (err: any) {
      console.error("Save error:", err);
      alert("Failed to save: " + (err?.message ?? "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  function edit(c: Customer) {
    setForm(c);
    setEditing(true);
  }

  async function remove(id: number) {
    if (!confirm("Delete customer?")) return;
    try {
      await customersApi.remove(id);
      setList(list.filter((c) => c.id !== id));
    } catch (err: any) {
      alert("Failed to delete: " + (err?.message ?? ""));
    }
  }

  const filtered = list.filter((c) => {
    if (!q.trim()) return true;
    const s = q.trim().toLowerCase();
    return (c.customer_code ?? "").toLowerCase().includes(s) ||
           c.name?.toLowerCase().includes(s) || 
           (c.phone ?? "").toLowerCase().includes(s) || 
           (c.email ?? "").toLowerCase().includes(s) ||
           (c.customer_address ?? "").toLowerCase().includes(s) ||
           (c.customer_vat ?? "").toLowerCase().includes(s);
  });

  return (
    <section className="card vstack">
      <h2>Customers</h2>

      <div className="hstack" style={{ gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1 }} ref={containerRef}>
          <div style={{ position: 'relative', maxWidth: 420 }}>
            <input className="input" placeholder="Search by code, name, phone, email, address or VAT" value={q} onChange={(e) => { setQ(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} />
            {showDropdown && q.trim() && (
              <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 6px)', background: 'white', border: '1px solid #ddd', borderRadius: 6, boxShadow: '0 6px 18px rgba(0,0,0,0.08)', zIndex: 40, maxHeight: 260, overflow: 'auto' }}>
                {filtered.slice(0, 8).map((c) => (
                  <div key={c.id} onClick={() => { setQ(c.name); setShowDropdown(false); }} style={{ padding: '8px 12px', cursor: 'pointer' }}>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {c.phone ?? ''} {c.phone && c.email ? '•' : ''} {c.email ?? ''}
                      {c.customer_address && <> • {c.customer_address}</>}
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && <div style={{ padding: 12, color: '#666' }}>No results</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Customer Form */}
      <div className="card vstack" style={{ marginBottom: 20 }}>
        <h3>{editing ? "Edit Customer" : "Add New Customer"}</h3>
        
        <div className="hstack" style={{ gap: 16, alignItems: 'start' }}>
          <div style={{ flex: 1 }}>
            <label>Customer Code</label>
            <input value={form.customer_code ?? ""} onChange={(e) => setForm({ ...form, customer_code: e.target.value || undefined })} placeholder="e.g., CUST-001" />
          </div>
          
          <div style={{ flex: 1 }}>
            <label>Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Customer name" />
          </div>
          
          <div style={{ flex: 1 }}>
            <label>Phone</label>
            <input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value || undefined })} placeholder="Phone number" />
          </div>
        </div>

        <div className="hstack" style={{ gap: 16, alignItems: 'start' }}>
          <div style={{ flex: 1 }}>
            <label>Email</label>
            <input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value || undefined })} placeholder="Email address" />
          </div>
          
          <div style={{ flex: 1 }}>
            <label>Address</label>
            <textarea 
              value={form.customer_address ?? ""} 
              onChange={(e) => setForm({ ...form, customer_address: e.target.value || undefined })} 
              placeholder="Full address"
              rows={2}
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        <div className="hstack" style={{ gap: 16, alignItems: 'start' }}>
          <div style={{ flex: 1 }}>
            <label>VAT Number</label>
            <input value={form.customer_vat ?? ""} onChange={(e) => setForm({ ...form, customer_vat: e.target.value || undefined })} placeholder="VAT registration number" />
          </div>
          
          <div style={{ flex: 1 }}>
            <label>Route</label>
            <input value={form.route ?? ""} onChange={(e) => setForm({ ...form, route: e.target.value || undefined })} placeholder="Delivery route" />
          </div>
        </div>
        
        <div className="hstack" style={{ gap: 8, marginTop: 12 }}>
          <button className="btn primary" onClick={save} disabled={loading}>
            {loading ? "Saving..." : editing ? "Update Customer" : "Add Customer"}
          </button>
          <button className="btn" onClick={reset} disabled={loading}>Clear</button>
          {editing && <button className="btn" onClick={() => { reset(); setEditing(false); }} disabled={loading}>Cancel Edit</button>}
        </div>
      </div>

      {/* Customer List Table */}
      <div>
        <h3 style={{ marginBottom: 12 }}>Customer List ({filtered.length})</h3>
        <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Address</th>
                <th>VAT No</th>
                <th>Route</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>{c.customer_code || '-'}</td>
                  <td>{c.name}</td>
                  <td>{c.phone}</td>
                  <td>{c.email}</td>
                  <td>{c.customer_address}</td>
                  <td>{c.customer_vat}</td>
                  <td>{c.route}</td>
                  <td>
                    <button className="btn ghost" onClick={() => edit(c)}>Edit</button>
                    <button className="btn danger" onClick={() => remove(c.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7}>No customers found</td>
                </tr>
              )}
            </tbody>
          </table>
      </div>
    </section>
  );
}
