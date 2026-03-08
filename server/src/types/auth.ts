import { Document } from "mongoose";

export type UserRole = "owner" | "admin" | "staff";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  avatar: {
    url: string | null;
    public_id: string | null;
  },
  isActive: boolean;
  refreshToken: string | null;
  resetPasswordToken?: string | null;
  resetPasswordExpiry?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}