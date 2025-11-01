export const money = (v: number) => v.toLocaleString(undefined, { 
  minimumFractionDigits: 2, 
  maximumFractionDigits: 2 
});

export function generateSku() {
  return "SKU-" + 
    Math.random().toString(36).slice(2, 6).toUpperCase() + 
    "-" + 
    Date.now().toString().slice(-4);
}