import { Document } from "mongoose";

export type UserRole = "owner" | "admin" | "staff";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  otp?: string;
  otpExpiry?: Date;
  refreshToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}