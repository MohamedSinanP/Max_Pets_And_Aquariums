import { Schema, model, Types, Document } from "mongoose";

/* ─────────────────────────────
   TYPES
───────────────────────────── */

export type SellMode = "packaged" | "loose";

export type BaseUnit = "mg" | "ml" | "pcs";
export type PriceUnit = "kg" | "liter" | "pcs";     // how price is defined

export type ProductType =
  | "animal"
  | "food"
  | "accessory"
  | "medicine"
  | "other";

/* ─────────────────────────────
   Interfaces
───────────────────────────── */

export interface IImage {
  url: string;
  public_id: string;
}

export interface IPrice {
  buying: number;   // per priceUnit
  selling: number;  // per priceUnit
}

export interface IQuantity {
  inStock: number;      // stored in baseUnit (g/ml/pcs)
  baseUnit: BaseUnit;
}

export interface IVariantOption {
  name: string;
  values: string[];
}

export interface IVariant {
  _id?: Types.ObjectId;

  sku: string;
  sellMode: SellMode;

  attributes: Map<string, string>;

  price: IPrice;              // always required
  priceUnit: PriceUnit;       // defines how price is interpreted

  quantity: IQuantity;

  images: IImage[];
  isActive: boolean;
}

export interface IProduct extends Document {
  name: string;
  category: Types.ObjectId;
  type: ProductType;

  description?: string;

  specifications: Map<string, string>;

  variantOptions: IVariantOption[];
  variants: IVariant[];

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

/* ─────────────────────────────
   Sub-Schemas
───────────────────────────── */

const VariantOptionSchema = new Schema<IVariantOption>(
  {
    name: { type: String, required: true, trim: true },
    values: [{ type: String, required: true, trim: true }],
  },
  { _id: false }
);

const ImageSchema = new Schema<IImage>(
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

    baseUnit: {
      type: String,
      enum: ["mg", "ml", "pcs"],
      required: true,
    },
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
      required: true,
    },

    attributes: {
      type: Map,
      of: String,
      default: {},
    },

    price: {
      type: PriceSchema,
      required: true,
    },

    priceUnit: {
      type: String,
      enum: ["kg", "liter", "pcs"],
      required: true,
    },

    quantity: {
      type: QuantitySchema,
      required: true,
    },

    images: {
      type: [ImageSchema],
      default: [],
    },

    isActive: { type: Boolean, default: true },
  },
  { _id: true }
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

    specifications: {
      type: Map,
      of: String,
      default: {},
    },

    variantOptions: {
      type: [VariantOptionSchema],
      default: [],
    },

    variants: {
      type: [VariantSchema],
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
ProductSchema.index({ type: 1 });
ProductSchema.index({ isActive: 1 });
ProductSchema.index({ "variants.sku": 1 });
ProductSchema.index({ name: "text", description: "text" });

export const Product = model<IProduct>("Product", ProductSchema);