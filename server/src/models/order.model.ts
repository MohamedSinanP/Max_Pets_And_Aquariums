import { Schema, model, Document, Types } from "mongoose";

/* ─────────────────────────────
   TYPES (Order)
───────────────────────────── */

export type PaymentStatus = "pending" | "paid" | "partial" | "refunded";
export type OrderStatus = "pending" | "confirmed" | "ready" | "delivered" | "cancelled";
export type PaymentMethod = "cash" | "card" | "online" | "other";

// ✅ Align with Product schema
export type SellMode = "packaged" | "loose";
export type BaseUnit = "mg" | "ml" | "pcs";
export type PriceUnit = "kg" | "liter" | "pcs";

/* ─────────────────────────────
   Interfaces
───────────────────────────── */

export interface IOrderItem {
  product: Types.ObjectId;
  variant: Types.ObjectId;

  quantity: number;
  unit: BaseUnit;
  sellMode: SellMode;

  priceUnit: PriceUnit;

  unitPrice: number;
  subtotal: number;
}

export interface ICustomer {
  name: string;
  phone: string;
  email?: string | null;
}

export interface IOrder extends Document {
  orderNumber: string; // Human-readable e.g. "ORD-20240315-001"
  customer: ICustomer | null;
  items: IOrderItem[];
  totalAmount: number;
  discount?: number;
  finalAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  orderStatus: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

/* ─────────────────────────────
   Schemas
───────────────────────────── */

const OrderItemSchema = new Schema<IOrderItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    variant: {
      type: Schema.Types.ObjectId,
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0.001,
    },

    // ✅ UPDATED: align with Product baseUnit
    unit: {
      type: String,
      enum: ["mg", "ml", "pcs"],
      required: true,
    },

    sellMode: {
      type: String,
      enum: ["packaged", "loose"],
      required: true,
    },

    // ✅ NEW: align with Product priceUnit
    priceUnit: {
      type: String,
      enum: ["kg", "liter", "pcs"],
      required: true,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true }
);

const CustomerSchema = new Schema<ICustomer>(
  {
    name: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Customer phone is required"],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      unique: true,
    },

    customer: {
      type: CustomerSchema,
      required: false,
      default: null,
    },

    items: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator: (v: IOrderItem[]) => v.length > 0,
        message: "Order must have at least one item",
      },
    },

    totalAmount: {
      type: Number,
      required: true,
      min: [0, "Total amount cannot be negative"],
    },

    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },

    finalAmount: {
      type: Number,
      required: true,
      min: [0, "Final amount cannot be negative"],
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "partial", "refunded"],
      default: "pending",
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "card", "online", "other"],
      default: "cash",
    },

    orderStatus: {
      type: String,
      enum: ["pending", "confirmed", "ready", "delivered", "cancelled"],
      default: "pending",
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ─────────────────────────────
   Indexes
───────────────────────────── */

OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ orderStatus: 1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ "customer.phone": 1 });

export const Order = model<IOrder>("Order", OrderSchema);