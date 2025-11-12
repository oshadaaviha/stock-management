import { useState, useRef, useEffect, useMemo } from 'react';
import type { Product } from '../types';
import { purchaseApi, productsApi } from '../api';
import { suppliersApi } from '../api/suppliers';
import type { Supplier } from '../api/suppliers';

export function PurchasePage({ products, setProducts }: { products: Product[]; setProducts: (p: Product[]) => void }) {
  // Header fields
  const [refNo, setRefNo] = useState(() => `PO-${Date.now()}`);
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [batchNumber, setBatchNumber] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Quick add controls
  const [query, setQuery] = useState('');
  const [mfgDate, setMfgDate] = useState('');
  const [expDate, setExpDate] = useState('');
  const [packSize, setPackSize] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [qty, setQty] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Items cart
  type PurchaseRow = { id: string; productId: number; sku: string; name: string; mfgDate: string; expDate: string; packSize: string; price: number; cost: number; qty: number; currentQty: number; };
  const [items, setItems] = useState<PurchaseRow[]>([]);

  // Load suppliers
  useEffect(() => {
    suppliersApi.list().then(setSuppliers).catch(() => setSuppliers([]));
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as Product[];
    return products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)).slice(0, 8);
  }, [products, query]);

  function addItem(p: Product) {
    setItems(prev => [
      ...prev,
      {
        id: `${p.id}-${Date.now()}`,
        productId: p.id,
        sku: p.sku,
        name: p.name,
        mfgDate: mfgDate,
        expDate: expDate,
        packSize: packSize,
        price: price || p.price || 0,
        cost: cost || p.cost || 0,
        qty: qty,
        currentQty: p.qty
      }
    ]);
    setQuery('');
    setMfgDate('');
    setExpDate('');
    setPackSize('');
    setPrice(0);
    setCost(0);
    setQty(0);
    setShowDropdown(false);
  }

  function updateRow(id: string, patch: Partial<PurchaseRow>) {
    setItems(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  }
  function removeRow(id: string) {
    setItems(prev => prev.filter(r => r.id !== id));
  }
  function resetForm() {
    setItems([]);
    setRefNo(`PO-${Date.now()}`);
    setSupplierId('');
    setBatchNumber('');
    setQuery('');
    setMfgDate('');
    setExpDate('');
    setPackSize('');
    setPrice(0);
    setCost(0);
    setQty(0);
  }

  const subTotal = items.reduce((sum, r) => sum + (r.qty * r.cost), 0);

  async function savePurchase() {
    if (items.length === 0) return alert('Please add at least one item');
    if (items.some(i => i.qty <= 0 || i.cost <= 0)) return alert('Each row needs qty > 0 and cost > 0');
    if (!batchNumber) return alert('Batch number required');
    if (items.some(i => !i.mfgDate || !i.expDate || !i.packSize)) return alert('All product fields required');

    try {
      setLoading(true);
      await purchaseApi.create({
        refNo: refNo.trim() || undefined,
        supplier: supplierId ? suppliers.find(s => s.id === supplierId)?.name : undefined,
        batch_number: batchNumber,
        items: items.map(i => ({
          productId: i.productId,
          mfg_date: i.mfgDate,
          exp_date: i.expDate,
          pack_size: i.packSize,
          price: i.price,
          cost: i.cost,
          qty: i.qty
        }))
      });

      // Refresh products to reflect new stock and cost
      const updated = await productsApi.getAll();
      setProducts(updated);

      resetForm();
      alert('Purchase recorded successfully');
    } catch (err: any) {
      console.error(err);
      alert('Failed to record purchase: ' + (err?.message ?? 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card vstack">
      <h2>Purchases / Stock In</h2>

      {/* Header fields */}
      <div className="card" style={{ background: '#f8f9fa', padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div className="input-group">
            <label>Reference No.</label>
            <input 
              value={refNo} 
              onChange={e => setRefNo(e.target.value)} 
              placeholder="Auto or custom PO no"
              style={{ width: '100%' }}
            />
          </div>
          <div className="input-group">
            <label>Supplier</label>
            <select 
              value={supplierId} 
              onChange={e => setSupplierId(e.target.value ? Number(e.target.value) : '')}
              style={{ width: '100%' }}
            >
              <option value="">-- Select Supplier (Optional) --</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label>Batch Number *</label>
            <input 
              value={batchNumber} 
              onChange={e => setBatchNumber(e.target.value)} 
              placeholder="Batch number"
              style={{ width: '100%' }}
            />
          </div>
          <div className="input-group">
            <label>Date</label>
            <input 
              type="date" 
              value={new Date().toISOString().split('T')[0]} 
              readOnly 
              style={{ background:'#e9ecef', width: '100%' }} 
            />
          </div>
        </div>
      </div>

      {/* Quick add row */}
      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginBottom: 16, fontSize: 16, color: '#0a5066' }}>Add Product to Purchase</h3>
        <div ref={dropdownRef} style={{ marginBottom: 12 }}>
          <div className="input-group" style={{ marginBottom: 12 }}>
            <label>Product *</label>
            <div style={{ position: 'relative' }}>
              <input
                placeholder="Enter SKU or product name"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                style={{ width: '100%' }}
              />
              {showDropdown && query.trim() && (
                <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 6px)', background: 'white', border: '1px solid #ddd', borderRadius: 6, boxShadow: '0 6px 18px rgba(0,0,0,0.08)', zIndex: 40, maxHeight: 220, overflow: 'auto' }}>
                  {filteredProducts.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => addItem(p)} 
                      style={{ 
                        padding: '8px 12px', 
                        cursor: 'pointer',
                        borderBottom: '1px solid #f0f0f0'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{p.sku} • {p.category ?? ''} • Stock: {p.qty}</div>
                    </div>
                  ))}
                  {filteredProducts.length === 0 && <div style={{ padding: 12, color: '#666' }}>No matching products</div>}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            <div className="input-group">
              <label>MFG Date *</label>
              <input type="date" value={mfgDate} onChange={e => setMfgDate(e.target.value)} style={{ width: '100%' }} />
            </div>
            <div className="input-group">
              <label>EXP Date *</label>
              <input type="date" value={expDate} onChange={e => setExpDate(e.target.value)} style={{ width: '100%' }} />
            </div>
            <div className="input-group">
              <label>Pack Size *</label>
              <input value={packSize} onChange={e => setPackSize(e.target.value)} placeholder="e.g. 10x10" style={{ width: '100%' }} />
            </div>
            <div className="input-group">
              <label>Price (Rs.)</label>
              <input type="number" value={price || ''} step="0.01" min={0} onChange={e => setPrice(Math.max(0, Number(e.target.value)))} placeholder="0.00" style={{ width: '100%' }} />
            </div>
            <div className="input-group">
              <label>Cost (Rs.) *</label>
              <input type="number" value={cost || ''} step="0.01" min={0} onChange={e => setCost(Math.max(0, Number(e.target.value)))} placeholder="0.00" style={{ width: '100%' }} />
            </div>
            <div className="input-group">
              <label>Quantity *</label>
              <input type="number" value={qty || ''} min={0} onChange={e => setQty(Math.max(0, Number(e.target.value)))} placeholder="0" style={{ width: '100%' }} />
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
          * Required fields. Select a product from the dropdown to add it to the purchase list below.
        </div>
      </div>

      {/* Items table */}
      {items.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3 style={{ marginBottom: 16, fontSize: 16, color: '#0a5066' }}>Purchase Items ({items.length})</h3>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>#</th>
                  <th style={{ minWidth: 180 }}>Product</th>
                  <th style={{ minWidth: 100 }}>SKU</th>
                  <th style={{ minWidth: 120 }}>MFG Date</th>
                  <th style={{ minWidth: 120 }}>EXP Date</th>
                  <th style={{ minWidth: 100 }}>Pack Size</th>
                  <th style={{ minWidth: 90, textAlign: 'right' }}>Price</th>
                  <th style={{ minWidth: 90, textAlign: 'right' }}>Cost</th>
                  <th style={{ minWidth: 80, textAlign: 'right' }}>Qty</th>
                  <th style={{ minWidth: 90, textAlign: 'right' }}>In Stock</th>
                  <th style={{ minWidth: 120, textAlign: 'right' }}>Line Total</th>
                  <th style={{ width: 100, textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r, idx) => (
                  <tr key={r.id}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#666' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 500 }}>{r.name}</td>
                    <td style={{ color: '#666', fontSize: 13 }}>{r.sku}</td>
                    <td><input type="date" value={r.mfgDate} onChange={e => updateRow(r.id, { mfgDate: e.target.value })} style={{ width: '100%', fontSize: 13 }} /></td>
                    <td><input type="date" value={r.expDate} onChange={e => updateRow(r.id, { expDate: e.target.value })} style={{ width: '100%', fontSize: 13 }} /></td>
                    <td><input value={r.packSize} onChange={e => updateRow(r.id, { packSize: e.target.value })} style={{ width: '100%', fontSize: 13 }} /></td>
                    <td><input type="number" min={0} step="0.01" value={r.price} onChange={e => updateRow(r.id, { price: Math.max(0, Number(e.target.value)) })} style={{ width: '100%', textAlign: 'right', fontSize: 13 }} /></td>
                    <td><input type="number" min={0} step="0.01" value={r.cost} onChange={e => updateRow(r.id, { cost: Math.max(0, Number(e.target.value)) })} style={{ width: '100%', textAlign: 'right', fontSize: 13 }} /></td>
                    <td><input type="number" min={0} value={r.qty} onChange={e => updateRow(r.id, { qty: Math.max(0, Number(e.target.value)) })} style={{ width: '100%', textAlign: 'right', fontSize: 13 }} /></td>
                    <td style={{ textAlign: 'right', color: '#666', fontSize: 13 }}>{r.currentQty}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 14 }}>Rs. {(r.qty * r.cost).toFixed(2)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="btn btn-danger btn-sm" 
                        onClick={() => removeRow(r.id)}
                        style={{ fontSize: 12, padding: '4px 12px' }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8f9fa' }}>
                  <td colSpan={10} style={{ textAlign: 'right', fontWeight: 600, fontSize: 14, padding: '12px' }}>
                    Sub Total:
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 16, color: '#0a5066', padding: '12px' }}>
                    Rs. {subTotal.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-end" style={{ marginTop: 16, gap: 12 }}>
        <button 
          className="btn btn-secondary" 
          onClick={resetForm} 
          disabled={loading}
          style={{ minWidth: 120 }}
        >
          Reset Form
        </button>
        <button 
          className="btn btn-primary" 
          onClick={savePurchase} 
          disabled={loading || items.length === 0}
          style={{ minWidth: 160 }}
        >
          {loading ? 'Saving...' : `Record Purchase (${items.length} item${items.length !== 1 ? 's' : ''})`}
        </button>
      </div>
    </section>
  );
}