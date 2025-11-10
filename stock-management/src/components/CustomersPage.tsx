import { useEffect, useState, useRef } from "react";
import type { Customer } from "../types";
import { customersApi } from "../api";

export function CustomersPage() {
  const blank: Customer = { id: 0, name: "", phone: "", email: "" } as Customer;
  const [list, setList] = useState<Customer[]>([]);
  const [form, setForm] = useState<Customer>(blank);
  const [editing, setEditing] = useState(false);
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
      setList(data);
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
    try {
      if (editing) {
        await customersApi.update(form.id, form);
        setList(list.map((c) => (c.id === form.id ? form : c)));
      } else {
        const created = await customersApi.create(form);
        // backend returns created object with id
        setList([created, ...list]);
      }
      reset();
    } catch (err: any) {
      alert("Failed to save: " + (err?.message ?? ""));
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
    return c.name?.toLowerCase().includes(s) || (c.phone ?? "").toLowerCase().includes(s) || (c.email ?? "").toLowerCase().includes(s);
  });

  return (
    <section className="card vstack">
      <h2>Customers</h2>

      <div className="hstack" style={{ gap: 12 }}>
        <div style={{ flex: 1 }} ref={containerRef}>
          <div style={{ position: 'relative', maxWidth: 420 }}>
            <input className="input" placeholder="Search by name, phone or email" value={q} onChange={(e) => { setQ(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} />
            {showDropdown && q.trim() && (
              <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 6px)', background: 'white', border: '1px solid #ddd', borderRadius: 6, boxShadow: '0 6px 18px rgba(0,0,0,0.08)', zIndex: 40, maxHeight: 260, overflow: 'auto' }}>
                {filtered.slice(0, 8).map((c) => (
                  <div key={c.id} onClick={() => { setQ(c.name); setShowDropdown(false); }} style={{ padding: '8px 12px', cursor: 'pointer' }}>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>{c.phone ?? ''} • {c.email ?? ''}</div>
                  </div>
                ))}
                {filtered.length === 0 && <div style={{ padding: 12, color: '#666' }}>No results</div>}
              </div>
            )}
          </div>
        </div>
        <div>
          <button className="btn" onClick={() => { reset(); setEditing(false); }}>New Customer</button>
        </div>
      </div>

      <div className="hstack" style={{ gap: 20, marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.phone}</td>
                  <td>{c.email}</td>
                  <td>
                    <button className="btn ghost" onClick={() => edit(c)}>Edit</button>
                    <button className="btn danger" onClick={() => remove(c.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4}>No customers</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ width: 360 }}>
          <div className="card vstack">
            <h3>{editing ? "Edit Customer" : "New Customer"}</h3>
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <label>Phone</label>
            <input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value || undefined })} />
            <label>Email</label>
            <input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value || undefined })} />
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
