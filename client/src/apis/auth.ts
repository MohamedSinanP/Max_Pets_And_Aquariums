import type { AuthUser } from "../types/user";
import api from "./api";

/* =========================
   Types
========================= */

export interface UserAvatar {
  url: string;
  public_id: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  avatar?: UserAvatar | null;
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
  email: string;
  phone?: string;
  avatarFile?: File | null;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: AuthUser;
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
  const res = await api.post<AuthResponse>("/auth/login", payload);
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
  const formData = new FormData();

  formData.append("userId", payload.userId);

  if (payload.name !== undefined) {
    formData.append("name", payload.name);
  }

  if (payload.phone !== undefined) {
    formData.append("phone", payload.phone);
  }

  if (payload.email !== undefined) {
    formData.append("email", payload.email);
  }

  if (payload.avatarFile) {
    formData.append("avatar", payload.avatarFile);
  }

  const res = await api.put<ApiSuccess<User>>(
    "/auth/update-profile",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

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

export const getMe = async (): Promise<AuthUser> => {
  const res = await api.get<AuthResponse>("/auth/me");
  return res.data.data;
};