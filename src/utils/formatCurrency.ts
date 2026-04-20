export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculateMargin(sellPrice: number, buyPrice: number): number {
  if (buyPrice === 0) return 100;
  return Math.round(((sellPrice - buyPrice) / buyPrice) * 100 * 100) / 100;
}

export function calculateGrossMargin(totalAmount: number, totalCost: number): number {
  if (totalAmount === 0) return 0;
  return Math.round(((totalAmount - totalCost) / totalAmount) * 100 * 100) / 100;
}

export function parseRupiah(formatted: string): number {
  return parseInt(formatted.replace(/[^0-9]/g, ''), 10) || 0;
}
