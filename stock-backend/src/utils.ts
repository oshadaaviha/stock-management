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
  customer: { name: string; phone?: string };
  items: Array<{ name: string; qty: number; price: number; line_total: number }>;
  sub_total: number; tax: number; discount: number; total: number;
}) {
  const rows = inv.items.map((i, k) =>
    `<tr>
       <td style="padding:6px;border-bottom:1px solid #ddd">${k+1}</td>
       <td style="padding:6px;border-bottom:1px solid #ddd">${i.name}</td>
       <td style="padding:6px;border-bottom:1px solid #ddd;text-align:right">${i.qty}</td>
       <td style="padding:6px;border-bottom:1px solid #ddd;text-align:right">${i.price.toFixed(2)}</td>
       <td style="padding:6px;border-bottom:1px solid #ddd;text-align:right">${i.line_total.toFixed(2)}</td>
     </tr>`).join("");

  const logo = inv.company.logoUrl ? `<img src="${inv.company.logoUrl}" style="height:60px;object-fit:contain">` : "";

  return `<!doctype html><html><head><meta charset="utf-8"><title>${inv.invoice_no}</title>
  <style>*{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial}table{width:100%;border-collapse:collapse} .wrap{max-width:800px;margin:0 auto;padding:24px}</style>
  </head><body><div class="wrap">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
    <div><div style="font-size:22px;font-weight:800">${inv.company.name}</div>
    <div style="color:#6b7280">${inv.company.address}${inv.company.phone?` · ${inv.company.phone}`:''}</div></div>
    ${logo}
  </div>
  <div style="margin-top:16px;display:flex;justify-content:space-between">
    <div><div style="font-weight:700">Invoice To:</div><div>${inv.customer.name}</div>
    ${inv.customer.phone?`<div style="color:#6b7280">${inv.customer.phone}</div>`:''}</div>
    <div style="text-align:right"><div style="font-size:20px;font-weight:800">${inv.invoice_no}</div>
    <div style="color:#6b7280">${new Date(inv.dateIso).toLocaleString()}</div></div>
  </div>
  <table style="margin-top:12px">
    <thead><tr>
      <th style="text-align:left;border-bottom:2px solid #000;padding:6px">#</th>
      <th style="text-align:left;border-bottom:2px solid #000;padding:6px">Item</th>
      <th style="text-align:right;border-bottom:2px solid #000;padding:6px">Qty</th>
      <th style="text-align:right;border-bottom:2px solid #000;padding:6px">Price</th>
      <th style="text-align:right;border-bottom:2px solid #000;padding:6px">Total</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr><td colspan="4" style="text-align:right;padding:6px">Subtotal</td><td style="text-align:right;padding:6px">${inv.sub_total.toFixed(2)}</td></tr>
      <tr><td colspan="4" style="text-align:right;padding:6px">Tax</td><td style="text-align:right;padding:6px">${inv.tax.toFixed(2)}</td></tr>
      <tr><td colspan="4" style="text-align:right;padding:6px">Discount</td><td style="text-align:right;padding:6px">${inv.discount.toFixed(2)}</td></tr>
      <tr><td colspan="4" style="text-align:right;padding:6px;font-weight:800">TOTAL</td><td style="text-align:right;padding:6px;font-weight:800">${inv.total.toFixed(2)}</td></tr>
    </tfoot>
  </table>
  <div style="margin-top:24px;color:#6b7280">Thank you for your business.</div>
  <script>setTimeout(()=>window.print(),120)</script>
  </div></body></html>`;
}
