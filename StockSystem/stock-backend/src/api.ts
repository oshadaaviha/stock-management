const API = "http://localhost:8080/api";

export const productsApi = {
  async getAll() {
    const r = await fetch(`${API}/products`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },
};
