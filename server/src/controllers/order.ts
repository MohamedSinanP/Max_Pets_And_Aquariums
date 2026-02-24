import { Request, Response } from "express";
import { Order } from "../models/order.model";
import { Product } from "../models/product.model";
import { Types } from "mongoose";
import { sendError, sendSuccess } from "../utils/api.response";

const convertToBaseUnit = (quantity: number, unit: string) => {
  if (unit === "g") return quantity / 1000;
  if (unit === "ml") return quantity / 1000;
  return quantity;
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
  // ─────────────────────────────
  // GET ALL ORDERS (Pagination + Filters + Search)
  // ─────────────────────────────
  async getAll(req: Request, res: Response) {
    try {
      const {
        page,
        limit,
        search,
        orderStatus,
        paymentStatus,
        from,
        to,
        phone,
      } = req.query;

      const pageNumber =
        typeof page === "string" ? parseInt(page) : 1;

      const pageSize =
        typeof limit === "string" ? parseInt(limit) : 10;

      const skip = (pageNumber - 1) * pageSize;

      const filter: any = {};

      // 🔍 Search
      if (typeof search === "string") {
        filter.$or = [
          { orderNumber: { $regex: search, $options: "i" } },
          { "customer.name": { $regex: search, $options: "i" } },
        ];
      }

      if (typeof orderStatus === "string") {
        filter.orderStatus = orderStatus;
      }

      if (typeof paymentStatus === "string") {
        filter.paymentStatus = paymentStatus;
      }

      if (typeof phone === "string") {
        filter["customer.phone"] = phone;
      }

      if (typeof from === "string" || typeof to === "string") {
        filter.createdAt = {};

        if (typeof from === "string") {
          filter.createdAt.$gte = new Date(from);
        }

        if (typeof to === "string") {
          filter.createdAt.$lte = new Date(to);
        }
      }

      const [orders, total] = await Promise.all([
        Order.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(pageSize)
          .lean(),
        Order.countDocuments(filter),
      ]);

      return sendSuccess(res, 200, "Orders fetched successfully", {
        orders,
        pagination: {
          total,
          page: pageNumber,
          limit: pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      });

    } catch (error: any) {
      return sendError(res, 500, "Failed to fetch orders", error.message);
    }
  },
  // ─────────────────────────────
  // GET SINGLE ORDER
  // ─────────────────────────────
  async getById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;

      if (!Types.ObjectId.isValid(id)) {
        return sendError(res, 400, "Invalid order id");
      }

      const order = await Order.findById(id)
        .populate("items.product", "name image category")
        .lean();

      if (!order) {
        return sendError(res, 404, "Order not found");
      }

      return sendSuccess(res, 200, "Order fetched successfully", order);

    } catch (error: any) {
      return sendError(res, 500, "Failed to fetch order", error.message);
    }
  }
}