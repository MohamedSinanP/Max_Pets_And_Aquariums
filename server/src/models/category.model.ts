import { Schema, model } from "mongoose";
import { ICategory } from "../types/types";

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },

    parent: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    type: {
      type: String,
      enum: ["living", "non-living"],
      required: [true, "Category type is required"],
    },

    icon: {
      type: String,
      default: null,
    },

    description: {
      type: String,
      trim: true,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,

    versionKey: false,

    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      },
    },

    toObject: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      },
    },
  }
);

// Indexes
CategorySchema.index({ parent: 1 });
CategorySchema.index({ slug: 1 });
CategorySchema.index({ type: 1 });

export const Category = model<ICategory>("Category", CategorySchema);