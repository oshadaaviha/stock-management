import { useEffect, useState } from "react";
import type { Supplier } from "../api/suppliers";
import { suppliersApi } from "../api/suppliers";

export function SuppliersPage() {
  const blank: Supplier = { id: 0, name: "", phone: "", email: "", address: "", created_at: "" };
  const [list, setList] = useState<Supplier[]>([]);
  const [form, setForm] = useState<Supplier>(blank);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await suppliersApi.list();
      setList(data);
    } catch (err: any) {
      alert("Failed to load suppliers: " + (err?.message ?? ""));
    }
  }

  function reset() {
    setForm({ ...blank, id: 0 });
    setEditing(false);
  }

  async function save() {
    if (!form.name?.trim()) return alert("Supplier name is required");
    setLoading(true);
    try {
      if (editing && form.id) {
        const updated = await suppliersApi.update(form.id, { name: form.name, phone: form.phone, email: form.email, address: form.address });
        setList(list.map(s => (s.id === form.id ? updated : s)));
        alert("Supplier updated successfully!");
      } else {
        const created = await suppliersApi.create({ name: form.name, phone: form.phone, email: form.email, address: form.address });
        setList([created, ...list]);
        alert("Supplier added successfully!");
      }
      reset();
    } catch (err: any) {
      console.error("Save error:", err);
      alert("Failed to save supplier");
    } finally {
      setLoading(false);
    }
  }

  function edit(s: Supplier) {
    setForm(s);
    setEditing(true);
  }

  return (
    <div className="container card vstack">
      <h2>Suppliers</h2>
      <form
        onSubmit={e => {
          e.preventDefault();
          save();
        }}
        className="vstack" style={{ gap: 12 }}
      >
        <div className="hstack" style={{ gap: 12 }}>
          <input
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Supplier name"
            required
            style={{ flex: 1 }}
          />
          <input
            value={form.phone ?? ""}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            placeholder="Phone"
            style={{ flex: 1 }}
          />
        </div>
        <div className="hstack" style={{ gap: 12 }}>
          <input
            value={form.email ?? ""}
            onChange={e => setForm({ ...form, email: e.target.value })}
            placeholder="Email"
            style={{ flex: 1 }}
          />
          <input
            value={form.address ?? ""}
            onChange={e => setForm({ ...form, address: e.target.value })}
            placeholder="Address"
            style={{ flex: 1 }}
          />
        </div>
        <div className="hstack" style={{ gap: 12 }}>
          <button type="submit" disabled={loading}>
            {editing ? "Update" : "Add"}
          </button>
          <button type="button" onClick={reset} disabled={loading}>
            Reset
          </button>
        </div>
      </form>
      <table className="data-table" style={{ marginTop: 24 }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Address</th>
            <th>Created</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.map(s => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{s.phone}</td>
              <td>{s.email}</td>
              <td>{s.address}</td>
              <td>{s.created_at?.slice(0, 10)}</td>
              <td><button type="button" onClick={() => edit(s)}>Edit</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
