import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

export type ProductCategory = "Electronics" | "Stationery" | "Furniture" | string;

export interface Product {
  id: number;
  sku: string;
  name: string;
  category: ProductCategory;
  price: string | number;
  quantity: number;
  low_stock_threshold: number;
  created_at: string;
}

export interface ProductCreate {
  sku: string;
  name: string;
  category: string;
  price: string;
  quantity: number;
  low_stock_threshold: number;
}

export type ProductUpdate = Partial<ProductCreate>;

export async function getProducts(): Promise<Product[]> {
  const response = await api.get<Product[]>("/api/products/");
  return response.data;
}

export async function createProduct(product: ProductCreate): Promise<Product> {
  const response = await api.post<Product>("/api/products/", product);
  return response.data;
}

export async function updateProduct(
  id: number,
  changes: ProductUpdate,
): Promise<Product> {
  const response = await api.put<Product>(`/api/products/${id}`, changes);
  return response.data;
}

export async function deleteProduct(id: number): Promise<void> {
  await api.delete(`/api/products/${id}`);
}


export interface StockMovement {
  id: number;
  product_id: number;
  movement_type: "IN" | "OUT";
  quantity: number;
  note: string | null;
  created_at: string;
}

export interface StockMovementCreate {
  movement_type: "IN" | "OUT";
  quantity: number;
  note?: string;
}

export async function recordStockMovement(
  productId: number,
  movement: StockMovementCreate,
): Promise<StockMovement> {
  const response = await api.post<StockMovement>(
    `/api/products/${productId}/movements`,
    movement,
  );
  return response.data;
}

export async function getStockMovements(
  productId: number,
): Promise<StockMovement[]> {
  const response = await api.get<StockMovement[]>(
    `/api/products/${productId}/movements`,
  );
  return response.data;
}
