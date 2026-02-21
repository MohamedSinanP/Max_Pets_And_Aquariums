import { Schema, model, Document, Types } from "mongoose";

// Flexible key-value pair for extra product-specific attributes
export interface IAttribute {
  key: string;
  value: string;
}

export interface IPrice {
  buying: number;
  selling: number;
}

export interface IQuantity {
  inStock: number;
  minThreshold: number; // Alert fires when inStock drops to or below this
  unit: string;         // "pcs", "kg", "liter", "pack", etc.
}

export type ProductType = "animal" | "food" | "accessory" | "medicine" | "other";

export interface IProduct extends Document {
  name: string;
  sku: string;
  category: Types.ObjectId;
  type: ProductType;
  description?: string;
  images: string[];
  price: IPrice;
  quantity: IQuantity;
  supplier: Types.ObjectId;
  // Flexible extra fields — add any extra info without schema changes
  // e.g. [{ key: "brand", value: "Royal Canin" }, { key: "weight", value: "5kg" }]
  attributes: IAttribute[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AttributeSchema = new Schema<IAttribute>(
  {
    key: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false } // No need for separate IDs on subdocuments
);

const ProductSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },

    sku: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
    },

    // → Category model (many Products belong to one Category)
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },

    type: {
      type: String,
      enum: ["animal", "food", "accessory", "medicine", "other"],
      required: [true, "Product type is required"],
    },

    description: {
      type: String,
      trim: true,
      default: null,
    },

    // Array of Cloudinary/S3 image URLs
    images: {
      type: [String],
      default: [],
    },

    price: {
      buying: {
        type: Number,
        required: [true, "Buying price is required"],
        min: [0, "Buying price cannot be negative"],
      },
      selling: {
        type: Number,
        required: [true, "Selling price is required"],
        min: [0, "Selling price cannot be negative"],
      },
    },

    quantity: {
      inStock: {
        type: Number,
        default: 0,
        min: [0, "Stock cannot be negative"],
      },
      minThreshold: {
        type: Number,
        default: 5,
      },
      unit: {
        type: String,
        default: "pcs",
        trim: true,
      },
    },

    // → Supplier model (many Products can come from one Supplier)
    supplier: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      required: [true, "Supplier is required"],
    },

    // Flexible attributes array — no schema changes needed for new product types
    attributes: {
      type: [AttributeSchema],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);


// Indexes for common query patterns
ProductSchema.index({ category: 1 });
ProductSchema.index({ supplier: 1 });
ProductSchema.index({ type: 1 });
ProductSchema.index({ isActive: 1 });
ProductSchema.index({ "quantity.inStock": 1 });
ProductSchema.index({ sku: 1 });
// Text index for search
ProductSchema.index({ name: "text", description: "text" });

export const Product = model<IProduct>("Product", ProductSchema);