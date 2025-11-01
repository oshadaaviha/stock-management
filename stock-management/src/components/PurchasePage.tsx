import { useState } from 'react';
import type { Product } from '../types';
import { purchaseApi, productsApi } from '../api';

export function PurchasePage({ products, setProducts }: { products: Product[]; setProducts: (p: Product[]) => void }) {
  const [sku, setSku] = useState("");
  const [amount, setAmount] = useState(0);
  const [cost, setCost] = useState(0);
  const [loading, setLoading] = useState(false);

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
      <div className="input-group">
        <input 
          placeholder="Enter SKU" 
          value={sku} 
          onChange={(e) => setSku(e.target.value)}
          className="input"
        />
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