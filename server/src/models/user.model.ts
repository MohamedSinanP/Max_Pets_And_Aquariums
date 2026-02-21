import { Schema, model } from "mongoose";
import { IUser } from "../types/auth";

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },

    role: {
      type: String,
      enum: ["owner", "admin", "staff"],
      default: "staff",
    },

    phone: {
      type: String,
      trim: true,
      default: null,
    },

    avatar: {
      type: String,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    otp: {
      type: String,
      select: false,
      default: null,
    },

    otpExpiry: {
      type: Date,
      select: false,
      default: null,
    },
    refreshToken: {
      type: String,
      select: false,
      default: null,
    },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });

export const User = model<IUser>("User", UserSchema);