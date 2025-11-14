"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.salesApi = exports.purchaseApi = exports.productsApi = exports.customersApi = void 0;
const API = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "/api";
exports.default = API;
const headers = { "Content-Type": "application/json" };
exports.customersApi = {
    async getAll() {
        const r = await fetch(`${API}/customers`);
        if (!r.ok)
            throw new Error(`HTTP ${r.status}`);
        return r.json();
    },
    async create(c) {
        const r = await fetch(`${API}/customers`, {
            method: "POST",
            headers,
            body: JSON.stringify(c)
        });
        if (!r.ok)
            throw new Error(`HTTP ${r.status}`);
        return r.json();
    },
    async update(id, c) {
        const r = await fetch(`${API}/customers/${id}`, {
            method: "PUT",
            headers,
            body: JSON.stringify(c)
        });
        if (!r.ok)
            throw new Error(`HTTP ${r.status}`);
        return r.json();
    },
    async remove(id) {
        const r = await fetch(`${API}/customers/${id}`, { method: "DELETE" });
        if (!r.ok)
            throw new Error(`HTTP ${r.status}`);
        return r.json();
    }
};
exports.productsApi = {
    async getAll() {
        const r = await fetch(`${API}/products`);
        if (!r.ok)
            throw new Error(`HTTP ${r.status}`);
        return r.json();
    },
    async create(p) {
        const r = await fetch(`${API}/products`, {
            method: "POST",
            headers,
            body: JSON.stringify(p)
        });
        if (!r.ok)
            throw new Error(`HTTP ${r.status}`);
        return r.json();
    },
    async update(id, p) {
        const r = await fetch(`${API}/products/${id}`, {
            method: "PUT",
            headers,
            body: JSON.stringify(p)
        });
        if (!r.ok)
            throw new Error(`HTTP ${r.status}`);
        return r.json();
    },
    async remove(id) {
        const r = await fetch(`${API}/products/${id}`, { method: "DELETE" });
        if (!r.ok)
            throw new Error(`HTTP ${r.status}`);
        return r.json();
    }
};
exports.purchaseApi = {
    async create(purchase) {
        const r = await fetch(`${API}/purchases`, {
            method: "POST",
            headers,
            body: JSON.stringify(purchase)
        });
        if (!r.ok)
            throw new Error(`HTTP ${r.status}`);
        return r.json();
    }
};
exports.salesApi = {
    async create(sale) {
        const r = await fetch(`${API}/sales`, {
            method: "POST",
            headers,
            body: JSON.stringify(sale)
        });
        const data = await r.json();
        if (!r.ok)
            throw new Error(data.error || `HTTP ${r.status}`);
        return data;
    },
    async getInvoice(invoiceNo, opts) {
        const params = new URLSearchParams();
        if (opts?.format)
            params.set('format', opts.format);
        if (typeof opts?.offsetX === 'number')
            params.set('offsetX', String(opts.offsetX));
        if (typeof opts?.offsetY === 'number')
            params.set('offsetY', String(opts.offsetY));
        if (typeof opts?.fontSize === 'number')
            params.set('fontSize', String(opts.fontSize));
        if (typeof opts?.lineHeight === 'number')
            params.set('lineHeight', String(opts.lineHeight));
        if (typeof opts?.scale === 'number')
            params.set('scale', String(opts.scale));
        if (opts?.bgUrl)
            params.set('bgUrl', opts.bgUrl);
        if (typeof opts?.showBg === 'boolean')
            params.set('showBg', opts.showBg ? '1' : '0');
        if (typeof opts?.finalDiscount === 'number')
            params.set('finalDiscount', String(opts.finalDiscount));
        const qs = params.toString();
        const r = await fetch(`${API}/sales/${invoiceNo}/invoice${qs ? `?${qs}` : ''}`);
        if (!r.ok)
            throw new Error(`HTTP ${r.status}`);
        return r.text(); // Returns HTML
    }
};
