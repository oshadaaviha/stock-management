import { useState, useEffect } from 'react';
import { money } from '../utils';

interface SalesRecord {
  invoice_no: string;
  invoice_date: string;
  customer_name: string;
  customer_phone: string | null;
  payment_type: string | null;
  batch_no: string | null;
  item_count: number;
  sub_total: number;
  tax: number;
  discount: number;
  total: number;
}

export function SalesReferencePage() {
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadSales();
  }, []);

  async function loadSales() {
    try {
      setLoading(true);
      const res = await fetch('/api/sales');
      if (!res.ok) throw new Error('Failed to load sales');
      const data = await res.json();
      setSales(data);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load sales');
    } finally {
      setLoading(false);
    }
  }

  function viewInvoice(invoiceNo: string) {
    window.open(`/api/sales/${invoiceNo}/invoice?format=overlay`, '_blank');
  }

  // Filter sales
  const filteredSales = sales.filter(sale => {
    const matchesSearch = searchTerm === '' || 
      sale.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.customer_phone && sale.customer_phone.includes(searchTerm));
    
    const saleDate = new Date(sale.invoice_date);
    const matchesStartDate = !startDate || saleDate >= new Date(startDate);
    const matchesEndDate = !endDate || saleDate <= new Date(endDate);
    
    return matchesSearch && matchesStartDate && matchesEndDate;
  });

  // Sort filtered sales by date and invoice number descending
  const sortedSales = [...filteredSales].sort((a, b) => {
    const dateA = new Date(a.invoice_date).getTime();
    const dateB = new Date(b.invoice_date).getTime();
    if (dateA !== dateB) return dateB - dateA;
    return b.invoice_no.localeCompare(a.invoice_no);
  });

  // Calculate totals
  const totals = filteredSales.reduce((acc, sale) => ({
    subTotal: acc.subTotal + Number(sale.sub_total),
    tax: acc.tax + Number(sale.tax),
    discount: acc.discount + Number(sale.discount),
    total: acc.total + Number(sale.total)
  }), { subTotal: 0, tax: 0, discount: 0, total: 0 });

  if (loading) return <div className="card">Loading sales...</div>;
  if (error) return <div className="card error">{error}</div>;

  return (
    <section className="card vstack">
      <h2>Sales Reference</h2>
      
      {/* Filters */}
      <div className="card">
        <div className="flex gap-4" style={{ marginBottom: 16 }}>
          <div className="input-group" style={{ flex: 2 }}>
            <label>Search</label>
            <input 
              placeholder="Invoice No, Customer Name, or Phone" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="input-group" style={{ flex: 1 }}>
            <label>Start Date</label>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="input-group" style={{ flex: 1 }}>
            <label>End Date</label>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="input-group" style={{ flex: 0 }}>
            <label>&nbsp;</label>
            <button 
              className="btn secondary" 
              onClick={() => { setSearchTerm(''); setStartDate(''); setEndDate(''); }}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11pt' }}>
          <thead style={{ background: '#0a5066', color: 'white' }}>
            <tr>
              <th style={{ padding: '10px 8px', textAlign: 'left', border: '1px solid #0a5066' }}>Invoice No</th>
              <th style={{ padding: '10px 8px', textAlign: 'left', border: '1px solid #0a5066' }}>Date</th>
              <th style={{ padding: '10px 8px', textAlign: 'left', border: '1px solid #0a5066' }}>Customer</th>
              <th style={{ padding: '10px 8px', textAlign: 'left', border: '1px solid #0a5066' }}>Phone</th>
              <th style={{ padding: '10px 8px', textAlign: 'center', border: '1px solid #0a5066' }}>Payment</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', border: '1px solid #0a5066' }}>Items</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', border: '1px solid #0a5066' }}>Sub Total</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', border: '1px solid #0a5066' }}>Tax</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', border: '1px solid #0a5066' }}>Discount</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', border: '1px solid #0a5066' }}>Total</th>
              <th style={{ padding: '10px 8px', textAlign: 'center', border: '1px solid #0a5066' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedSales.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ padding: 20, textAlign: 'center', color: '#999' }}>
                  No sales found
                </td>
              </tr>
            ) : (
              sortedSales.map((sale) => (
                <tr key={sale.invoice_no} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px', border: '1px solid #eee' }}>
                    <strong>{sale.invoice_no}</strong>
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #eee' }}>
                    {new Date(sale.invoice_date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #eee' }}>
                    {sale.customer_name}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #eee' }}>
                    {sale.customer_phone || '-'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #eee' }}>
                    {sale.payment_type || 'Cash'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #eee' }}>
                    {sale.item_count}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #eee' }}>
                    Rs. {money(sale.sub_total)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #eee' }}>
                    Rs. {money(sale.tax)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #eee' }}>
                    Rs. {money(sale.discount)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #eee', fontWeight: 'bold' }}>
                    Rs. {money(sale.total)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #eee' }}>
                    <button 
                      className="btn ghost small"
                      onClick={() => viewInvoice(sale.invoice_no)}
                      title="View Invoice"
                    >
                      📄 View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {filteredSales.length > 0 && (
            <tfoot style={{ background: '#f8f9fa', fontWeight: 'bold' }}>
              <tr>
                <td colSpan={6} style={{ padding: '10px 8px', textAlign: 'right', border: '1px solid #ddd' }}>
                  TOTALS:
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right', border: '1px solid #ddd' }}>
                  Rs. {money(totals.subTotal)}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right', border: '1px solid #ddd' }}>
                  Rs. {money(totals.tax)}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right', border: '1px solid #ddd' }}>
                  Rs. {money(totals.discount)}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right', border: '1px solid #ddd', background: '#0a5066', color: 'white' }}>
                  Rs. {money(totals.total)}
                </td>
                <td style={{ border: '1px solid #ddd' }}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Summary Stats */}
      <div className="flex gap-4">
        <div className="card" style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '32pt', fontWeight: 'bold', color: '#0a5066' }}>
            {filteredSales.length}
          </div>
          <div style={{ color: '#666', marginTop: 8 }}>Total Sales</div>
        </div>
        <div className="card" style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '32pt', fontWeight: 'bold', color: '#0a5066' }}>
            Rs. {money(totals.total)}
          </div>
          <div style={{ color: '#666', marginTop: 8 }}>Total Revenue</div>
        </div>
        <div className="card" style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '32pt', fontWeight: 'bold', color: '#0a5066' }}>
            Rs. {money(totals.total / (filteredSales.length || 1))}
          </div>
          <div style={{ color: '#666', marginTop: 8 }}>Average Sale</div>
        </div>
      </div>
    </section>
  );
}
