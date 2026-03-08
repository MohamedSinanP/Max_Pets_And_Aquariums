/* =========================
   Types (aligned to backend model)
========================= */

export type ProductType = "animal" | "food" | "accessory" | "medicine" | "other";
export type SellMode = "packaged" | "loose";
export type BaseUnit = "mg" | "ml" | "pcs";
export type PriceUnit = "kg" | "liter" | "pcs";

export interface ProductImage {
  url: string;
  public_id: string;
}

export interface ProductPrice {
  buying: number;
  selling: number;
}

export interface ProductQuantity {
  inStock: number;
  baseUnit: BaseUnit;
}

export interface IVariantOption {
  name: string;
  values: string[];
}

export interface ProductVariant {
  _id: string;
  sku?: string;
  sellMode: SellMode;
  attributes: Record<string, string>;
  price: ProductPrice;
  priceUnit: PriceUnit;
  quantity: ProductQuantity;
  images: ProductImage[];
  isActive: boolean;
}

export interface PopulatedCategory {
  id: string;
  name: string;
  slug?: string;
  type?: string;
}

export interface Product {
  _id: string;
  name: string;
  category: PopulatedCategory | null;
  type: ProductType;
  description?: string | null;
  specifications?: Record<string, string>;
  variantOptions?: IVariantOption[];
  variants: ProductVariant[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiSuccess<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/* =========================
   Query Params
========================= */

export interface GetProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  type?: ProductType;
  isActive?: boolean;
}

/* =========================
   Payloads (aligned to backend ParsedVariant)
========================= */

export interface VariantPayload {
  _id?: string;
  /** SKU is backend-generated; ignored by backend if sent */
  sku?: string;
  sellMode: SellMode;
  attributes: Record<string, string>;
  price: ProductPrice;
  priceUnit: PriceUnit;
  quantity: ProductQuantity;
  images?: ProductImage[];
  isActive: boolean;
}

export interface CreateProductPayload {
  name: string;
  category: string;
  type: ProductType;
  description?: string | null;
  specifications?: Record<string, string>;
  variantOptions?: IVariantOption[];
  variants: VariantPayload[];
}

export type UpdateProductPayload = Partial<CreateProductPayload> & {
  /** Map of variantId → array of public_ids to delete */
  removeVariantImages?: Record<string, string[]>;
};

export interface ProductCategory {
  _id: string;
  name: string;
  slug?: string;
  type?: string;
}