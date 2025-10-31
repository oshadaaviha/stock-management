const API = "http://localhost:8080/api";

export const productsApi = {
  async getAll() {
    const r = await fetch(`${API}/products`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },
   async create(p: any) {
    const r = await fetch(`${API}/products`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },
  async update(id: number, p: any) {
    const r = await fetch(`${API}/products/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },
  async remove(id: number) {
    const r = await fetch(`${API}/products/${id}`, { method: "DELETE" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }
};
