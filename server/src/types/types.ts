import { Document, Types } from "mongoose";

export interface ICategory {
  name: string;
  slug: string;
  parent: Types.ObjectId | null;
  type: "living" | "non-living";
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/* ─────────────────────────────
   Flexible Key-Value Attribute
───────────────────────────── */
export interface IAttribute {
  key: string;
  value: string;
}

/* ─────────────────────────────
   Variant Option Definition
   (Defines allowed options like color, size)
───────────────────────────── */
export interface IVariantOption {
  name: string;        // color, size
  values: string[];    // ["red", "blue"]
}

/* ─────────────────────────────
   Image (Stored in Cloudinary)
───────────────────────────── */
export interface IImage {
  url: string;
  public_id: string;
}

export type SellMode = "packaged" | "loose";


/* ─────────────────────────────
   Price
───────────────────────────── */
export interface IPrice {
  buying: number;
  selling: number;
}

/* ─────────────────────────────
   Quantity
───────────────────────────── */
export type BaseUnit = "g" | "ml" | "pcs";

export interface IQuantity {
  inStock: number;
  baseUnit: BaseUnit;
}

/* ─────────────────────────────
   Variant (Subdocument)
───────────────────────────── */
export interface IVariant {
  _id?: Types.ObjectId;   // important for updates
  sku: string;
  sellMode: SellMode;

  attributes: IAttribute[];

  price: IPrice;
  pricePerBaseUnit?: number;
  quantity: IQuantity;

  images: IImage[];       //  moved here

  isActive: boolean;
}

/* ─────────────────────────────
   Product Type
───────────────────────────── */
export type ProductType =
  | "animal"
  | "food"
  | "accessory"
  | "medicine"
  | "other";

/* ─────────────────────────────
   Product
───────────────────────────── */
export interface IProduct extends Document {
  name: string;
  category: Types.ObjectId;
  type: ProductType;

  description?: string;
  supplier?: Types.ObjectId;

  variantOptions: IVariantOption[];
  variants: IVariant[];

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

// Types related to order 
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
  variant: Types.ObjectId;

  quantity: number;            // in base unit
  unit: "pcs" | "g" | "ml";    // freeze unit at purchase time
  sellMode: "packaged" | "loose"; // freeze sellMode snapshot

  unitPrice: number;
  subtotal: number;
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
  receiptPrinted: boolean;  // Track if receipt was printed
  createdAt: Date;
  updatedAt: Date;
}