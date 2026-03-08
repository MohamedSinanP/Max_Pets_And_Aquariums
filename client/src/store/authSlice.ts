import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser } from "../types/user";

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isHydrated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isHydrated = true;
    },

    updateUser: (state, action: PayloadAction<Partial<AuthUser>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },

    clearUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isHydrated = true;
    },

    setHydrated: (state, action: PayloadAction<boolean>) => {
      state.isHydrated = action.payload;
    },

    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isHydrated = true;
    },
  },
});

export const { setUser, updateUser, clearUser, setHydrated, logout } =
  authSlice.actions;

export default authSlice.reducer;