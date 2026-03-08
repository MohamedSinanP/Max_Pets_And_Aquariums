import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { store, persistor } from "../store";
import { logout } from "../store/authSlice";

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const baseURL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL,
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const message = error.response?.data?.message;
    const code = error.response?.data?.code;
    const url = originalRequest.url || "";

    const isAuthRoute =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/logout");

    const isAccessTokenError =
      status === 401 &&
      (
        code === "ACCESS_TOKEN_INVALID" ||
        code === "ACCESS_TOKEN_MISSING" ||
        message === "Invalid or expired token" ||
        message === "Access token missing"
      );

    if (!isAccessTokenError || isAuthRoute || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      await refreshClient.post("/auth/refresh");
      return api(originalRequest);
    } catch (refreshError: any) {
      const refreshStatus = refreshError?.response?.status;
      const refreshCode = refreshError?.response?.data?.code;
      const refreshMessage = refreshError?.response?.data?.message;

      const isRefreshTokenError =
        refreshStatus === 401 &&
        (
          refreshCode === "REFRESH_TOKEN_INVALID" ||
          refreshCode === "REFRESH_TOKEN_MISSING" ||
          refreshMessage === "Invalid refresh token" ||
          refreshMessage === "Refresh token missing"
        );

      if (isRefreshTokenError) {
        store.dispatch(logout());
        persistor.purge();

        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }

      return Promise.reject(refreshError);
    }
  }
);

export default api;