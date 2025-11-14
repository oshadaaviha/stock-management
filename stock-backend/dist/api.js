"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productsApi = void 0;
const API = "http://localhost:8080/api";
exports.productsApi = {
    async getAll() {
        const r = await fetch(`${API}/products`);
        if (!r.ok)
            throw new Error(`HTTP ${r.status}`);
        return r.json();
    },
};
