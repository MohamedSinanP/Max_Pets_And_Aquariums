// import { Schema, model, Document, Types } from "mongoose";

// export type TransactionType =
//   | "restock"      // New stock arrived from supplier
//   | "sale"         // Sold to a customer (triggered by Order)
//   | "adjustment"   // Manual correction by admin/staff
//   | "return"       // Customer returned item
//   | "expired"      // Item expired/disposed
//   | "transfer"     // Moved between locations (future use)
//   | "damage";      // Damaged/lost stock

// export interface IStockTransaction extends Document {
//   product: Types.ObjectId;
//   type: TransactionType;
//   quantity: number;       // Positive = stock IN, Negative = stock OUT
//   previousQty: number;    // Stock level before this transaction
//   newQty: number;         // Stock level after this transaction
//   reason?: string;        // Optional human-readable explanation
//   // Reference to the order that triggered this (only for "sale" and "return" types)
//   order?: Types.ObjectId;
//   // Reference to the supplier (only for "restock" type)
//   supplier?: Types.ObjectId;
//   // The staff member who performed or triggered this transaction
//   performedBy: Types.ObjectId;
//   createdAt: Date;
//   updatedAt: Date;
// }

// const StockTransactionSchema = new Schema<IStockTransaction>(
//   {
//     // → Product model (many transactions belong to one Product)
//     product: {
//       type: Schema.Types.ObjectId,
//       ref: "Product",
//       required: [true, "Product reference is required"],
//     },

//     type: {
//       type: String,
//       enum: ["restock", "sale", "adjustment", "return", "expired", "transfer", "damage"],
//       required: [true, "Transaction type is required"],
//     },

//     // Positive number = added to stock (restock, return)
//     // Negative number = removed from stock (sale, expired, damage)
//     quantity: {
//       type: Number,
//       required: [true, "Quantity is required"],
//     },

//     // Snapshot of stock BEFORE this transaction — for full audit trail
//     previousQty: {
//       type: Number,
//       required: [true, "Previous quantity is required"],
//     },

//     // Snapshot of stock AFTER this transaction
//     newQty: {
//       type: Number,
//       required: [true, "New quantity is required"],
//     },

//     reason: {
//       type: String,
//       trim: true,
//       default: null,
//       // e.g. "Monthly restock from Gulf Pet Imports"
//       // e.g. "3 bags found damaged on shelf inspection"
//     },

//     // → Order model — only populated for "sale" and "return" transactions
//     order: {
//       type: Schema.Types.ObjectId,
//       ref: "Order",
//       default: null,
//     },

//     // → Supplier model — only populated for "restock" transactions
//     supplier: {
//       type: Schema.Types.ObjectId,
//       ref: "Supplier",
//       default: null,
//     },

//     // → User model — who performed this action
//     performedBy: {
//       type: Schema.Types.ObjectId,
//       ref: "User",
//       required: [true, "Performed by user is required"],
//     },
//   },
//   {
//     timestamps: true,
//     toJSON: { virtuals: true },
//     toObject: { virtuals: true },
//   }
// );

// // Virtual: was this a stock-in or stock-out transaction?
// StockTransactionSchema.virtual("direction").get(function () {
//   return this.quantity > 0 ? "in" : "out";
// });

// // Compound index for the most common query: "all transactions for product X sorted by date"
// StockTransactionSchema.index({ product: 1, createdAt: -1 });
// // For filtering by type across all products (e.g. all sales this month)
// StockTransactionSchema.index({ type: 1, createdAt: -1 });
// // For filtering by who performed transactions
// StockTransactionSchema.index({ performedBy: 1, createdAt: -1 });
// // For linking back to an order
// StockTransactionSchema.index({ order: 1 });

// export const StockTransaction = model<IStockTransaction>(
//   "StockTransaction",
//   StockTransactionSchema
// );