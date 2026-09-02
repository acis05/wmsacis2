export type Product = {
  id: string;
  sku: string;
  name: string;
  barcode: string | null;
  category: string | null;
  unit: string;
  min_stock: number;
  total_stock: number;
  locations?: string | null;
};

export type Location = { id: string; code: string; name: string };
