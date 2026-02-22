import { Schema, model } from "mongoose";
import {
  IAttribute,
  IPrice,
  IProduct,
  IQuantity,
  IVariant,
  IVariantOption,
} from "../types/types";

/* ─────────────────────────────
   Sub-Schemas
───────────────────────────── */

const AttributeSchema = new Schema<IAttribute>(
  {
    key: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const VariantOptionSchema = new Schema<IVariantOption>(
  {
    name: { type: String, required: true, trim: true },
    values: [{ type: String, required: true, trim: true }],
  },
  { _id: false }
);

const ImageSchema = new Schema(
  {
    url: { type: String, required: true },
    public_id: { type: String, required: true },
  },
  { _id: false }
);

const PriceSchema = new Schema<IPrice>(
  {
    buying: { type: Number, required: true, min: 0 },
    selling: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const QuantitySchema = new Schema<IQuantity>(
  {
    inStock: { type: Number, default: 0, min: 0 },
    minThreshold: { type: Number, default: 5 },
    unit: { type: String, default: "pcs", trim: true },
  },
  { _id: false }
);

/* ─────────────────────────────
   Variant Schema
───────────────────────────── */

const VariantSchema = new Schema<IVariant>(
  {
    sku: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      unique: true,
    },
    sellMode: {
      type: String,
      enum: ["packaged", "loose"],
      default: "packaged",
      required: true,
    },
    attributes: {
      type: [AttributeSchema],
      default: [],
    },

    price: { type: PriceSchema, required: true },
    quantity: { type: QuantitySchema, required: true },

    images: {
      type: [ImageSchema],
      default: [],
    },

    isActive: { type: Boolean, default: true },
  },
  { _id: true } // 🔥 Allow _id for variant-level updates
);

/* ─────────────────────────────
   Product Schema
───────────────────────────── */

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },

    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    type: {
      type: String,
      enum: ["animal", "food", "accessory", "medicine", "other"],
      required: true,
    },

    description: { type: String, default: null, trim: true },

    supplier: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },

    attributes: {
      type: [AttributeSchema],
      default: [],
    },

    variantOptions: {
      type: [VariantOptionSchema],
      default: [],
    },

    variants: {
      type: [VariantSchema],
      default: [],
      required: true,
      validate: {
        validator: function (value: IVariant[]) {
          return value.length > 0;
        },
        message: "Product must have at least one variant",
      },
    },

    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

/* ─────────────────────────────
   Indexes
───────────────────────────── */

ProductSchema.index({ category: 1 });
ProductSchema.index({ supplier: 1 });
ProductSchema.index({ type: 1 });
ProductSchema.index({ isActive: 1 });
ProductSchema.index({ "variants.sku": 1 });
ProductSchema.index({ name: "text", description: "text" });

export const Product = model<IProduct>("Product", ProductSchema);