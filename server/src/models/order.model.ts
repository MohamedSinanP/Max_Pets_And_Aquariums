import { Schema, model, Document, Types } from "mongoose";
import { ICustomer, IOrder, IOrderItem } from "../types/types";

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

    unit: {
      type: String,
      enum: ["pcs", "g", "ml"],
      required: true,
    },

    sellMode: {
      type: String,
      enum: ["packaged", "loose"],
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
    // Auto-generated human-readable order number
    orderNumber: {
      type: String,
      unique: true,
    },

    // Embedded customer info — not a ref, intentional
    // Reason: customers here are walk-in, no account system needed
    // If you add customer accounts later, add a customer ref alongside this
    customer: {
      type: CustomerSchema,
      required: false,
      default: null,
    },

    // Array of ordered items — each has a frozen price snapshot
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator: (v: IOrderItem[]) => v.length > 0,
        message: "Order must have at least one item",
      },
    },

    // Sum of all item subtotals (before discount)
    totalAmount: {
      type: Number,
      required: true,
      min: [0, "Total amount cannot be negative"],
    },

    // Discount applied in currency value (not percentage)
    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },

    // totalAmount - discount
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
    },

    // Track if receipt was printed for this order
    // Used by the print button on the frontend
    receiptPrinted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);


OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ orderStatus: 1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ handledBy: 1 });
OrderSchema.index({ createdAt: -1 }); // Most recent orders first
OrderSchema.index({ "customer.phone": 1 }); // Fast customer lookup by phone

export const Order = model<IOrder>("Order", OrderSchema);