// Stock Types
export interface StockBatch {
  id: number;
  sku: string;
  name?: string;
  batch_number: string;
  mfg_date: string;
  exp_date: string;
  pack_size: string;
  price: number;
  quantity: number;
  status: 'Active' | 'Inactive';
}

export type Product = {
  id: number;
  sku: string;
  name: string;
  generic_name?: string;
  brand_name?: string;
  strength?: string;
  category: string | null;
  cost: number;
  price: number;
  discount: number;
  qty: number;
  status: "Active" | "Inactive";
};

export type CartItem = { 
  sku: string; 
  name: string; 
  price: number; 
  discount: number;
  qty: number 
};

export type Customer = {
  id: number;
  name: string;
  phone?: string;
  email?: string;
};