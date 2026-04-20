export function isValidBarcode(barcode: string): boolean {
  return /^[0-9]{8,14}$/.test(barcode) || /^[A-Z0-9\-]{4,20}$/.test(barcode);
}

export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

export function isValidPrice(price: number): boolean {
  return Number.isInteger(price) && price >= 0;
}

export function isValidStock(stock: number): boolean {
  return Number.isInteger(stock) && stock >= 0;
}

export function sanitizeProductName(name: string): string {
  return name.trim().slice(0, 200);
}
