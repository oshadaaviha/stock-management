import axios from "axios";

export type Supplier = {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at: string;
};

export const suppliersApi = {
  async list(): Promise<Supplier[]> {
    const res = await axios.get("/api/suppliers");
    return res.data;
  },
  async create(supplier: Omit<Supplier, "id" | "created_at">): Promise<Supplier> {
    const res = await axios.post("/api/suppliers", supplier);
    return res.data;
  },
  async update(id: number, supplier: Partial<Omit<Supplier, "id" | "created_at">>): Promise<Supplier> {
    const res = await axios.put(`/api/suppliers/${id}`, supplier);
    return res.data;
  },
};
