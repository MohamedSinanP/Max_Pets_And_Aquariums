import api from "./api";

/* =========================
   Types
========================= */

export type CategoryType = "living" | "non-living";

export interface Category {
  id: string;
  name: string;
  slug: string;
  type: CategoryType;
  parent: null | {
    id?: string; // depending on your backend transform/populate
    name: string;
    slug: string;
  };
  icon?: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  results: T[];
}

export interface ApiSuccess<T> {
  success: boolean;
  message: string;
  data: T;
}

/* =========================
   Query Params
========================= */

export type CategorySort =
  | "-createdAt"
  | "createdAt"
  | "-updatedAt"
  | "updatedAt"
  | "name"
  | "-name";

export interface GetCategoriesParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  type?: CategoryType;
  sort?: CategorySort;
}

/* =========================
   Payloads
========================= */

export interface CreateCategoryPayload {
  name: string;
  type: CategoryType;
  parent?: string | null; // ObjectId string
  icon?: string;
  description?: string | null;
}

export interface UpdateCategoryPayload {
  name?: string;
  type?: CategoryType;
  parent?: string | null;
  icon?: string;
  description?: string | null;
}

/* =========================
   Helpers
========================= */

const toQueryParams = (params?: GetCategoriesParams) => {
  if (!params) return undefined;

  const q: Record<string, any> = {};

  if (params.page != null) q.page = String(params.page);
  if (params.limit != null) q.limit = String(params.limit);
  if (params.search) q.search = params.search;
  if (params.sort) q.sort = params.sort;

  // backend expects "true"/"false" strings
  if (params.isActive != null) q.isActive = String(params.isActive);

  if (params.type) q.type = params.type;

  return q;
};

/* =========================
   API Functions
========================= */

// GET /api/categories?...
export const getCategories = async (params?: GetCategoriesParams) => {
  const res = await api.get<ApiSuccess<PaginatedResponse<Category>>>(
    "/categories",
    { params: toQueryParams(params) }
  );
  return res.data;
};

// POST /api/categories
export const createCategory = async (payload: CreateCategoryPayload) => {
  const res = await api.post<ApiSuccess<Category>>("/categories", payload);
  return res.data;
};

// PUT /api/categories/:id
export const updateCategory = async (id: string, payload: UpdateCategoryPayload) => {
  const res = await api.put<ApiSuccess<Category>>(`/categories/${id}`, payload);
  return res.data;
};

// PATCH /api/categories/:id/toggle
export const toggleCategoryActive = async (id: string) => {
  const res = await api.patch<ApiSuccess<Category>>(`/categories/${id}/toggle`);
  return res.data;
};

// OPTIONAL: GET single category (only if you add route in backend)
// export const getCategoryById = async (id: string) => {
//   const res = await api.get<ApiSuccess<Category>>(`/categories/${id}`);
//   return res.data;
// };

// OPTIONAL: DELETE category (only if you add route in backend)
// export const deleteCategory = async (id: string) => {
//   const res = await api.delete<ApiSuccess<null>>(`/categories/${id}`);
//   return res.data;
// };