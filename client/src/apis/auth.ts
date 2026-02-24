import api from "./api";

/* =========================
   Types
========================= */

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiSuccess<T = null> {
  success: boolean;
  message: string;
  data?: T;
}

/* =========================
   Payloads
========================= */

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UpdatePasswordPayload {
  userId: string;
  oldPassword: string;
  newPassword: string;
}

export interface UpdateProfilePayload {
  userId: string;
  name?: string;
  phone?: string;
  avatar?: string;
}

/* =========================
   API Functions
========================= */

/**
 * POST /api/auth/register
 * Registers a new user. Sets httpOnly cookies on success.
 */
export const register = async (payload: RegisterPayload) => {
  const res = await api.post<ApiSuccess>("/auth/register", payload);
  return res.data;
};

/**
 * POST /api/auth/login
 * Logs in a user. Sets httpOnly cookies on success.
 */
export const login = async (payload: LoginPayload) => {
  const res = await api.post<ApiSuccess>("/auth/login", payload);
  return res.data;
};

/**
 * POST /api/auth/refresh
 * Refreshes the access token using the refresh token cookie.
 * Called automatically by the axios interceptor on 401.
 */
export const refreshAccessToken = async () => {
  const res = await api.post<ApiSuccess>("/auth/refresh");
  return res.data;
};

/**
 * PUT /api/auth/update-password
 * Updates the password for the authenticated user.
 */
export const updatePassword = async (payload: UpdatePasswordPayload) => {
  const res = await api.put<ApiSuccess>("/auth/update-password", payload);
  return res.data;
};

/**
 * PUT /api/auth/update-profile
 * Updates the profile (name, phone, avatar) for the authenticated user.
 */
export const updateProfile = async (payload: UpdateProfilePayload) => {
  const res = await api.put<ApiSuccess<User>>("/auth/update-profile", payload);
  return res.data;
};

/**
 * POST /api/auth/logout
 * Invalidates the refresh token and clears cookies.
 */
export const logout = async () => {
  const res = await api.post<ApiSuccess>("/auth/logout");
  return res.data;
};