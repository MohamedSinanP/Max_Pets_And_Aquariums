import { Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { User } from "../models/user.model";
import { STATUS_CODES } from "../constants/common";
import { sendSuccess } from "../utils/api.response";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { clearAuthCookies, setAuthCookies } from "../utils/token.cookie";
import { sendMail } from "../utils/mailer";
import { forgotPasswordTemplate, passwordChangedTemplate } from "../utils/mail.templates";
import { cloudinaryUtil } from "../utils/cloudinary.utils";

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
      "Login successful",
      {
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email,
        phone: user.phone,
        isActive: user.isActive,
        avatar: user.avatar,
      }
    );
  },

  // REFRESH TOKEN (from cookie)
  refreshToken: async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      const error: any = new Error("Refresh token missing");
      error.statusCode = STATUS_CODES.UNAUTHORIZED;
      error.code = "REFRESH_TOKEN_INVALID";
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
  // FORGET PASSWORD
  // ─────────────────────────────────────────
  forgotPassword: async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email || !validateEmail(email)) {
      const error: any = new Error("Valid Gmail address is required");
      error.statusCode = STATUS_CODES.BAD_REQUEST;
      throw error;
    }

    const user = await User.findOne({ email }).select("+resetPasswordToken +resetPasswordExpiry");

    // Do not reveal whether user exists
    if (!user) {
      return sendSuccess(
        res,
        STATUS_CODES.SUCCESS,
        "If an account exists with this email, a password reset link has been sent"
      );
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;

    await sendMail({
      to: user.email,
      subject: "Reset your password",
      html: forgotPasswordTemplate(user.name, resetLink),
      text: `Reset your password using this link: ${resetLink}`,
    });

    return sendSuccess(
      res,
      STATUS_CODES.SUCCESS,
      "If an account exists with this email, a password reset link has been sent"
    );
  },
  // ─────────────────────────────────────────
  // RESET PASSWORD
  // ─────────────────────────────────────────
  resetPassword: async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;

    if (!token) {
      const error: any = new Error("Reset token is required");
      error.statusCode = STATUS_CODES.BAD_REQUEST;
      throw error;
    }

    if (!validatePassword(newPassword)) {
      const error: any = new Error("New password must be at least 6 characters");
      error.statusCode = STATUS_CODES.BAD_REQUEST;
      throw error;
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: { $gt: new Date() },
    }).select("+resetPasswordToken +resetPasswordExpiry +password");

    if (!user) {
      const error: any = new Error("Invalid or expired reset token");
      error.statusCode = STATUS_CODES.BAD_REQUEST;
      throw error;
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpiry = null;
    user.refreshToken = null;
    await user.save();

    await sendMail({
      to: user.email,
      subject: "Your password was changed",
      html: passwordChangedTemplate(user.name),
      text: "Your account password was changed successfully.",
    });

    return sendSuccess(
      res,
      STATUS_CODES.SUCCESS,
      "Password reset successfully"
    );
  },
  // ─────────────────────────────────────────
  // RESET PASSWORD
  // ─────────────────────────────────────────
  updatePassword: async (req: Request, res: Response) => {
    const { oldPassword, newPassword } = req.body;

    if (!req.user?.id) {
      const error: any = new Error("Unauthorized");
      error.statusCode = STATUS_CODES.UNAUTHORIZED;
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

    const user = await User.findById(req.user.id).select("+password");

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

    await sendMail({
      to: user.email,
      subject: "Your password was updated",
      html: passwordChangedTemplate(user.name),
      text: "Your account password was changed successfully.",
    });

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
    const { userId, name, phone, email } = req.body;

    if (!userId) {
      const error: any = new Error("User ID is required");
      error.statusCode = STATUS_CODES.BAD_REQUEST;
      throw error;
    }

    if (name !== undefined && name.trim().length < 2) {
      const error: any = new Error("Name must be at least 2 characters");
      error.statusCode = STATUS_CODES.BAD_REQUEST;
      throw error;
    }

    if (email !== undefined && !validateEmail(email)) {
      const error: any = new Error("Valid Gmail address is required");
      error.statusCode = STATUS_CODES.BAD_REQUEST;
      throw error;
    }

    const user = await User.findById(userId);

    if (!user) {
      const error: any = new Error("User not found");
      error.statusCode = STATUS_CODES.NOT_FOUND;
      throw error;
    }

    if (name !== undefined) {
      user.name = name.trim();
    }

    if (phone !== undefined) {
      user.phone = phone;
    }

    if (email !== undefined) {
      user.email = email;
    }

    if (req.file) {
      // delete old avatar if exists
      if (user.avatar?.public_id) {
        await cloudinaryUtil.deleteImage(user.avatar.public_id);
      }

      const uploaded = await cloudinaryUtil.uploadImage(
        req.file.buffer,
        "users/avatars"
      );

      user.avatar = {
        url: uploaded.url,
        public_id: uploaded.public_id,
      };
    }

    await user.save();

    return sendSuccess(
      res,
      STATUS_CODES.SUCCESS,
      "Profile updated successfully",
      {
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email,
        phone: user.phone,
        isActive: user.isActive,
        avatar: user.avatar,
      }
    );
  },

  me: async (req: Request, res: Response) => {
    if (!req.user?.id) {
      const error: any = new Error("Unauthorized");
      error.statusCode = STATUS_CODES.UNAUTHORIZED;
      throw error;
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      const error: any = new Error("User not found");
      error.statusCode = STATUS_CODES.NOT_FOUND;
      throw error;
    }

    return sendSuccess(
      res,
      STATUS_CODES.SUCCESS,
      "Authenticated user fetched",
      {
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email,
        phone: user.phone,
        isActive: user.isActive,
        avatar: user.avatar,
      }
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