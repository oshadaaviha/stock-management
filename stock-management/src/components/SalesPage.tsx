import { useState, useEffect, useRef } from 'react';
import type { Product, CartItem, Customer } from '../types';
import { money } from '../utils';
import { salesApi, productsApi, customersApi } from '../api';

export function SalesPage({ products, setProducts }: { products: Product[]; setProducts: (p: Product[]) => void }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sku, setSku] = useState("");
  const [qty, setQty] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [packSize, setPackSize] = useState("");
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerVat, setCustomerVat] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchNo, setBatchNo] = useState("");
  const [paymentType, setPaymentType] = useState("Cash");
  const [routeRepCode, setRouteRepCode] = useState("");
  const [salesRep, setSalesRep] = useState("");
  const [loading, setLoading] = useState(false);
  const [productBatches, setProductBatches] = useState<any[]>([]);
  const [allBatchesBySku, setAllBatchesBySku] = useState<Record<string, any[]>>({});
  const [selectedItemBatch, setSelectedItemBatch] = useState<string>("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showFinalDiscountModal, setShowFinalDiscountModal] = useState(false);
  const [finalDiscount, setFinalDiscount] = useState(0);
  const [pendingInvoiceNo, setPendingInvoiceNo] = useState("");

  // dropdown states
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const prodRef = useRef<HTMLDivElement | null>(null);
  const custRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // load customers for suggestions (only system-added customers)
    (async () => {
      try {
        const data = await customersApi.getAll();
        // Filter to show only manually added customers (not auto-created from sales)
        const systemCustomers = (data || []).filter((c: any) => c.is_system !== false);
        setCustomers(systemCustomers);
      } catch (e) {
        // ignore errors for suggestions
      }
    })();

    // Prefetch all existing stock batches and purchase item rows grouped by SKU
    loadStockMappings();

    function onDocClick(e: MouseEvent) {
      if (prodRef.current && !prodRef.current.contains(e.target as Node)) setShowProductDropdown(false);
      if (custRef.current && !custRef.current.contains(e.target as Node)) setShowCustomerDropdown(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  // Load both purchase_items and stock_batches and normalize as selectable variants
  async function loadStockMappings() {
    try {
      const [rb, rp] = await Promise.all([
        fetch('/api/stock/batches'), // stock_batches
        fetch('/api/stock') // purchase_items
      ]);
      const grouped: Record<string, any[]> = {};

      if (rb.ok) {
        const rows = await rb.json();
        for (const b of rows) {
          if (!grouped[b.sku]) grouped[b.sku] = [];
          grouped[b.sku].push({ ...b, source: 'batch', batch_number: b.batch_number });
        }
      }

      if (rp.ok) {
        const rows = await rp.json();
        for (const pi of rows) {
          if (!grouped[pi.sku]) grouped[pi.sku] = [];
          // normalize fields to match batch shape as much as possible
          grouped[pi.sku].push({
            id: `pi-${pi.id}`,
            product_id: pi.product_id,
            sku: pi.sku,
            name: pi.name,
            batch_number: `PI#${pi.id}`,
            mfg_date: pi.mfg_date,
            exp_date: pi.exp_date,
            pack_size: pi.pack_size,
            cost: pi.cost,
            price: pi.price,
            quantity: pi.quantity,
            line_total: pi.line_total,
            status: 'Active',
            source: 'pi'
          });
        }
      }

      // Sort per SKU by expiry ascending (nulls last)
      Object.keys(grouped).forEach(skuKey => {
        grouped[skuKey].sort((a,b) => {
          const ae = a.exp_date ? new Date(a.exp_date).getTime() : 8640000000000000;
          const be = b.exp_date ? new Date(b.exp_date).getTime() : 8640000000000000;
          return ae - be;
        });
      });

      setAllBatchesBySku(grouped);
    } catch {/* ignore */}
  }

  function loadBatchesForSku(skuCode: string) {
    setProductBatches(allBatchesBySku[skuCode] || []);
  }

  // Helpers to compute available quantity from purchase_items data (quantities are in UNITS)
  function getPiAvailableForSku(skuCode: string) {
    const variants = allBatchesBySku[skuCode] || [];
    return variants.filter(v => v.source === 'pi').reduce((sum, v) => sum + Number(v.quantity || 0), 0);
  }
  function getPiAvailableForBatch(skuCode: string, batch: string) {
    const variants = allBatchesBySku[skuCode] || [];
    const row = variants.find(v => v.source === 'pi' && v.batch_number === batch);
    return row ? Number(row.quantity || 0) : 0;
  }
  // Parse pack size like "10" or "6x10" to total units-per-pack (10, 60)
  function packUnitsFrom(size?: string) {
    const nums = (size || '').match(/\d+/g)?.map(Number);
    if (!nums || nums.length === 0) return 1;
    return nums.reduce((a,b)=>a*b,1);
  }

  function addToCart() {
    const p = products.find((x) => x.sku === sku);
    if (!p) return alert("Product not found");
    
    // Allow qty = 0 (for write-offs, samples, etc.) - skip stock validation
    if (qty > 0) {
      // Validate against purchase_items stock in PACKS (not units)
      let available = 0;
      let usedInCartPacks = 0;
      if (selectedItemBatch && selectedItemBatch.startsWith('PI#')) {
        available = getPiAvailableForBatch(p.sku, selectedItemBatch);
        usedInCartPacks = cart
          .filter(i => i.sku === p.sku && (i as any).batchNo === selectedItemBatch)
          .reduce((s, i) => s + i.qty, 0);
      } else {
        available = getPiAvailableForSku(p.sku);
        usedInCartPacks = cart.filter(i => i.sku === p.sku).reduce((s, i) => s + i.qty, 0);
      }
      // Check if we have enough PACKS
      if (available - usedInCartPacks < qty) return alert("Not enough stock");
    }
    
    // Calculate discount amount from percentage
    const discountAmount = (Number(p.price) * discount) / 100;
    
    const existing = cart.find((i) => i.sku === p.sku && (selectedItemBatch ? (i as any).batchNo === selectedItemBatch : !(i as any).batchNo));
    if (existing) {
      // Re-validate with purchase_items before increasing (only if qty > 0)
      if (qty > 0) {
        if (selectedItemBatch && selectedItemBatch.startsWith('PI#')) {
          const avail = getPiAvailableForBatch(p.sku, selectedItemBatch);
          const existingPacks = existing.qty;
          if (avail < existingPacks + qty) return alert("Not enough stock");
        } else {
          const avail = getPiAvailableForSku(p.sku);
          const totalInCartPacks = cart.filter(i => i.sku === p.sku).reduce((s,i)=>s + i.qty, 0);
          if (avail < totalInCartPacks + qty) return alert("Not enough stock");
        }
      }
      setCart(c => c.map((i) => (i.sku === p.sku ? { ...i, qty: i.qty + qty } : i)));
    } else {
      const batchObj = selectedItemBatch ? productBatches.find(b => b.batch_number === selectedItemBatch) : undefined;
  // Use only user-entered pack size (don't auto-fill from batch)
  const effectivePackSize = packSize || "";
      const effectivePrice = batchObj && typeof batchObj.price === 'number' ? Number(batchObj.price) : Number(p.price);
      // If variant came from purchase items normalization, keep PI# prefix for backend logic
      setCart(c => [...c, {
        sku: p.sku,
        name: p.name,
        price: effectivePrice,
        discount: discountAmount,
        qty, // packs
        packSize: effectivePackSize, // string form
        unitsPerPack: packUnitsFrom(effectivePackSize),
        ...(selectedItemBatch ? { batchNo: selectedItemBatch } : {})
      }]);
    }
    setSku("");
    setQty(1);
    setDiscount(0);
    setPackSize("");
    setSelectedItemBatch("");
    setProductBatches([]);
  }

  function removeFromCart(sku: string, batchNo?: string) {
    setCart(cart.filter(item => !(item.sku === sku && ((item as any).batchNo || undefined) === (batchNo || undefined))));
  }

  function selectCustomer(customer: Customer) {
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone || "");
    setCustomerAddress(customer.customer_address || "");
    setCustomerVat(customer.customer_vat || "");
    setCustomerCode(`CUST-${customer.id.toString().padStart(4, '0')}`);
    setRouteRepCode(customer.route || "");
    setSelectedCustomerId(customer.id);
    setShowCustomerDropdown(false);
  }

  async function checkout() {
    if (cart.length === 0) return alert("Cart is empty");
    if (!customerName.trim()) return alert("Please enter customer name");
    
    try {
      setLoading(true);
      
      // Validate stock availability against purchase_items (same as Stock page)
      // 1) Build availability per PI row (PI#id) for each SKU
      const piAvailBySku: Record<string, { batch: string; qty: number }[]> = {};
      for (const p of products) {
        const variants = (allBatchesBySku[p.sku] || []).filter(v => v.source === 'pi');
        if (variants.length) {
          piAvailBySku[p.sku] = variants.map(v => ({ batch: v.batch_number, qty: Number(v.quantity || 0) }));
        }
      }

      // Helper to sum current available for a SKU
      const sumAvail = (skuCode: string) => (piAvailBySku[skuCode] || []).reduce((s,r)=> s + Math.max(0, r.qty), 0);

  // 2) Reserve quantities for items with specific PI batch first (units)
  for (const item of cart) {
    const batchNo = (item as any).batchNo as string | undefined;
    if (batchNo && batchNo.startsWith('PI#')) {
      const rows = piAvailBySku[item.sku] || [];
      const row = rows.find(r => r.batch === batchNo);
      const available = row ? row.qty : 0;
      const requiredUnits = item.qty * packUnitsFrom((item as any).packSize);
      if (available < requiredUnits) {
        const product = products.find(p => p.sku === item.sku);
        alert(`Insufficient stock for ${product?.name || item.sku}. Available: ${available}, Requested: ${requiredUnits}`);
        setLoading(false);
        return;
      }
      row!.qty -= requiredUnits;
    }
  }

  // 3) Reserve quantities for items without a specific PI batch using FIFO (units)
  for (const item of cart) {
    const batchNo = (item as any).batchNo as string | undefined;
    if (batchNo && batchNo.startsWith('PI#')) continue; // already handled
    const rows = piAvailBySku[item.sku] || [];
    let remaining = item.qty * packUnitsFrom((item as any).packSize);
    for (const r of rows) {
      if (remaining <= 0) break;
      const take = Math.min(r.qty, remaining);
      if (take > 0) {
        r.qty -= take;
        remaining -= take;
      }
    }
    if (remaining > 0) {
      const product = products.find(p => p.sku === item.sku);
      const available = sumAvail(item.sku);
      const requiredUnits = item.qty * packUnitsFrom((item as any).packSize);
      alert(`Insufficient stock for ${product?.name || item.sku}. Available: ${available}, Requested: ${requiredUnits}`);
      setLoading(false);
      return;
    }
  }

  // Calculate totals with discounts
  const subTotal = cart.reduce((sum, item) => sum + item.qty * Number(item.price), 0);
  const totalDiscount = cart.reduce((sum, item) => sum + item.qty * Number(item.discount), 0);
  const vatRate = 0.18;
  const vatAmount = (subTotal - totalDiscount) * vatRate;
  const total = subTotal - totalDiscount + vatAmount;

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
      batchNo: (item as any).batchNo || undefined,
      packSize: (item as any).packSize || undefined,
      lineTotal: item.qty * netPrice
    };
  });

  // Create sale record
  const result = await salesApi.create({
    customer: {
      name: customerName.trim(),
      phone: customerPhone.trim() || undefined,
      customer_address: (selectedCustomerId ? (customers.find(c => c.id === selectedCustomerId)?.customer_address || "") : customerAddress).trim() || undefined,
      customer_vat: (selectedCustomerId ? (customers.find(c => c.id === selectedCustomerId)?.customer_vat || "") : customerVat).trim() || undefined,
      sales_rep_id: selectedCustomerId || undefined
    },
    items: saleItems,
    tax: vatAmount,
    discount: totalDiscount,
    subTotal,
    total,
    invoiceDate,
    batchNo: batchNo.trim() || undefined,
    paymentType: paymentType || undefined,
    routeRepCode: routeRepCode.trim() || undefined,
    salesRepName: salesRep.trim() || undefined
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
      setSelectedCustomerId(null);
      setCustomerCode("");
      setCustomerAddress("");
      setCustomerVat("");
      setRouteRepCode("");
      setSalesRep("");
      setBatchNo("");
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setPaymentType("Cash");
      
    } catch (err: any) {
      console.error("Sale error:", err);
      alert("Failed to process sale: " + (err?.message ?? "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  // Calculate totals for display
  const subTotal = cart.reduce((sum, item) => sum + (item.qty * (item.price - item.discount)), 0);
  const vatRate = 0.18;
  const vatAmount = subTotal * vatRate;
  const grandTotal = subTotal + vatAmount;

  async function printInvoice() {
    try {
      // Get and show invoice with final discount applied
      const invoiceHtml = await salesApi.getInvoice(pendingInvoiceNo, { 
        format: 'overlay',
        finalDiscount: finalDiscount 
      });
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
      
      <div className="card"  style={{
    position: 'relative',
    zIndex: showCustomerDropdown ? 20 : 1,   // ⬅️ key line
  }}>
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
          <div className="input-group" style={{ flex: 1 }}>
            <label>Invoice Date</label>
            <input 
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>
          <div className="input-group" style={{ flex: 1 }}>
            <label>Batch No.</label>
            <input 
              value={batchNo}
              onChange={(e) => setBatchNo(e.target.value)}
              placeholder="Batch number"
            />
          </div>
          <div className="input-group" style={{ flex: 1 }}>
            <label>Payment Type</label>
            <select 
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
            >
              <option value="Cash">Cash</option>
              <option value="Credit">Credit</option>
              <option value="Card">Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>
        </div>
        
        <div className="flex gap-4" style={{ marginTop: 12 }}>
          <div className="input-group" style={{ flex: 2 }} ref={custRef}>
            <label>Customer Name</label>
            <div style={{ position: 'relative' }}>
              <input 
                value={customerName}
                onChange={(e) => { 
                  setCustomerName(e.target.value); 
                  setShowCustomerDropdown(true);
                  // Clear selected customer when manually editing
                  if (selectedCustomerId) {
                    setSelectedCustomerId(null);
                    setCustomerCode("");
                    setCustomerAddress("");
                    setCustomerVat("");
                    setRouteRepCode("");
                  }
                }}
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
                      onClick={() => selectCustomer(c)} 
                      style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    >
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>
                        {c.phone && <span>📞 {c.phone}</span>}
                        {c.phone && c.customer_vat && <span style={{ marginLeft: 8 }}>|</span>}
                        {c.customer_vat && <span style={{ marginLeft: 8 }}>VAT: {c.customer_vat}</span>}
                      </div>
                      {c.customer_address && (
                        <div style={{ fontSize: 11, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          📍 {c.customer_address}
                        </div>
                      )}
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
          <div className="input-group" style={{ flex: 1 }}>
            <label>Sales Rep</label>
            <input 
              value={salesRep}
              onChange={(e) => setSalesRep(e.target.value)}
              placeholder="Sales representative"
            />
          </div>
        </div>
        
        {/* Customer Details Display */}
        {selectedCustomerId && (
          <div style={{ 
            marginTop: 12, 
            padding: 12, 
            backgroundColor: '#f8f9fa', 
            borderRadius: 6, 
            border: '1px solid #e9ecef' 
          }}>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13 }}>
              {customerCode && (
                <div>
                  <strong style={{ color: '#495057' }}>Customer Code:</strong>
                  <span style={{ marginLeft: 6, color: '#6c757d' }}>{customerCode}</span>
                </div>
              )}
              {customerVat && (
                <div>
                  <strong style={{ color: '#495057' }}>VAT Number:</strong>
                  <span style={{ marginLeft: 6, color: '#6c757d' }}>{customerVat}</span>
                </div>
              )}
              {routeRepCode && (
                <div>
                  <strong style={{ color: '#495057' }}>Route/Rep Code:</strong>
                  <span style={{ marginLeft: 6, color: '#6c757d' }}>{routeRepCode}</span>
                </div>
              )}
              {customerAddress && (
              <div>
                <strong style={{ color: '#495057' }}>Address:</strong>
                <span style={{ marginLeft: 6, color: '#6c757d' }}>{customerAddress}</span>
              </div>
            )}
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ position: 'relative',
    zIndex: showProductDropdown ? 20 : 1,}}>
        <div className="flex gap-4">
          <div className="input-group" style={{ flex: 2 }} ref={prodRef}>
            <label>Product SKU</label>
            <div style={{ position: 'relative' }}>
              <input 
                placeholder="Enter SKU or product name" 
                value={sku} 
                onChange={(e) => { setSku(e.target.value); setShowProductDropdown(true); }}
                onFocus={() => setShowProductDropdown(true)}
                onBlur={() => { /* keep open managed by doc click */ }}
              />
              {showProductDropdown && sku.trim() && (
                <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 6px)', background: 'white', border: '1px solid #ddd', borderRadius: 6, boxShadow: '0 6px 18px rgba(0,0,0,0.08)', zIndex: 40, maxHeight: 260, overflow: 'auto' }}>
                  {products.filter(p => 
                    (p.name.toLowerCase().includes(sku.trim().toLowerCase()) || p.sku.toLowerCase().includes(sku.trim().toLowerCase())) &&
                    allBatchesBySku[p.sku]?.length > 0
                  ).slice(0,10).map(p => (
                    <div key={p.id} style={{ padding: '10px 12px', borderBottom: '1px solid #f5f5f5' }}>
                      {/* Product header row (click selects product only when no batches) */}
                      <div 
                        onClick={() => {
                          if (!allBatchesBySku[p.sku] || allBatchesBySku[p.sku].length === 0) {
                            setSku(p.sku);
                            setShowProductDropdown(false);
                            loadBatchesForSku(p.sku);
                          }
                        }} 
                        style={{ cursor: (!allBatchesBySku[p.sku] || allBatchesBySku[p.sku].length === 0) ? 'pointer' : 'default' }}
                      >
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>
                          {p.sku} • {p.category ?? ''}
                          {Number(p.discount) > 0 && (
                            <span className="text-success"> • Discount: Rs. {money(p.discount)}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12 }}>
                          <span>Base Price: Rs. {money(p.price)}</span>
                          {Number(p.discount) > 0 && (
                            <>
                              <span className="text-decoration-line-through text-muted ms-2">Rs. {money(p.price)}</span>
                              <span className="text-success ms-2">Rs. {money(p.price - p.discount)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Batch list */}
                      {allBatchesBySku[p.sku]?.length > 0 && (
                        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {allBatchesBySku[p.sku].map(b => (
                            <div
                              key={b.id}
                              onClick={() => {
                                setSku(p.sku);
                                setSelectedItemBatch(b.batch_number);
                                setShowProductDropdown(false);
                                setProductBatches(allBatchesBySku[p.sku] || []);
                                // Don't auto-fill pack size - let user enter manually
                              }}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: 11,
                                padding: '6px 8px',
                                border: '1px solid #eee',
                                borderRadius: 4,
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                            >
                              <div>
                                <strong>{b.batch_number}</strong>
                                <span style={{ marginLeft: 8 }}>Pack: {b.pack_size || '-'}</span>
                                <span style={{ marginLeft: 8 }}>Exp: {b.exp_date ? new Date(b.exp_date).toLocaleDateString() : '-'}</span>
                              </div>
                              <div>
                                Qty: {b.quantity} units
                                {typeof b.price === 'number' && (
                                  <span style={{ marginLeft: 8 }}>Price: Rs. {money(b.price)}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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
                        <div className="text-muted">Stock: {(() => {
                          const variants = allBatchesBySku[selectedProduct.sku] || [];
                          const piSum = variants.filter(v => v.source==='pi').reduce((s,v)=>s+Number(v.quantity||0),0);
                          return piSum || selectedProduct.qty;
                        })()} units</div>
                        {productBatches.length > 0 && !selectedItemBatch && (
                          <div style={{ marginTop: 6 }}>
                            <label style={{ fontSize: 12, fontWeight: 600 }}>Select Batch:</label>
                            <select
                              value={selectedItemBatch}
                              onChange={(e) => setSelectedItemBatch(e.target.value)}
                              style={{ width: '100%', marginTop: 4 }}
                            >
                              <option value="">(Any / Auto)</option>
                              {productBatches.map(b => (
                                <option key={b.id} value={b.batch_number}>
                                  {b.batch_number} • Qty {b.quantity} • Exp {b.exp_date ? new Date(b.exp_date).toLocaleDateString() : '-'}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
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
            <label>Pack Size</label>
            <input
              type="text"
              value={packSize}
              onChange={(e) => setPackSize(e.target.value)}
              placeholder="e.g. 10, 6x10, bottle"
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
                  setQty(val === '' ? 0 : Math.max(0, Number(val)));
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
                <tr key={`${item.sku}|${(item as any).batchNo || ''}|${(item as any).packSize || ''}`}>
                  <td>{item.sku}</td>
                  <td>{item.name}{(item as any).batchNo ? ` • ${(item as any).batchNo}` : ''}{(item as any).packSize ? ` • ${ (item as any).packSize}` : ''}</td>
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
                      onClick={() => removeFromCart(item.sku, (item as any).batchNo)}
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
                <td colSpan={6} className="text-right"><strong>VAT (18%):</strong></td>
                <td className="text-right">
                  <strong>Rs. {money(vatAmount)}</strong>
                </td>
                <td></td>
              </tr>
              <tr>
                <td colSpan={6} className="text-right"><strong>Grand Total (with VAT):</strong></td>
                <td className="text-right">
                  <strong>Rs. {money(grandTotal)}</strong>
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