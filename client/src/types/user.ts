export type UserRole = "owner" | "admin" | "staff";

export interface UserAvatar {
  url: string;
  public_id: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  avatar: UserAvatar | nu;
  isActive: boolean;
}