export type Product = {
  id: number;
  sku: string;
  name: string;
  category: string | null;
  cost: number;
  price: number;
  qty: number;
  status: "Active" | "Inactive";
};

export type CartItem = { 
  sku: string; 
  name: string; 
  price: number; 
  qty: number 
};

export type Customer = {
  id: number;
  name: string;
  phone?: string;
  email?: string;
};