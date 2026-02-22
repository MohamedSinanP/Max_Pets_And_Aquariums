import { Request, Response } from "express";
import { Order } from "../models/order.model";
import { Product } from "../models/product.model";
import { Types } from "mongoose";

const convertToBaseUnit = (quantity: number, unit: string) => {
  if (unit === "g") return quantity / 1000;     // grams → kg
  if (unit === "ml") return quantity / 1000;    // ml → liter
  return quantity; // pcs stays same
};
export const orderController = {

  // ─────────────────────────────
  // CREATE ORDER
  // ─────────────────────────────
  async create(req: Request, res: Response) {
    try {
      const { customer, items, discount = 0, paymentMethod } = req.body;

      if (!items || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Order must contain at least one item",
        });
      }

      let totalAmount = 0;
      const processedItems = [];

      for (const item of items) {

        if (!Types.ObjectId.isValid(item.product)) {
          return res.status(400).json({
            success: false,
            message: "Invalid product id",
          });
        }

        const product = await Product.findById(item.product);

        if (!product || !product.isActive) {
          return res.status(404).json({
            success: false,
            message: "Product not found",
          });
        }

        const variant = product.variants.find(
          (v) => v._id?.toString() === item.variant.toString());
        if (!variant || !variant.isActive) {
          return res.status(404).json({
            success: false,
            message: "Variant not found",
          });
        }

        // 🔥 Validate sellMode
        if (variant.sellMode !== item.sellMode) {
          return res.status(400).json({
            success: false,
            message: "Sell mode mismatch",
          });
        }

        // 🔥 Convert to base unit
        const baseQuantity = convertToBaseUnit(item.quantity, item.unit);

        // 🔥 Stock check
        if (variant.quantity.inStock < baseQuantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name}`,
          });
        }

        const unitPrice = variant.price.selling;
        const subtotal = baseQuantity * unitPrice;

        totalAmount += subtotal;

        // 🔥 Deduct stock
        variant.quantity.inStock -= baseQuantity;

        processedItems.push({
          product: product._id,
          variant: variant._id,
          quantity: item.quantity,
          unit: item.unit,
          sellMode: variant.sellMode,
          unitPrice,
          subtotal,
        });

        await product.save();
      }

      const finalAmount = totalAmount - discount;

      const order = await Order.create({
        orderNumber: `ORD-${Date.now()}`,
        customer,
        items: processedItems,
        totalAmount,
        discount,
        finalAmount,
        paymentMethod,
      });

      res.status(201).json({
        success: true,
        data: order,
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
  // ─────────────────────────────
  // UPDATE ORDER STATUS
  // ─────────────────────────────
  async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { orderStatus, paymentStatus } = req.body;

      const order = await Order.findById(id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // 🔥 If cancelling → restore stock
      if (
        (orderStatus === "cancelled" && order.orderStatus !== "cancelled") ||
        (paymentStatus === "refunded" && order.paymentStatus !== "refunded")
      ) {

        for (const item of order.items) {

          const product = await Product.findById(item.product);
          if (!product) continue;

          const variant = product.variants.find(
            (v) => v._id?.toString() === item.variant.toString()
          );
          if (!variant) continue;

          const baseQuantity = convertToBaseUnit(
            item.quantity,
            item.unit
          );

          variant.quantity.inStock += baseQuantity;

          await product.save();
        }
      }

      if (orderStatus) order.orderStatus = orderStatus;
      if (paymentStatus) order.paymentStatus = paymentStatus;

      await order.save();

      res.json({
        success: true,
        data: order,
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
}