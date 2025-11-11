export const customersApi = {
  async getAll() {
    const r = await fetch(`${API}/customers`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },
  async create(c: any) {
    const r = await fetch(`${API}/customers`, {
      method: "POST",
      headers,
      body: JSON.stringify(c)
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },
  async update(id: number, c: any) {
    const r = await fetch(`${API}/customers/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(c)
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },
  async remove(id: number) {
    const r = await fetch(`${API}/customers/${id}`, { method: "DELETE" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }
};
const API = "http://localhost:8080/api";

const headers = { "Content-Type": "application/json" };

export const productsApi = {
  async getAll() {
    const r = await fetch(`${API}/products`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },
  async create(p: any) {
    const r = await fetch(`${API}/products`, { 
      method: "POST", 
      headers, 
      body: JSON.stringify(p) 
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },
  async update(id: number, p: any) {
    const r = await fetch(`${API}/products/${id}`, { 
      method: "PUT", 
      headers, 
      body: JSON.stringify(p) 
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },
  async remove(id: number) {
    const r = await fetch(`${API}/products/${id}`, { method: "DELETE" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }
};

export const purchaseApi = {
  async create(purchase: {
    refNo?: string;
    supplier?: string;
    items: Array<{
      productId: number;
      qty: number;
      cost: number;
    }>;
  }) {
    const r = await fetch(`${API}/purchases`, {
      method: "POST",
      headers,
      body: JSON.stringify(purchase)
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }
};

export const salesApi = {
  async create(sale: {
    customer: {
      name: string;
      phone?: string;
    };
    items: Array<{
      sku: string;
      qty: number;
      price: number;
      discount: number;
      lineTotal: number;
    }>;
    tax: number;
    discount: number;
    subTotal: number;
    total: number;
  }) {
    const r = await fetch(`${API}/sales`, {
      method: "POST",
      headers,
      body: JSON.stringify(sale)
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  },

  async getInvoice(invoiceNo: string, opts?: { format?: 'dot'|'html'|'overlay'; offsetX?: number; offsetY?: number; fontSize?: number; lineHeight?: number; scale?: number; bgUrl?: string; showBg?: boolean }) {
    const params = new URLSearchParams();
    if (opts?.format) params.set('format', opts.format);
    if (typeof opts?.offsetX === 'number') params.set('offsetX', String(opts.offsetX));
    if (typeof opts?.offsetY === 'number') params.set('offsetY', String(opts.offsetY));
    if (typeof opts?.fontSize === 'number') params.set('fontSize', String(opts.fontSize));
    if (typeof opts?.lineHeight === 'number') params.set('lineHeight', String(opts.lineHeight));
    if (typeof opts?.scale === 'number') params.set('scale', String(opts.scale));
    if (opts?.bgUrl) params.set('bgUrl', opts.bgUrl);
    if (typeof opts?.showBg === 'boolean') params.set('showBg', opts.showBg ? '1' : '0');
    const qs = params.toString();
    const r = await fetch(`${API}/sales/${invoiceNo}/invoice${qs ? `?${qs}` : ''}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text(); // Returns HTML
  }
};
