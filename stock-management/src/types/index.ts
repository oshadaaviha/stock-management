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

// Aggregated stock view per product (from purchase_items)
export interface AggregatedStockRow {
  product_id: number;
  sku: string;
  name: string;
  total_quantity: number;
  earliest_exp: string | null;
  latest_exp: string | null;
  total_cost_value: number;
  total_price_value: number;
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
  qty: number;
  batchNo?: string; // optional per-item batch reference
};

export type Customer = {
  id: number;
  customer_code?: string;
  name: string;
  phone?: string;
  email?: string;
  customer_address?: string;
  customer_vat?: string;
  route?: string;
  sales_rep_id?: number;
  created_at?: string;
  is_system?: boolean; // true if manually added, false if auto-created from sales
};