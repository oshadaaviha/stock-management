import { useState } from 'react';
import type { Product, CartItem } from '../types';
import { money } from '../utils';
import { salesApi, productsApi } from '../api';

export function SalesPage({ products, setProducts }: { products: Product[]; setProducts: (p: Product[]) => void }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sku, setSku] = useState("");
  const [qty, setQty] = useState(1);
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [customerPhone, setCustomerPhone] = useState("");
  const [loading, setLoading] = useState(false);

  function addToCart() {
    const p = products.find((x) => x.sku === sku);
    if (!p) return alert("Product not found");
    if (p.qty < qty) return alert("Not enough stock");
    
    const existing = cart.find((i) => i.sku === p.sku);
    if (existing) {
      if (p.qty < existing.qty + qty) {
        alert("Not enough stock");
        return;
      }
      setCart(c => c.map((i) => (i.sku === p.sku ? { ...i, qty: i.qty + qty } : i)));
    } else {
      setCart(c => [...c, { sku: p.sku, name: p.name, price: p.price, qty }]);
    }
    setSku("");
    setQty(1);
  }

  function removeFromCart(sku: string) {
    setCart(cart.filter(item => item.sku !== sku));
  }

  async function checkout() {
    if (cart.length === 0) return alert("Cart is empty");
    if (!customerName.trim()) return alert("Please enter customer name");
    
    try {
      setLoading(true);
      
      // Validate stock availability first
      for (const item of cart) {
        const product = products.find(p => p.sku === item.sku);
        if (!product) {
          alert(`Product not found: ${item.sku}`);
          return;
        }
        if (product.qty < item.qty) {
          alert(`Insufficient stock for ${product.name}. Available: ${product.qty}, Requested: ${item.qty}`);
          return;
        }
      }

      // Calculate totals
      const subTotal = cart.reduce((sum, item) => sum + item.qty * item.price, 0);
      const tax = 0; // You can add tax calculation if needed
      const discount = 0; // You can add discount calculation if needed
      const total = subTotal + tax - discount;

      // Convert cart items to sale items with product IDs
      const saleItems = cart.map(item => {
        const product = products.find(p => p.sku === item.sku);
        if (!product) throw new Error(`Product not found: ${item.sku}`);
        return {
          productId: product.id,
          qty: item.qty,
          price: item.price,
          lineTotal: item.qty * item.price
        };
      });

      // Create sale record
      const result = await salesApi.create({
        customer: {
          name: customerName.trim(),
          phone: customerPhone.trim() || undefined
        },
        items: saleItems,
        tax,
        discount,
        subTotal,
        total
      });

      if (!result.ok) {
        throw new Error(result.error || "Failed to create sale");
      }

      // Get and show invoice
      try {
        const invoiceHtml = await salesApi.getInvoice(result.saleId);
        const invoiceWindow = window.open("", "_blank");
        if (invoiceWindow) {
          invoiceWindow.document.write(invoiceHtml);
          invoiceWindow.document.close();
        } else {
          alert("Please allow pop-ups to view the invoice");
        }
      } catch (err) {
        console.error("Failed to generate invoice:", err);
        alert("Sale completed but failed to generate invoice. Please check sales history.");
      }

      // Refresh products list to get updated quantities
      const updatedProducts = await productsApi.getAll();
      setProducts(updatedProducts);
      
      // Reset form
      setCart([]);
      setCustomerName("Walk-in Customer");
      setCustomerPhone("");
      
      // Show success message
      alert(`Sale completed successfully! Total: Rs. ${money(total)}`);
      
    } catch (err: any) {
      console.error("Sale error:", err);
      alert("Failed to process sale: " + (err?.message ?? "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  const subTotal = cart.reduce((sum, item) => sum + item.qty * item.price, 0);

  return (
    <section className="card vstack">
      <h2>Sales / Invoice</h2>
      
      <div className="card">
        <div className="flex gap-4">
          <div className="input-group" style={{ flex: 2 }}>
            <label>Customer Name</label>
            <input 
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter customer name"
            />
          </div>
          <div className="input-group" style={{ flex: 1 }}>
            <label>Phone (Optional)</label>
            <input 
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Phone number"
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex gap-4">
          <div className="input-group" style={{ flex: 2 }}>
            <label>Product SKU</label>
            <input 
              placeholder="Enter SKU" 
              value={sku} 
              onChange={(e) => setSku(e.target.value)}
            />
          </div>
          <div className="input-group" style={{ flex: 1 }}>
            <label>Quantity</label>
            <input 
              type="number" 
              value={qty} 
              onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
              min="1"
            />
          </div>
          <div style={{ alignSelf: 'flex-end' }}>
            <button className="btn btn-primary" onClick={addToCart}>Add to Cart</button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4">Cart Items</h3>
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Price</th>
              <th className="text-right">Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cart.map((item) => (
              <tr key={item.sku}>
                <td>{item.sku}</td>
                <td>{item.name}</td>
                <td className="text-right">{item.qty}</td>
                <td className="text-right">Rs. {money(item.price)}</td>
                <td className="text-right">Rs. {money(item.qty * item.price)}</td>
                <td className="text-right">
                  <button 
                    className="btn btn-danger" 
                    onClick={() => removeFromCart(item.sku)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {cart.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center">Cart is empty</td>
              </tr>
            )}
          </tbody>
          {cart.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={4} className="text-right"><strong>Sub Total:</strong></td>
                <td className="text-right"><strong>Rs. {money(subTotal)}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>

        {cart.length > 0 && (
          <div className="flex justify-between items-center mt-4">
            <div>
              {cart.length} item(s) in cart
            </div>
            <button 
              className="btn btn-primary"
              onClick={checkout}
              disabled={loading}
            >
              {loading ? "Processing..." : "Checkout & Generate Invoice"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}