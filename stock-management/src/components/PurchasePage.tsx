import { useState, useRef, useEffect } from 'react';
import type { Product } from '../types';
import { purchaseApi, productsApi } from '../api';

export function PurchasePage({ products, setProducts }: { products: Product[]; setProducts: (p: Product[]) => void }) {
  const [sku, setSku] = useState("");
  const [amount, setAmount] = useState(0);
  const [cost, setCost] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  async function receive() {
    const product = products.find((p) => p.sku === sku);
    if (!product) return alert("SKU not found");
    if (amount <= 0) return alert("Please enter a valid quantity");
    if (cost <= 0) return alert("Please enter a valid cost");

    try {
      setLoading(true);
      // Create purchase record
      await purchaseApi.create({
        items: [{
          productId: product.id,
          qty: amount,
          cost: cost
        }]
      });

      // Refresh products list to get updated quantities
      const updatedProducts = await productsApi.getAll();
      setProducts(updatedProducts);

      // Reset form
      setSku("");
      setAmount(0);
      setCost(0);
      alert("Purchase recorded successfully!");
    } catch (err: any) {
      alert("Failed to record purchase: " + (err?.message ?? "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  const selectedProduct = products.find(p => p.sku === sku);

  return (
    <section className="card vstack">
      <h2>Purchase / Stock In</h2>
      <div className="input-group" ref={containerRef}>
        <div style={{ position: 'relative', maxWidth: 420 }}>
          <input 
            placeholder="Enter SKU or product name" 
            value={sku} 
            onChange={(e) => { setSku(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            className="input"
          />
          {showDropdown && sku.trim() && (
            <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 6px)', background: 'white', border: '1px solid #ddd', borderRadius: 6, boxShadow: '0 6px 18px rgba(0,0,0,0.08)', zIndex: 40, maxHeight: 220, overflow: 'auto' }}>
              {products.filter(p => p.name.toLowerCase().includes(sku.trim().toLowerCase()) || p.sku.toLowerCase().includes(sku.trim().toLowerCase())).slice(0,8).map(p => (
                <div key={p.id} onClick={() => { setSku(p.sku); setShowDropdown(false); }} style={{ padding: '8px 12px', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>{p.sku} • {p.category ?? ''}</div>
                </div>
              ))}
              {products.length === 0 && <div style={{ padding: 12, color: '#666' }}>No products</div>}
            </div>
          )}
        </div>
        {selectedProduct && (
          <div className="badge badge-primary mt-4">
            Selected: {selectedProduct.name} (Current Stock: {selectedProduct.qty})
          </div>
        )}
      </div>
      
      <div className="flex gap-4">
        <div className="input-group" style={{ flex: 1 }}>
          <label>Quantity</label>
          <input 
            type="number" 
            value={amount} 
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
            className="input"
            min="0"
          />
        </div>
        
        <div className="input-group" style={{ flex: 1 }}>
          <label>Cost per Unit</label>
          <input 
            type="number" 
            value={cost} 
            onChange={(e) => setCost(Math.max(0, Number(e.target.value)))}
            className="input"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      {amount > 0 && cost > 0 && (
        <div className="card bg-success text-white mt-4">
          <div className="flex justify-between items-center">
            <span>Total Cost:</span>
            <strong>Rs. {(amount * cost).toFixed(2)}</strong>
          </div>
        </div>
      )}

      <button 
        className="btn btn-primary mt-4" 
        onClick={receive}
        disabled={loading || !selectedProduct || amount <= 0 || cost <= 0}
      >
        {loading ? "Recording Purchase..." : "Record Purchase"}
      </button>
    </section>
  );
}