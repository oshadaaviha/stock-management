import { pool } from "./db";

// Compute next invoice number in the format: YYYY-SS (e.g., 2526-01)
// Where YYYY is the fiscal year code like "2526" (Apr to Mar)
// and SS is a 2-digit sequence starting from 01 for each fiscal year
export async function nextInvoiceNo(invoiceDate?: string): Promise<string> {
  const refDate = invoiceDate ? new Date(invoiceDate) : new Date();
  // Determine fiscal year code: Apr (4) to Mar (3)
  const year = refDate.getFullYear();
  const month = refDate.getMonth() + 1; // 1-12
  const startYear = month >= 4 ? year : year - 1; // FY starts in April
  const endYear = startYear + 1;
  const fyCode = `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`; // e.g., 2025/2026 -> "2526"

  // Count existing invoices for this fiscal year (support both old 'INV-YYYY-' and new 'YYYY-' prefixes) and increment
  const pNew = `${fyCode}-`;
  const pOld = `INV-${fyCode}-`;
  const [rows]: any = await pool.query(
    "SELECT invoice_no FROM sales WHERE invoice_no LIKE ? OR invoice_no LIKE ?",
    [pNew + '%', pOld + '%']
  );
  let maxSeq = 0;
  for (const r of rows as Array<{invoice_no: string}>) {
    const parts = (r.invoice_no || '').split('-');
    const last = parts[parts.length - 1];
    const n = parseInt(last, 10);
    if (!isNaN(n)) maxSeq = Math.max(maxSeq, n);
  }
  const next = maxSeq + 1;
  const seq = String(next).padStart(2, '0'); // 01, 02, ...
  return `${pNew}${seq}`;
}

// Format number with thousands separator
function formatMoney(n: number): string {
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function invoiceHtml(inv: {
  company: { name: string; address: string; phone?: string; logoUrl?: string };
  invoice_no: string;
  dateIso: string;
  customer: { code?: string; name: string; phone?: string; vat?: string; address?: string; salesRep?: string };
  items: Array<{ name: string; qty: number; price: number; discount?: number; line_total: number; pack_size?: string }>;
  sub_total: number; tax: number; discount: number; total: number;
  batchNo?: string; paymentType?: string; routeRepCode?: string;
}) {
  const rows = inv.items.map((i) => {
    const discountPct = (i.price > 0 && i.discount) ? ((i.discount / i.price) * 100).toFixed(1) : '0';
    const packUnits = (i.pack_size && (i.pack_size.match(/\d+/g)?.map(Number).reduce((a,b)=>a*b,1) || 1)) || 1;
    const netLineTotal = (i.qty * packUnits) * (i.price - (i.discount || 0));
    return `<tr>
       <td style="padding:8px;border:1px solid #0a5066;text-align:left">${i.name}</td>
  <td style="padding:8px;border:1px solid #0a5066;text-align:center">${i.pack_size || '0'}</td>
       <td style="padding:8px;border:1px solid #0a5066;text-align:center">${i.qty}</td>
       <td style="padding:8px;border:1px solid #0a5066;text-align:right">Rs. ${formatMoney(i.price)}</td>
       <td style="padding:8px;border:1px solid #0a5066;text-align:right">${discountPct}%</td>
       <td style="padding:8px;border:1px solid #0a5066;text-align:right">Rs. ${formatMoney(netLineTotal)}</td>
     </tr>`;
  }).join("");

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
         pack: (inv.packX ?? 90),
         qty: (inv.qtyX ?? 123),
         price: (inv.priceX ?? 138),
         disc: (inv.discX ?? 156),
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
    .customer-block { /* shift customer details a bit further left */
      margin-left: -18px;
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
      width: 320px;
      margin-top: 10px;
      margin-right: 100px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 12px;
      border-bottom: 1px solid #ddd;
    }
    .total-row span:first-child {
      flex: 0 0 120px;
      text-align: left;
    }
    .total-row span:last-child {
      flex: 0 0 160px;
      text-align: right;
      font-family: 'Courier New', monospace;
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
    <div class="customer-block">
      <div class="info-row">
        <div class="info-label">Customer Code :</div>
        <div class="info-value">${inv.customer.code || '-'}</div>
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
      <div class="info-row">
        <div class="info-label">VAT Reg No :</div>
        <div class="info-value">179586789 - 7000</div>
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

  <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
    <table style="width: auto; border: none;">
      <tr style="border: none;">
        <td style="padding: 6px 12px; border: none; text-align: left; font-weight: normal;">Total:</td>
        <td style="padding: 6px 12px; border: none; text-align: right; font-weight: normal; min-width: 150px;">Rs. ${formatMoney(grossValue)}</td>
      </tr>
      <tr style="border: none;">
  <td style="padding: 6px 12px; border: none; text-align: left; font-weight: normal;">TAX :</td>
        <td style="padding: 6px 12px; border: none; text-align: right; font-weight: normal;">Rs. ${formatMoney(inv.tax)}</td>
      </tr>
      <tr style="border: none;">
        <td style="padding: 6px 12px; border: none; text-align: left; font-weight: normal;">Total Discount:</td>
        <td style="padding: 6px 12px; border: none; text-align: right; font-weight: normal;">Rs. ${formatMoney(totalDiscount)}</td>
      </tr>
      <tr style="border: none; background: #0a5066; color: white;">
        <td style="padding: 8px 12px; border: none; text-align: left; font-weight: bold; font-size: 12pt;">Grand Total:</td>
        <td style="padding: 8px 12px; border: none; text-align: right; font-weight: bold; font-size: 12pt;">Rs. ${formatMoney(inv.total)}</td>
      </tr>
    </table>
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

// Dot-matrix friendly version: prints ONLY data aligned for a pre-printed Lenama stationary.
// Uses monospace text inside a <pre> block so column widths are predictable.
// Supports optional horizontal/vertical offsets (mm) for calibration.
// Query params: format=dot&offsetX=2&offsetY=3
export function invoiceDotMatrixHtml(inv: {
  invoice_no: string;
  dateIso: string;
  customer: { code?: string; name: string; phone?: string; vat?: string; address?: string; salesRep?: string };
  items: Array<{ name: string; qty: number; price: number; discount?: number; line_total: number; pack_size?: string }>;
  sub_total: number; tax: number; discount: number; total: number;
  batchNo?: string; paymentType?: string; routeRepCode?: string;
  offsetX?: number; offsetY?: number; fontSizePt?: number; lineHeight?: number;
}) {
  // Column widths tuned for typical 80 / 132 column dot-matrix on A4 landscape pre-printed form
  const COL_NAME = 38; // DESCRIPTION
  const COL_PACK = 10; // PACK SIZE
  const COL_QTY = 5;
  const COL_PRICE = 10;
  const COL_DISC = 6; // DISC %
  const COL_VALUE = 12; // VALUE

  function pad(str: string|number, len: number, right = true) {
    const s = String(str ?? '');
    if (s.length === len) return s;
    if (s.length > len) return right ? s.slice(0, len) : s.slice(-len);
    const padSpaces = ' '.repeat(len - s.length);
    return right ? s + padSpaces : padSpaces + s;
  }

  function money(n: number) { return formatMoney(n); }

  // Header block positions: we rely on vertical spacing approximated for pre-printed lines.
  const lines: string[] = [];
  lines.push(`Customer Code : ${inv.customer.code || '-'}`);
  lines.push(`Customer Name : ${inv.customer.name}`);
  lines.push(`Address       : ${(inv.customer.address||'')}`);
  lines.push(`Sales Rep     : ${(inv.customer.salesRep||'')}`);
  lines.push(`Customer VAT  : ${(inv.customer.vat||'')}`);
  lines.push("");
  lines.push(`Invoice No.   : ${inv.invoice_no}`);
  lines.push(`Invoice Date  : ${new Date(inv.dateIso).toLocaleDateString()}`);
  lines.push(`Batch No.     : ${(inv.batchNo||'')}`);
  lines.push(`Payment Type  : ${(inv.paymentType||'')}`);
  lines.push(`Route/Rep Code: ${(inv.routeRepCode||'')}`);
  lines.push(`VAT Reg No    : 179586789 - 7000`);
  lines.push("");

  // Column header (matches pre-printed headings; we still output for alignment reference, can be omitted)
  lines.push(
    pad('DESCRIPTION', COL_NAME) +
    pad('PACK SIZE', COL_PACK) +
    pad('QTY', COL_QTY, false) +
    pad('PRICE', COL_PRICE) +
    pad('DISC%', COL_DISC) +
    pad('VALUE', COL_VALUE)
  );
  lines.push('-'.repeat(COL_NAME + COL_PACK + COL_QTY + COL_PRICE + COL_DISC + COL_VALUE));

  for (const it of inv.items) {
    const discPct = it.discount ? ((it.discount / it.price) * 100).toFixed(0) : '';
    const packUnits = (it.pack_size && (it.pack_size.match(/\d+/g)?.map(Number).reduce((a,b)=>a*b,1) || 1)) || 1;
    const netValue = (it.qty * packUnits) * (it.price - (it.discount || 0));
    lines.push(
      pad(it.name, COL_NAME) +
  pad(it.pack_size || '0', COL_PACK) +
      pad(it.qty, COL_QTY, false) +
      pad(money(it.price), COL_PRICE) +
      pad(discPct, COL_DISC) +
      pad(money(netValue), COL_VALUE)
    );
  }

  lines.push('');
  const totalsLabelWidth = 18;
  const totalsValueWidth = 15;
  lines.push(pad('Gross Value:', totalsLabelWidth) + pad(money(inv.sub_total), totalsValueWidth, false));
  lines.push(pad('TAX :', totalsLabelWidth) + pad(money(inv.tax), totalsValueWidth, false));
  lines.push(pad('Total Discount:', totalsLabelWidth) + pad(money(inv.discount), totalsValueWidth, false));
  lines.push(pad('Grand Total:', totalsLabelWidth) + pad(money(inv.total), totalsValueWidth, false));
  lines.push('');
  lines.push('Initiated By: ______________________      Customer Signature: ______________________');

  const offsetXmm = inv.offsetX ?? 0;
  const offsetYmm = inv.offsetY ?? 0;
  const fontSize = inv.fontSizePt ?? 11;
  const lh = inv.lineHeight ?? 1.1;

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${inv.invoice_no}</title>
<style>
  @page { margin: 0; }
  body { margin: 0; font-family: 'Courier New', monospace; font-size: ${fontSize}pt; }
  .canvas { position: absolute; left: ${offsetXmm}mm; top: ${offsetYmm}mm; white-space: pre; line-height: ${lh}; }
  @media print { body { -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="canvas">${lines.join('\n')}</div>
<script>setTimeout(()=>window.print(),200);</script>
</body></html>`;
}

// Absolute-positioned overlay for pre-printed Lenama form.
// Only prints text; optional background image can be enabled for calibration.
export function invoiceOverlayHtml(inv: {
  invoice_no: string;
  dateIso: string;
  customer: { code?: string; name: string; phone?: string; vat?: string; address?: string; salesRep?: string };
  items: Array<{ name: string; qty: number; price: number; discount?: number; line_total: number; pack_size?: string }>;
  sub_total: number; tax: number; discount: number; total: number;
  batchNo?: string; paymentType?: string; routeRepCode?: string;
  offsetX?: number; offsetY?: number; scale?: number; showBg?: boolean; bgUrl?: string;
  // Fine alignment overrides (mm)
  leftValueX?: number; rightValueX?: number; descX?: number; packX?: number; qtyX?: number; priceX?: number; discX?: number; valueX?: number;
  tableStartY?: number; rowHeight?: number; totalsX?: number; totalsTopY?: number;
  fontSizePt?: number;
}) {
  const mm = (n:number)=>`${n}mm`;
  const fmt = (n:number)=>formatMoney(n);
  const offsetX = inv.offsetX ?? 0;
  const offsetY = inv.offsetY ?? 0;
  const scale = inv.scale ?? 1;
  const showBg = !!inv.showBg && !!inv.bgUrl;

  // Tunable coordinates (approx) for A4 portrait
  const X = {
  leftValue: (inv.leftValueX ?? 35), // shift 10px left by default
  rightValue: (inv.rightValueX ?? 148),
  desc: (inv.descX ?? 1),
  pack: (inv.packX ?? 88),
  qty: (inv.qtyX ?? 105),
  price: (inv.priceX ?? 129),
  disc: (inv.discX ?? 153),
  value: (inv.valueX ?? 195)
  };
  const Y = {
    // Left column (Customer details)
    customerCode: 42,
    name: 50,
    address: 64,
    salesRep: 80,
    vat: 89,
    // Right column (Invoice details)
    invNo: 42,
    invDate: 50,
    batchNo: 57,
    payType: 64,
    route: 73,
    // Table
    tableStart: (inv.tableStartY ?? 110),
    rowH: (inv.rowHeight ?? 7),
    totalsTop: (inv.totalsTopY ?? 195)
  };

  const lines = inv.items;
  const maxRows = 10; // Maximum rows per page

  function text(x:number, y:number, value:string, align: 'left'|'right'|'center'='left') {
    const style = `left:${mm(x+offsetX)};top:${mm(y+offsetY)};` +
      (align==='right' ? 'text-align:right;transform: translateX(-100%);' : align==='center' ? 'text-align:center;transform: translateX(-50%);' : '');
    return `<div class="t" style="${style}">${value ?? ''}</div>`;
  }

  let html = '';
  // Left block values (Customer information)
  html += text(X.leftValue, Y.customerCode, inv.customer.code || '');
  html += text(X.leftValue, Y.name, inv.customer.name || '');
  html += text(X.leftValue, Y.address, inv.customer.address || '');
  html += text(X.leftValue, Y.salesRep, inv.customer.salesRep || '');
  html += text(X.leftValue, Y.vat, inv.customer.vat || '');

  // Right block values (Invoice information)
  html += text(X.rightValue, Y.invNo, inv.invoice_no || '', 'left');
  html += text(X.rightValue, Y.invDate, inv.dateIso ? new Date(inv.dateIso).toLocaleDateString() : '', 'left');
  html += text(X.rightValue, Y.batchNo, inv.batchNo || '', 'left');
  html += text(X.rightValue, Y.payType, inv.paymentType || '', 'left');
  html += text(X.rightValue, Y.route, inv.routeRepCode || '', 'left');
  // Fixed VAT Reg No below Route/Rep Code (shifted 30mm to the left from rightValue)
  html += text(X.rightValue - 30, Y.route + 10, 'VAT Reg No : 179586789 - 7000', 'left');

  // Table lines
  const rows = Math.min(lines.length, maxRows);
  for (let i=0;i<rows;i++) {
    const r = lines[i];
    const y = Y.tableStart + i*Y.rowH;
    const packUnits = (r.pack_size && (r.pack_size.match(/\d+/g)?.map(Number).reduce((a,b)=>a*b,1) || 1)) || 1;
    const netLineTotal = (r.qty * packUnits) * (r.price - (r.discount || 0));
    html += text(X.desc, y, r.name || '', 'left');
  html += text(X.pack, y, r.pack_size || '0', 'left');
    html += text(X.qty+6, y, String(r.qty), 'right');
    html += text(X.price+12, y, fmt(r.price), 'right');
    const discPct = r.discount ? ((r.discount / r.price) * 100).toFixed(0)+'%' : '';
    html += text(X.disc+8, y, discPct, 'right');
    html += text(X.value+12, y, fmt(netLineTotal), 'right');
  }

  // Totals box (right-bottom)
  // Shift totals slightly further to the right by default; still overrideable via inv.totalsX
  const totalsX = inv.totalsX ?? 208;
  let t = Y.totalsTop;
  html += text(totalsX, t, fmt(inv.sub_total), 'right'); t += 5.5;
  html += text(totalsX, t, 'VAT(18%)' + fmt(inv.tax), 'right'); t += 5.5;
  html += text(totalsX, t, fmt(inv.discount), 'right'); t += 5.5;
  html += text(totalsX, t, fmt(inv.total), 'right');

  const bgStyle = showBg ? `background:url('${inv.bgUrl}') no-repeat top left / contain;` : '';

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${inv.invoice_no}</title>
<style>
  @page { margin: 0; size: A4 portrait; }
  body { margin: 0; }
  .page { position: relative; width: 210mm; height: 297mm; ${bgStyle} transform: scale(${scale}); transform-origin: top left; }
  .t { position: absolute; font-family: 'Courier New', monospace; font-size: ${inv.fontSizePt ?? 10}pt; color: #000; white-space: nowrap; }
  @media print { body { -webkit-print-color-adjust: exact; } }
</style></head>
<body>
  <div class="page">${html}</div>
  <script>setTimeout(()=>window.print(),200);</script>
</body></html>`;
}
