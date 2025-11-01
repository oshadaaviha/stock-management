import type { Product } from '../types';
import { money } from '../utils';

type StatProps = {
  title: string;
  value: string;
};

function Stat({ title, value }: StatProps) {
  return (
    <div className="card vstack" style={{ minWidth: 220 }}>
      <div className="badge">{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

export function Dashboard({ products }: { products: Product[] }) {
  const totalSkus = products.length;
  const totalQty = products.reduce((a, p) => a + p.qty, 0);
  const stockValue = products.reduce((a, p) => a + p.qty * p.cost, 0);

  return (
    <section className="card vstack">
      <h2>Overview</h2>
      <div className="hstack" style={{ gap: 16, flexWrap: "wrap" }}>
        <Stat title="SKUs" value={String(totalSkus)} />
        <Stat title="Total Quantity" value={String(totalQty)} />
        <Stat title="Stock Value (Cost)" value={`Rs. ${money(stockValue)}`} />
      </div>
      <small className="muted">Tip: use the Products tab to manage items, Purchase to add stock, and Sales to create & print invoices.</small>
    </section>
  );
}