import { useState, useEffect } from 'react';
import { money } from '../utils';
import type { AggregatedStockRow } from '../types';

/** What the API returns for a stock row (from purchase_items + products) */
type StockBatchRow = {
  id: number;
  purchase_id: number;
  product_id: number;
  sku: string;
  name: string;
  mfg_date: string;
  exp_date: string;
  pack_size: string;
  price: number;
  cost: number;
  quantity: number;
  line_total: number;
};

/** What the form edits (no id / no joined product fields) */
type StockFormData = Omit<
  StockBatchRow,
  'id' | 'name' | 'sku' | 'created_at' | 'updated_at'
>;

type ViewMode = 'purchaseItems' | 'batches' | 'aggregate';

const stockApi = {
  async getAll(): Promise<StockBatchRow[]> {
    const r = await fetch(`/api/stock`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },
  async getBatches(): Promise<(StockBatchRow & { batch_number?: string; status?: string })[]> {
    const r = await fetch(`/api/stock/batches`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },
  async getAggregate(): Promise<AggregatedStockRow[]> {
    const r = await fetch(`/api/stock/aggregate`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },

  // what backend needs to create/update a batch
  async create(payload: { sku: string } & StockFormData) {
    const r = await fetch(`/api/stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },

  async update(id: number, payload: { sku: string } & StockFormData) {
    const r = await fetch(`/api/stock/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },

  async remove(id: number) {
    const r = await fetch(`/api/stock/${id}`, { method: 'DELETE' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },
};

export function StockPage() {
  const [mode, setMode] = useState<ViewMode>('purchaseItems');
  const [stockRows, setStockRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStock(mode); }, [mode]);

  async function loadStock(view: ViewMode) {
    try {
      setLoading(true);
      if (view === 'purchaseItems') {
        const data = await stockApi.getAll();
        setStockRows(data);
      } else if (view === 'batches') {
        const data = await stockApi.getBatches();
        setStockRows(data);
      } else {
        const data = await stockApi.getAggregate();
        setStockRows(data);
      }
    } catch (err: any) {
      alert('Failed to load stock: ' + (err?.message ?? 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card vstack">
      <h2>Stock Overview</h2>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <span className="muted">View:</span>
        <div className="btn-group">
          <button className={`btn ${mode==='purchaseItems' ? '' : 'ghost'}`} onClick={() => setMode('purchaseItems')}>Purchase Items</button>
          <button className={`btn ${mode==='batches' ? '' : 'ghost'}`} onClick={() => setMode('batches')}>Stock Batches</button>
          <button className={`btn ${mode==='aggregate' ? '' : 'ghost'}`} onClick={() => setMode('aggregate')}>Aggregated</button>
        </div>
      </div>
      <p className="muted">
        {mode==='purchaseItems' && 'Rows as recorded in purchases, grouped by SKU and sorted by expiry.'}
        {mode==='batches' && 'Per-batch stock from stock_batches with batch number and status.'}
        {mode==='aggregate' && 'Per product totals with earliest/latest expiry and total stock values.'}
      </p>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading stock...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          {mode==='purchaseItems' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Pack Size</th>
                  <th>Mfg Date</th>
                  <th>Exp Date</th>
                  <th>Cost</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {stockRows.map((batch: StockBatchRow) => (
                  <tr key={batch.id}>
                    <td><strong>{batch.sku}</strong></td>
                    <td>{batch.name}</td>
                    <td>{batch.pack_size}</td>
                    <td>{batch.mfg_date ? new Date(batch.mfg_date).toLocaleDateString() : '-'}</td>
                    <td>
                      {batch.exp_date ? (
                        <span style={{ 
                          color: new Date(batch.exp_date) < new Date() ? 'red' : 
                                 new Date(batch.exp_date) < new Date(Date.now() + 90*24*60*60*1000) ? 'orange' : 'inherit'
                        }}>
                          {new Date(batch.exp_date).toLocaleDateString()}
                        </span>
                      ) : '-'}
                    </td>
                    <td>Rs. {money(batch.cost)}</td>
                    <td>Rs. {money(batch.price)}</td>
                    <td>{batch.quantity}</td>
                    <td>Rs. {money(batch.line_total)}</td>
                  </tr>
                ))}
                {stockRows.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>
                      No stock entries found. Add stock through Purchase (Stock-In).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {mode==='batches' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Batch No</th>
                  <th>Pack Size</th>
                  <th>Mfg Date</th>
                  <th>Exp Date</th>
                  <th>Cost</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {stockRows.map((row: any) => (
                  <tr key={row.id}>
                    <td><strong>{row.sku}</strong></td>
                    <td>{row.name}</td>
                    <td>{row.batch_number}</td>
                    <td>{row.pack_size}</td>
                    <td>{row.mfg_date ? new Date(row.mfg_date).toLocaleDateString() : '-'}</td>
                    <td>
                      {row.exp_date ? (
                        <span style={{ 
                          color: new Date(row.exp_date) < new Date() ? 'red' : 
                                 new Date(row.exp_date) < new Date(Date.now() + 90*24*60*60*1000) ? 'orange' : 'inherit'
                        }}>
                          {new Date(row.exp_date).toLocaleDateString()}
                        </span>
                      ) : '-'}
                    </td>
                    <td>Rs. {money(row.cost)}</td>
                    <td>Rs. {money(row.price)}</td>
                    <td>{row.quantity}</td>
                    <td>{row.status}</td>
                    <td>Rs. {money(row.line_total)}</td>
                  </tr>
                ))}
                {stockRows.length === 0 && (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: '40px' }}>
                      No stock batches. Use Purchase or Batch In to add stock.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {mode==='aggregate' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Total Qty</th>
                  <th>Earliest Exp</th>
                  <th>Latest Exp</th>
                  <th>Total Cost Value</th>
                  <th>Total Price Value</th>
                </tr>
              </thead>
              <tbody>
                {stockRows.map((row: AggregatedStockRow) => (
                  <tr key={row.product_id}>
                    <td><strong>{row.sku}</strong></td>
                    <td>{row.name}</td>
                    <td>{row.total_quantity}</td>
                    <td>{row.earliest_exp ? new Date(row.earliest_exp).toLocaleDateString() : '-'}</td>
                    <td>{row.latest_exp ? new Date(row.latest_exp).toLocaleDateString() : '-'}</td>
                    <td>Rs. {money(row.total_cost_value)}</td>
                    <td>Rs. {money(row.total_price_value)}</td>
                  </tr>
                ))}
                {stockRows.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                      No stock found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}