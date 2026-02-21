import { Schema, model, Document, Types } from "mongoose";

export type PaymentStatus = "pending" | "paid" | "partial" | "refunded";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "ready"
  | "delivered"
  | "cancelled";
export type PaymentMethod = "cash" | "card" | "online" | "other";

export interface IOrderItem {
  product: Types.ObjectId;
  quantity: number;
  unitPrice: number;    // Price at time of purchase — frozen so price changes don't affect history
  subtotal: number;     // quantity * unitPrice
}

export interface ICustomer {
  name: string;
  phone: string;
  email?: string;
}

export interface IOrder extends Document {
  orderNumber: string;  // Human-readable e.g. "ORD-20240315-001"
  customer: ICustomer;
  items: IOrderItem[];
  totalAmount: number;
  discount?: number;        // Discount in currency value
  finalAmount: number;      // totalAmount - discount
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  orderStatus: OrderStatus;
  // → User model — the staff member who processed this order
  handledBy: Types.ObjectId;
  notes?: string;
  receiptPrinted: boolean;  // Track if receipt was printed
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    // → Product model (embedded reference inside order)
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product reference is required"],
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },

    // Price is frozen at time of purchase
    // Never reference product.price.selling directly for history
    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: [0, "Unit price cannot be negative"],
    },

    subtotal: {
      type: Number,
      required: [true, "Subtotal is required"],
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
      required: [true, "Customer info is required"],
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

    // → User model — staff who handled the sale
    handledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Handler (staff) reference is required"],
    },

    notes: {
      type: String,
      trim: true,
      default: null,
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