import type { ApiSuccess, BaseUnit, CreateProductPayload, GetProductsParams, PriceUnit, Product, SellMode, UpdateProductPayload } from "../types/product";
import api from "./api";

/* =========================
   Helpers
========================= */

const toQueryParams = (params?: GetProductsParams): Record<string, string> | undefined => {
  if (!params) return undefined;
  const q: Record<string, string> = {};
  if (params.page != null) q.page = String(params.page);
  if (params.limit != null) q.limit = String(params.limit);
  if (params.search) q.search = params.search;
  if (params.category) q.category = params.category;
  if (params.type) q.type = params.type;
  if (params.isActive != null) q.isActive = String(params.isActive);
  return q;
};

/**
 * Derive priceUnit from sellMode + baseUnit (matches backend business rules):
 *   packaged  → priceUnit = "pcs"
 *   loose mg  → priceUnit = "kg"
 *   loose ml  → priceUnit = "liter"
 */
export const derivePriceUnit = (sellMode: SellMode, baseUnit: BaseUnit): PriceUnit => {
  if (sellMode === "packaged") return "pcs";
  if (baseUnit === "mg") return "kg";
  return "liter";
};

/**
 * Build FormData for create.
 * Image field name: variants[${i}][images]
 */
export const buildCreateFormData = (
  payload: CreateProductPayload,
  variantImageFiles: File[][]
): FormData => {
  const form = new FormData();

  form.append("name", payload.name);
  form.append("category", payload.category);
  form.append("type", payload.type);
  if (payload.description != null) form.append("description", payload.description ?? "");
  if (payload.specifications) form.append("specifications", JSON.stringify(payload.specifications));
  if (payload.variantOptions) form.append("variantOptions", JSON.stringify(payload.variantOptions));

  // strip client-side sku before sending
  const sanitized = payload.variants.map(({ sku: _sku, ...rest }) => rest);
  form.append("variants", JSON.stringify(sanitized));

  // attach images per variant index
  variantImageFiles.forEach((files, i) => {
    files.forEach((file) => {
      form.append(`variants[${i}][images]`, file);
    });
  });

  return form;
};

/**
 * Build FormData for update.
 * New images for existing variants: variantImages[${variantId}]
 * New images for new variants: variants[${i}][images]  (index in the variants array)
 * removeVariantImages: JSON stringified map
 */
export const buildUpdateFormData = (
  payload: UpdateProductPayload,
  variantImageFiles: File[][],
  /** pass the variant IDs in same order as payload.variants */
  variantIds: (string | undefined)[]
): FormData => {
  const form = new FormData();

  if (payload.name) form.append("name", payload.name);
  if (payload.category) form.append("category", payload.category);
  if (payload.type) form.append("type", payload.type);
  if (payload.description !== undefined) form.append("description", payload.description ?? "");
  if (payload.specifications) form.append("specifications", JSON.stringify(payload.specifications));
  if (payload.variantOptions) form.append("variantOptions", JSON.stringify(payload.variantOptions));

  if (payload.removeVariantImages && Object.keys(payload.removeVariantImages).length) {
    form.append("removeVariantImages", JSON.stringify(payload.removeVariantImages));
  }

  if (payload.variants) {
    const sanitized = payload.variants.map(({ sku: _sku, ...rest }) => rest);
    form.append("variants", JSON.stringify(sanitized));
  }

  // attach images
  variantImageFiles.forEach((files, i) => {
    const variantId = variantIds[i];
    files.forEach((file) => {
      if (variantId) {
        // existing variant — backend uses variantImages[<id>]
        form.append(`variantImages[${variantId}]`, file);
      } else {
        // new variant in update — backend uses variants[${i}][images]
        form.append(`variants[${i}][images]`, file);
      }
    });
  });

  return form;
};

/* =========================
   API Functions
========================= */

export const getProducts = async (params?: GetProductsParams) => {
  const res = await api.get<ApiSuccess<Product[]>>("/products", {
    params: toQueryParams(params),
  });
  return res.data;
};

export const getProductById = async (id: string) => {
  const res = await api.get<ApiSuccess<Product>>(`/products/${id}`);
  return res.data;
};

export const createProduct = async (
  payload: CreateProductPayload,
  variantImageFiles: File[][]
) => {
  const form = buildCreateFormData(payload, variantImageFiles);
  const res = await api.post<ApiSuccess<Product>>("/products", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const updateProduct = async (
  id: string,
  payload: UpdateProductPayload,
  variantImageFiles: File[][],
  variantIds: (string | undefined)[]
) => {
  const form = buildUpdateFormData(payload, variantImageFiles, variantIds);
  const res = await api.put<ApiSuccess<Product>>(`/products/${id}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const deleteProduct = async (id: string) => {
  const res = await api.delete<ApiSuccess<null>>(`/products/${id}`);
  return res.data;
};