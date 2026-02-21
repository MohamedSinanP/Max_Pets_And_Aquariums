import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { User } from "../models/user.model";
import { STATUS_CODES } from "../constants/common";
import { sendSuccess } from "../utils/api.response";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { clearAuthCookies, setAuthCookies } from "../utils/token.cookie";

const validateEmail = (email: string) => {
  const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  return gmailRegex.test(email);
};

const validatePassword = (password: string) => {
  return password && password.trim().length >= 6;
};

const validateName = (name: string) => {
  return name && name.trim().length >= 2;
};

export const authController = {
  // ─────────────────────────────────────────
  // REGISTER (Generate tokens on creation)
  // ─────────────────────────────────────────
  register: async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    // VALIDATION
    if (!validateName(name)) {
      const error: any = new Error("Name is required (min 2 characters)");
      error.statusCode = STATUS_CODES.BAD_REQUEST;
      throw error;
    }

    if (!email || !validateEmail(email)) {
      const error: any = new Error("Valid Gmail address is required");
      error.statusCode = STATUS_CODES.BAD_REQUEST;
      throw error;
    }

    if (!validatePassword(password)) {
      const error: any = new Error("Password must be at least 6 characters");
      error.statusCode = STATUS_CODES.BAD_REQUEST;
      throw error;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const error: any = new Error("Email already exists");
      error.statusCode = STATUS_CODES.CONFLICT;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: email.trim(),
      password: hashedPassword,
    });

    const payload = { id: user._id, role: user.role };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshToken = refreshToken;
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    return sendSuccess(
      res,
      STATUS_CODES.CREATED,
      "User registered successfully"
    );
  },

  // ─────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────
  login: async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select(
      "+password +refreshToken"
    );

    if (!user) {
      const error: any = new Error("Invalid credentials");
      error.statusCode = STATUS_CODES.UNAUTHORIZED;
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      const error: any = new Error("Invalid credentials");
      error.statusCode = STATUS_CODES.UNAUTHORIZED;
      throw error;
    }

    const payload = { id: user._id, role: user.role };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshToken = refreshToken;
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    return sendSuccess(
      res,
      STATUS_CODES.SUCCESS,
      "Login successful"
    );
  },

  // REFRESH TOKEN (from cookie)
  refreshToken: async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      const error: any = new Error("Refresh token missing");
      error.statusCode = STATUS_CODES.UNAUTHORIZED;
      throw error;
    }

    let decoded: any;

    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      const error: any = new Error("Invalid refresh token");
      error.statusCode = STATUS_CODES.UNAUTHORIZED;
      throw error;
    }

    const user = await User.findById(decoded.id).select("+refreshToken");

    if (!user || user.refreshToken !== refreshToken) {
      const error: any = new Error("Invalid refresh token");
      error.statusCode = STATUS_CODES.UNAUTHORIZED;
      throw error;
    }

    const newAccessToken = generateAccessToken({
      id: user._id,
      role: user.role,
    });

    setAuthCookies(res, newAccessToken, refreshToken);

    return sendSuccess(
      res,
      STATUS_CODES.SUCCESS,
      "Token refreshed successfully"
    );
  },

  // ─────────────────────────────────────────
  // UPDATE PASSWORD
  // ─────────────────────────────────────────
  updatePassword: async (req: Request, res: Response) => {
    const { userId, oldPassword, newPassword } = req.body;

    if (!userId) {
      const error: any = new Error("User ID is required");
      error.statusCode = STATUS_CODES.BAD_REQUEST;
      throw error;
    }

    if (!oldPassword || !newPassword) {
      const error: any = new Error("Old and new password are required");
      error.statusCode = STATUS_CODES.BAD_REQUEST;
      throw error;
    }

    if (!validatePassword(newPassword)) {
      const error: any = new Error("New password must be at least 6 characters");
      error.statusCode = STATUS_CODES.BAD_REQUEST;
      throw error;
    }

    const user = await User.findById(userId).select("+password");

    if (!user) {
      const error: any = new Error("User not found");
      error.statusCode = STATUS_CODES.NOT_FOUND;
      throw error;
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      const error: any = new Error("Old password incorrect");
      error.statusCode = STATUS_CODES.UNAUTHORIZED;
      throw error;
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return sendSuccess(
      res,
      STATUS_CODES.SUCCESS,
      "Password updated successfully"
    );
  },

  // ─────────────────────────────────────────
  // UPDATE PROFILE
  // ─────────────────────────────────────────
  updateProfile: async (req: Request, res: Response) => {
    const { userId, name, phone, avatar } = req.body;

    if (!userId) {
      const error: any = new Error("User ID is required");
      error.statusCode = STATUS_CODES.BAD_REQUEST;
      throw error;
    }

    if (name !== undefined && !validateName(name)) {
      const error: any = new Error("Name must be at least 2 characters");
      error.statusCode = STATUS_CODES.BAD_REQUEST;
      throw error;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        ...(name && { name: name.trim() }),
        ...(phone && { phone }),
        ...(avatar && { avatar }),
      },
      { new: true }
    );

    if (!user) {
      const error: any = new Error("User not found");
      error.statusCode = STATUS_CODES.NOT_FOUND;
      throw error;
    }

    return sendSuccess(
      res,
      STATUS_CODES.SUCCESS,
      "Profile updated successfully",
      user
    );
  },

  // ─────────────────────────────────────────
  // LOGOUT (Invalidate refresh token)
  // ─────────────────────────────────────────
  logout: async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      const user = await User.findOne({ refreshToken }).select(
        "+refreshToken"
      );
      if (user) {
        user.refreshToken = null;
        await user.save();
      }
    }

    clearAuthCookies(res);

    return sendSuccess(
      res,
      STATUS_CODES.SUCCESS,
      "Logout successful"
    );
  },
};