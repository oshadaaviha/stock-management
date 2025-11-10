export function nextInvoiceNo(): string {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const r = Math.floor(1000 + Math.random() * 9000);
  return `INV-${ymd}-${r}`;
}

export function invoiceHtml(inv: {
  company: { name: string; address: string; phone?: string; logoUrl?: string };
  invoice_no: string;
  dateIso: string;
  customer: { name: string; phone?: string; vat?: string; address?: string; salesRep?: string };
  items: Array<{ name: string; qty: number; price: number; discount?: number; line_total: number; pack_size?: string }>;
  sub_total: number; tax: number; discount: number; total: number;
  batchNo?: string; paymentType?: string; routeRepCode?: string;
}) {
  const rows = inv.items.map((i) =>
    `<tr>
       <td style="padding:8px;border:1px solid #0a5066;text-align:left">${i.name}</td>
       <td style="padding:8px;border:1px solid #0a5066;text-align:center">${i.pack_size || ''}</td>
       <td style="padding:8px;border:1px solid #0a5066;text-align:center">${i.qty}</td>
       <td style="padding:8px;border:1px solid #0a5066;text-align:right">Rs. ${i.price.toFixed(2)}</td>
       <td style="padding:8px;border:1px solid #0a5066;text-align:right">${i.discount ? i.discount.toFixed(2) + '%' : '-'}</td>
       <td style="padding:8px;border:1px solid #0a5066;text-align:right">Rs. ${i.line_total.toFixed(2)}</td>
     </tr>`).join("");

  const grossValue = inv.sub_total;
  const totalDiscount = inv.discount;
  const netValue = inv.total;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${inv.invoice_no}</title>
  <style>
    @page { margin: 0.5cm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: Arial, sans-serif; 
      padding: 20px; 
      font-size: 11pt;
    }
    .header-bar { 
      background: #0a5066; 
      height: 8px; 
      margin-bottom: 16px; 
    }
    .company-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 3px solid #0a5066;
    }
    .logo-section {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .logo {
      width: 80px;
      height: 80px;
    }
    .company-name {
      font-size: 18pt;
      font-weight: bold;
      color: #0a5066;
      letter-spacing: 3px;
    }
    .company-tagline {
      font-size: 9pt;
      color: #666;
      letter-spacing: 2px;
    }
    .company-info {
      text-align: right;
      font-size: 10pt;
      line-height: 1.4;
    }
    .company-info strong {
      font-size: 12pt;
      color: #0a5066;
    }
    .invoice-title {
      text-align: center;
      font-size: 24pt;
      font-weight: bold;
      color: #0a5066;
      margin: 20px 0;
      letter-spacing: 2px;
    }
    .info-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }
    .info-row {
      display: flex;
      padding: 4px 0;
      border-bottom: 1px dotted #ccc;
    }
    .info-label {
      font-weight: bold;
      width: 140px;
      color: #333;
    }
    .info-value {
      flex: 1;
      color: #666;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    thead {
      background: #0a5066;
      color: white;
    }
    th {
      padding: 10px 8px;
      text-align: center;
      font-weight: bold;
      border: 1px solid #0a5066;
      font-size: 10pt;
    }
    td {
      font-size: 10pt;
    }
    .totals-section {
      float: right;
      width: 300px;
      margin-top: 10px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 12px;
      border-bottom: 1px solid #ddd;
    }
    .total-row.final {
      background: #0a5066;
      color: white;
      font-weight: bold;
      font-size: 12pt;
      margin-top: 4px;
    }
    .footer {
      clear: both;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #0a5066;
    }
    .footer-note {
      font-size: 9pt;
      color: #666;
      margin-bottom: 30px;
    }
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
    }
    .signature-box {
      text-align: center;
      padding-top: 40px;
      border-top: 1px solid #333;
      width: 200px;
      font-size: 10pt;
    }
    .footer-bar {
      background: #0a5066;
      height: 30px;
      margin-top: 30px;
      border-radius: 0 0 50% 50%;
    }
    @media print {
      body { padding: 10px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header-bar"></div>
  
  <div class="company-header">
    <div class="logo-section">
      <svg class="logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" fill="#0a5066"/>
        <path d="M30,40 L50,25 L70,40 L70,70 L30,70 Z" fill="white"/>
        <path d="M45,35 L55,35 L55,65 L45,65 Z" fill="#0a5066"/>
        <path d="M35,50 L65,50 L65,55 L35,55 Z" fill="#0a5066"/>
      </svg>
      <div>
        <div class="company-name">LENAMA</div>
        <div class="company-tagline">HEALTHCARE</div>
      </div>
    </div>
    <div class="company-info">
      <strong>Lenama Healthcare (Pvt) Ltd</strong><br>
      15 B 1/2, Alfred Place, Colombo 03.<br>
      Tel: +94 11 45 88 355<br>
      Email: info@lenama.lk<br>
      Website: www.lenama.lk
    </div>
  </div>

  <div class="invoice-title">INVOICE</div>

  <div class="info-section">
    <div>
      <div class="info-row">
        <div class="info-label">Customer Code :</div>
        <div class="info-value"></div>
      </div>
      <div class="info-row">
        <div class="info-label">Customer Name :</div>
        <div class="info-value">${inv.customer.name}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Address :</div>
        <div class="info-value">${inv.customer.address || ''}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Sales Rep :</div>
        <div class="info-value">${inv.customer.salesRep || ''}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Customer VAT :</div>
        <div class="info-value">${inv.customer.vat || ''}</div>
      </div>
    </div>
    <div>
      <div class="info-row">
        <div class="info-label">Invoice No. :</div>
        <div class="info-value">${inv.invoice_no}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Invoice Date :</div>
        <div class="info-value">${new Date(inv.dateIso).toLocaleDateString()}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Batch No. :</div>
        <div class="info-value">${inv.batchNo || ''}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Payment Type :</div>
        <div class="info-value">${inv.paymentType || ''}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Route/Rep Code :</div>
        <div class="info-value">${inv.routeRepCode || ''}</div>
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>DESCRIPTION</th>
        <th>PACK SIZE</th>
        <th>QTY</th>
        <th>PRICE</th>
        <th>DISC %</th>
        <th>VALUE</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="totals-section">
    <div class="total-row">
      <span>Gross Value:</span>
      <span>Rs. ${grossValue.toFixed(2)}</span>
    </div>
    <div class="total-row">
      <span>Total:</span>
      <span>Rs. ${grossValue.toFixed(2)}</span>
    </div>
    <div class="total-row">
      <span>Total Discount:</span>
      <span>Rs. ${totalDiscount.toFixed(2)}</span>
    </div>
    <div class="total-row final">
      <span>Net Value:</span>
      <span>Rs. ${netValue.toFixed(2)}</span>
    </div>
  </div>

  <div class="footer">
    <div class="footer-note">
      NR = Non-Refundable Items | Strictly 30 Days Credit Only | Goods once sold will not be taken back or exchanged. Cheques payable to 'Lenama Healthcare (Pvt) Ltd'.
    </div>
    <div class="signature-section">
      <div class="signature-box">Initiated By</div>
      <div class="signature-box">Customer's Signature</div>
    </div>
  </div>

  <div class="footer-bar"></div>

  <script>
    // Auto-print after a short delay
    setTimeout(() => window.print(), 500);
  </script>
</body>
</html>`;
}
