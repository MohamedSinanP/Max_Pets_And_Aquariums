import { Schema, model, Document, Types } from "mongoose";

export interface ISupplier extends Document {
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  productsSupplied: Types.ObjectId[];
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    name: {
      type: String,
      required: [true, "Supplier name is required"],
      trim: true,
    },

    contactPerson: {
      type: String,
      required: [true, "Contact person name is required"],
      trim: true,
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    address: {
      type: String,
      trim: true,
      default: null,
    },

    // Reverse reference — keeps track of all products this supplier provides
    // Updated whenever a new Product is assigned to this supplier
    productsSupplied: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },

    notes: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

SupplierSchema.index({ name: 1 });
SupplierSchema.index({ isActive: 1 });

export const Supplier = model<ISupplier>("Supplier", SupplierSchema);