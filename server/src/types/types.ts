import { Types } from "mongoose";

export interface ICategory {
  name: string;
  slug: string;
  parent: Types.ObjectId | null;
  type: "living" | "non-living";
  icon?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}