import api from "./api";

/* =========================
   Types
========================= */

export type ProductType = "animal" | "food" | "accessory" | "medicine" | "other";
export type SellMode = "packaged" | "loose";
export type QuantityUnit = "kg" | "L" | "pcs";

export interface ProductImage {
  url: string;
  public_id: string;
}

export interface ProductAttribute {
  key: string;
  value: string;
}

export interface ProductPrice {
  buying: number;
  selling: number;
}

export interface ProductQuantity {
  inStock: number;
  minThreshold: number;
  unit: QuantityUnit;
}

export interface ProductVariant {
  _id?: string;
  sku: string;
  sellMode: SellMode;
  attributes: ProductAttribute[];
  price: ProductPrice;
  quantity: ProductQuantity;
  images: ProductImage[];
  isActive: boolean;
}

export interface VariantOption {
  name: string;
  values: string[];
}

export interface PopulatedCategory {
  _id: string;
  name: string;
  slug: string;
  type: string;
}

export interface PopulatedSupplier {
  _id: string;
  name: string;
}

export interface Product {
  _id: string;
  id: string;
  name: string;
  category: PopulatedCategory;
  type: ProductType;
  description?: string | null;
  supplier?: PopulatedSupplier | null;
  attributes: ProductAttribute[];
  variantOptions: VariantOption[];
  variants: ProductVariant[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: T[];
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
  supplier?: string;
  isActive?: boolean;
}

/* =========================
   Payloads
========================= */

export interface VariantPayload {
  _id?: string;
  sku: string;
  sellMode: SellMode;
  attributes?: ProductAttribute[];
  price: ProductPrice;
  quantity: ProductQuantity;
  images?: ProductImage[];
}

export interface CreateProductPayload {
  name: string;
  category: string;
  type: ProductType;
  description?: string | null;
  supplier?: string | null;
  attributes?: ProductAttribute[];
  variantOptions?: VariantOption[];
  variants: VariantPayload[];
  // images handled via FormData (multipart)
}

export interface UpdateProductPayload extends Partial<CreateProductPayload> { }

/* =========================
   Helpers
========================= */

const toQueryParams = (params?: GetProductsParams) => {
  if (!params) return undefined;
  const q: Record<string, any> = {};
  if (params.page != null) q.page = String(params.page);
  if (params.limit != null) q.limit = String(params.limit);
  if (params.search) q.search = params.search;
  if (params.category) q.category = params.category;
  if (params.type) q.type = params.type;
  if (params.supplier) q.supplier = params.supplier;
  if (params.isActive != null) q.isActive = String(params.isActive);
  return q;
};

/**
 * Build FormData for create/update (handles variant images)
 */
export const buildProductFormData = (
  payload: CreateProductPayload | UpdateProductPayload,
  variantImageFiles?: File[][] // array per variant index
): FormData => {
  const form = new FormData();

  if (payload.name) form.append("name", payload.name);
  if (payload.category) form.append("category", payload.category);
  if (payload.type) form.append("type", payload.type);
  if (payload.description !== undefined)
    form.append("description", payload.description ?? "");
  if (payload.supplier !== undefined)
    form.append("supplier", payload.supplier ?? "");

  if (payload.attributes)
    form.append("attributes", JSON.stringify(payload.attributes));

  if (payload.variantOptions)
    form.append("variantOptions", JSON.stringify(payload.variantOptions));

  if (payload.variants)
    form.append("variants", JSON.stringify(payload.variants));

  // Attach images per variant
  if (variantImageFiles) {
    variantImageFiles.forEach((files, i) => {
      files.forEach((file) => {
        form.append(`variants[${i}][images]`, file);
      });
    });
  }

  return form;
};

/* =========================
   API Functions
========================= */

// GET /api/products
export const getProducts = async (params?: GetProductsParams) => {
  const res = await api.get<ApiSuccess<Product[]>>("/products", {
    params: toQueryParams(params),
  });
  return res.data;
};

// GET /api/products/:id
export const getProductById = async (id: string) => {
  const res = await api.get<ApiSuccess<Product>>(`/products/${id}`);
  return res.data;
};

// POST /api/products (multipart/form-data)
export const createProduct = async (
  payload: CreateProductPayload,
  variantImageFiles?: File[][]
) => {
  const form = buildProductFormData(payload, variantImageFiles);
  const res = await api.post<ApiSuccess<Product>>("/products", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// PUT /api/products/:id (multipart/form-data)
export const updateProduct = async (
  id: string,
  payload: UpdateProductPayload,
  variantImageFiles?: File[][]
) => {
  const form = buildProductFormData(payload, variantImageFiles);
  const res = await api.put<ApiSuccess<Product>>(`/products/${id}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// DELETE /api/products/:id (soft delete)
export const deleteProduct = async (id: string) => {
  const res = await api.delete<ApiSuccess<null>>(`/products/${id}`);
  return res.data;
};