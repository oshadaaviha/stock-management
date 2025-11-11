import { useState, useEffect, useRef } from 'react';
import type { Product, CartItem } from '../types';
import { money } from '../utils';
import { salesApi, productsApi, customersApi } from '../api';

export function SalesPage({ products, setProducts }: { products: Product[]; setProducts: (p: Product[]) => void }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sku, setSku] = useState("");
  const [qty, setQty] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [customerPhone, setCustomerPhone] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Array<{ id: number; name: string; phone?: string }>>([]);
  const [showFinalDiscountModal, setShowFinalDiscountModal] = useState(false);
  const [finalDiscount, setFinalDiscount] = useState(0);
  const [pendingInvoiceNo, setPendingInvoiceNo] = useState("");

  // dropdown states
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const prodRef = useRef<HTMLDivElement | null>(null);
  const custRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // load customers for suggestions
    (async () => {
      try {
        const data = await customersApi.getAll();
        setCustomers(data || []);
      } catch (e) {
        // ignore errors for suggestions
      }
    })();

    function onDocClick(e: MouseEvent) {
      if (prodRef.current && !prodRef.current.contains(e.target as Node)) setShowProductDropdown(false);
      if (custRef.current && !custRef.current.contains(e.target as Node)) setShowCustomerDropdown(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  function addToCart() {
    const p = products.find((x) => x.sku === sku);
    if (!p) return alert("Product not found");
    if (p.qty < qty) return alert("Not enough stock");
    
    // Calculate discount amount from percentage
    const discountAmount = (Number(p.price) * discount) / 100;
    
    const existing = cart.find((i) => i.sku === p.sku);
    if (existing) {
      if (p.qty < existing.qty + qty) {
        alert("Not enough stock");
        return;
      }
      setCart(c => c.map((i) => (i.sku === p.sku ? { ...i, qty: i.qty + qty } : i)));
    } else {
      setCart(c => [...c, { 
        sku: p.sku, 
        name: p.name, 
        price: Number(p.price), 
        discount: discountAmount,
        qty 
      }]);
    }
    setSku("");
    setQty(1);
    setDiscount(0);
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

  // Calculate totals with discounts
  const subTotal = cart.reduce((sum, item) => sum + item.qty * Number(item.price), 0);
      const totalDiscount = cart.reduce((sum, item) => sum + item.qty * Number(item.discount), 0);
      const tax = 0; // You can add tax calculation if needed
      const total = subTotal - totalDiscount;

      // Convert cart items to sale items
      const saleItems = cart.map(item => {
        const product = products.find(p => p.sku === item.sku);
        if (!product) throw new Error(`Product not found: ${item.sku}`);
        const priceNum = Number(item.price);
        const discountNum = Number(item.discount);
        const netPrice = priceNum - discountNum;
        return {
          sku: item.sku,
          qty: item.qty,
          price: priceNum,
          discount: discountNum,
          lineTotal: item.qty * netPrice
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
        discount: totalDiscount,
        subTotal,
        total
      });

      if (!result.ok) {
        throw new Error(result.error || "Failed to create sale");
      }

      // Set the invoice number
      setInvoiceNumber(result.invoiceNo);

      // Show final discount modal before printing
      setPendingInvoiceNo(result.invoiceNo);
      setShowFinalDiscountModal(true);

      // Refresh products list to get updated quantities
      const updatedProducts = await productsApi.getAll();
      setProducts(updatedProducts);
      
      // Reset form (keep invoice number visible)
      setCart([]);
      setCustomerName("Walk-in Customer");
      setCustomerPhone("");
      
    } catch (err: any) {
      console.error("Sale error:", err);
      alert("Failed to process sale: " + (err?.message ?? "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  const subTotal = cart.reduce((sum, item) => sum + (item.qty * (item.price - item.discount)), 0);

  async function printInvoice() {
    try {
      // Get and show invoice with final discount applied
      const invoiceHtml = await salesApi.getInvoice(pendingInvoiceNo, { format: 'overlay' });
      const invoiceWindow = window.open("", "_blank");
      if (invoiceWindow) {
        invoiceWindow.document.write(invoiceHtml);
        invoiceWindow.document.close();
      } else {
        alert("Please allow pop-ups to view the invoice");
      }
      
      // Close modal and show success
      setShowFinalDiscountModal(false);
      setFinalDiscount(0);
      alert(`Sale completed successfully! Invoice: ${pendingInvoiceNo}`);
    } catch (err) {
      console.error("Failed to generate invoice:", err);
      alert("Failed to generate invoice. Please try again.");
    }
  }

  return (
    <section className="card vstack">
      <h2>Sales / Invoice</h2>
      
      <div className="card">
        <div className="flex gap-4">
          <div className="input-group" style={{ flex: 1 }}>
            <label>Invoice Number</label>
            <input 
              value={invoiceNumber}
              readOnly
              placeholder="Auto-generated"
              style={{ backgroundColor: '#f5f5f5' }}
            />
          </div>
          <div className="input-group" style={{ flex: 2 }} ref={custRef}>
            <label>Customer Name</label>
            <div style={{ position: 'relative' }}>
              <input 
                value={customerName}
                onChange={(e) => { setCustomerName(e.target.value); setShowCustomerDropdown(true); }}
                onFocus={() => setShowCustomerDropdown(true)}
                placeholder="Enter customer name"
              />
              {showCustomerDropdown && customerName.trim() && (
                <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 6px)', background: 'white', border: '1px solid #ddd', borderRadius: 6, boxShadow: '0 6px 18px rgba(0,0,0,0.08)', zIndex: 40, maxHeight: 220, overflow: 'auto' }}>
                  {customers.filter(c => 
                    c.name.toLowerCase().includes(customerName.trim().toLowerCase()) || 
                    (c.phone ?? '').toLowerCase().includes(customerName.trim().toLowerCase())
                  ).slice(0,8).map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => { 
                        // Just update the UI fields without saving
                        setCustomerName(c.name);
                        setCustomerPhone(c.phone ?? '');
                        setShowCustomerDropdown(false);
                      }} 
                      style={{ padding: '8px 12px', cursor: 'pointer' }}
                    >
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{c.phone ?? ''}</div>
                    </div>
                  ))}
                  {customers.length === 0 && <div style={{ padding: 12, color: '#666' }}>No customers</div>}
                </div>
              )}
            </div>
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
          <div className="input-group" style={{ flex: 2 }} ref={prodRef}>
            <label>Product SKU</label>
            <div style={{ position: 'relative' }}>
              <input 
                placeholder="Enter SKU or product name" 
                value={sku} 
                onChange={(e) => { setSku(e.target.value); setShowProductDropdown(true); }}
                onFocus={() => setShowProductDropdown(true)}
              />
              {showProductDropdown && sku.trim() && (
                <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 6px)', background: 'white', border: '1px solid #ddd', borderRadius: 6, boxShadow: '0 6px 18px rgba(0,0,0,0.08)', zIndex: 40, maxHeight: 220, overflow: 'auto' }}>
                  {products.filter(p => p.name.toLowerCase().includes(sku.trim().toLowerCase()) || p.sku.toLowerCase().includes(sku.trim().toLowerCase())).slice(0,8).map(p => (
                    <div key={p.id} onClick={() => { setSku(p.sku); setShowProductDropdown(false); }} style={{ padding: '8px 12px', cursor: 'pointer' }}>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {p.sku} • {p.category ?? ''} 
                        {Number(p.discount) > 0 && (
                          <span className="text-success"> • Discount: Rs. {money(p.discount)}</span>
                        )}
                      </div>
                      
                      <div style={{ fontSize: 12 }}>
                        <span>Price: Rs. {money(p.price)}</span>
                        {Number(p.discount) > 0 && (
                          <>
                            <span className="text-decoration-line-through text-muted ms-2">Rs. {money(p.price)}</span>
                            <span className="text-success ms-2">Rs. {money(p.price - p.discount)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {products.length === 0 && <div style={{ padding: 12, color: '#666' }}>No products</div>}
                </div>
              )}
              {sku && !showProductDropdown && (
                <div className="mt-2">
                  {(() => {
                    const selectedProduct = products.find(p => p.sku === sku);
                    if (!selectedProduct) return null;
                    return (
                      <div className="small">
                        <div><strong>{selectedProduct.name}</strong></div>
                        <div>
                          <span>Price: Rs. {money(selectedProduct.price)}</span>
                          {Number(selectedProduct.discount) > 0 && (
                            <>
                              <span className="text-decoration-line-through text-muted ms-2">Rs. {money(selectedProduct.price)}</span>
                              <span className="text-success ms-2">Rs. {money(selectedProduct.price - selectedProduct.discount)}</span>
                            </>
                          )}
                        </div>
                        {Number(selectedProduct.discount) > 0 && (
                          <div className="text-success">
                            Discount: Rs. {money(selectedProduct.discount)}
                          </div>
                        )}
                        <div className="text-muted">Stock: {selectedProduct.qty} units</div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
          {/* <div className="input-group" style={{ flex: 1 }}>
            <label>Discount</label>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
              min="0"
            />
          </div> */}
          <div className="input-group" style={{ flex: 1 }}>
            <label>Discount (%)</label>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(Math.max(0, Math.min(100, Number(e.target.value))))}
              min="0"
              max="100"
              placeholder="Enter discount %"
            />
          </div>
          <div className="input-group" style={{ flex: 1 }}>
            <label>Quantity</label>
            <input 
              type="text" 
              value={qty} 
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || /^\d+$/.test(val)) {
                  setQty(val === '' ? 1 : Math.max(1, Number(val)));
                }
              }}
              placeholder="Qty"
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
              <th className="text-right">Discount</th>
              <th className="text-right">Net Price</th>
              <th className="text-right">Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cart.map((item) => {
              const netPrice = item.price - item.discount;
              const total = item.qty * netPrice;
              const discountPct = item.price > 0 ? (item.discount / item.price) * 100 : 0;
              return (
                <tr key={item.sku}>
                  <td>{item.sku}</td>
                  <td>{item.name}</td>
                  <td className="text-right">{item.qty}</td>
                  <td className="text-right">Rs. {money(item.price)}</td>
                  <td className="text-right">
                    {item.discount > 0 ? (
                      <span className="text-success">{discountPct.toFixed(1)}%</span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="text-right">Rs. {money(netPrice)}</td>
                  <td className="text-right">Rs. {money(total)}</td>
                  <td className="text-right">
                    <button 
                      className="btn btn-danger btn-sm" 
                      onClick={() => removeFromCart(item.sku)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
            {cart.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center">Cart is empty</td>
              </tr>
            )}
          </tbody>
          {cart.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={6} className="text-right"><strong>Sub Total (before discount):</strong></td>
                <td className="text-right"><strong>Rs. {money(subTotal)}</strong></td>
                <td></td>
              </tr>
              {cart.some(item => item.discount > 0) && (
                <tr>
                  <td colSpan={6} className="text-right text-success"><strong>Total Savings:</strong></td>
                  <td className="text-right text-success">
                    <strong>- Rs. {money(cart.reduce((sum, item) => sum + (item.qty * item.discount), 0))}</strong>
                  </td>
                  <td></td>
                </tr>
              )}
              <tr>
                <td colSpan={6} className="text-right"><strong>Final Total:</strong></td>
                <td className="text-right">
                  <strong>Rs. {money(cart.reduce((sum, item) => sum + (item.qty * (item.price - item.discount)), 0))}</strong>
                </td>
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

      {/* Final Discount Modal */}
      {showFinalDiscountModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ minWidth: '400px', maxWidth: '500px' }}>
            <h3 className="mb-4">Add Final Bill Discount</h3>
            
            <div className="input-group mb-4">
              <label>Additional Discount (Rs.)</label>
              <input
                type="number"
                value={finalDiscount}
                onChange={(e) => setFinalDiscount(Math.max(0, Number(e.target.value)))}
                min="0"
                placeholder="Enter additional discount amount"
                autoFocus
              />
            </div>

            <div className="mb-4" style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Invoice No:</span>
                <strong>{pendingInvoiceNo}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Additional Discount:</span>
                <strong>Rs. {money(finalDiscount)}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn"
                onClick={() => {
                  setShowFinalDiscountModal(false);
                  setFinalDiscount(0);
                  setPendingInvoiceNo("");
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={printInvoice}
              >
                Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}