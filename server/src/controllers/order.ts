import mongoose, { Types } from "mongoose";
import { Request, Response } from "express";
import { Order } from "../models/order.model";
import { Product } from "../models/product.model";
import { Counter } from "../models/order.counter.model";
import { sendError, sendSuccess } from "../utils/api.response";

type BaseUnit = "mg" | "ml" | "pcs";
type PriceUnit = "kg" | "liter" | "pcs";
type SellMode = "packaged" | "loose";

type CreateOrderItemInput = {
  product: string;
  variant: string; // Product.variants subdoc _id
  quantity: number;

  // optional from client (we validate if provided, but we don’t trust them)
  unit?: BaseUnit;
  sellMode?: SellMode;
  priceUnit?: PriceUnit;
};

const isValidBaseUnit = (u: any): u is BaseUnit => ["mg", "ml", "pcs"].includes(u);
const isValidPriceUnit = (u: any): u is PriceUnit => ["kg", "liter", "pcs"].includes(u);

function calcSubtotal(qty: number, unit: BaseUnit, priceUnit: PriceUnit, unitPrice: number) {
  if (qty <= 0) return 0;

  if (priceUnit === "pcs") {
    if (unit !== "pcs") throw new Error("UNIT_PRICE_UNIT_MISMATCH");
    return qty * unitPrice;
  }

  if (priceUnit === "kg") {
    if (unit !== "mg") throw new Error("UNIT_PRICE_UNIT_MISMATCH");
    const qtyKg = qty / 1_000_000; // 1 kg = 1,000,000 mg
    return qtyKg * unitPrice;
  }

  // liter
  if (unit !== "ml") throw new Error("UNIT_PRICE_UNIT_MISMATCH");
  const qtyLiter = qty / 1000; // 1 liter = 1000 ml
  return qtyLiter * unitPrice;
}

function assertPackagedQty(qty: number) {
  if (!Number.isFinite(qty) || qty <= 0) throw new Error("INVALID_QUANTITY");
  if (!Number.isInteger(qty)) throw new Error("PACKAGED_QTY_MUST_BE_INTEGER");
}

function formatYYYYMMDD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

/**
 * ✅ Atomic order number generator
 * - sequence resets per day (key = order:YYYYMMDD)
 * - guaranteed unique because $inc is atomic + key has unique index
 */
async function nextOrderNumber(session: mongoose.ClientSession) {
  const datePart = formatYYYYMMDD(new Date());
  const key = `order:${datePart}`;

  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session }
  );

  const seq = String(counter.seq).padStart(4, "0");
  return `ORD-${datePart}-${seq}`; // e.g. ORD-20260305-0001
}

export const orderController = {
  // ─────────────────────────────
  // CREATE ORDER
  // ─────────────────────────────
  async create(req: Request, res: Response) {
    const session = await mongoose.startSession();

    try {
      const {
        customer = null,
        items,
        discount = 0,
        paymentMethod = "cash",
        paymentStatus = "paid",
        orderStatus = "delivered",
      } = req.body as {
        customer?: any;
        items?: CreateOrderItemInput[];
        discount?: number;
        paymentMethod?: string;
        paymentStatus?: string;
        orderStatus?: string;
      };

      if (!Array.isArray(items) || items.length === 0) {
        return sendError(res, 400, "Order must contain at least one item");
      }

      const disc = Number(discount ?? 0);
      if (!Number.isFinite(disc) || disc < 0) {
        return sendError(res, 400, "Discount must be a number >= 0");
      }

      let totalAmount = 0;
      const processedItems: any[] = [];

      await session.withTransaction(async () => {
        // ✅ generate unique order number inside the transaction
        const orderNumber = await nextOrderNumber(session);

        // Process items + deduct stock
        for (const item of items) {
          if (!item?.product || !Types.ObjectId.isValid(item.product)) {
            throw new Error("INVALID_PRODUCT_ID");
          }
          if (!item?.variant || !Types.ObjectId.isValid(item.variant)) {
            throw new Error("INVALID_VARIANT_ID");
          }

          const qty = Number(item.quantity);
          if (!Number.isFinite(qty) || qty <= 0) {
            throw new Error("INVALID_QUANTITY");
          }

          const product: any = await Product.findById(item.product).session(session);
          if (!product || !product.isActive) {
            throw new Error("PRODUCT_NOT_FOUND");
          }

          const variant: any = product.variants.find(
            (v: any) => String(v._id) === String(item.variant)
          );
          if (!variant || !variant.isActive) {
            throw new Error("VARIANT_NOT_FOUND");
          }

          // derive truth from variant (don’t trust client)
          const unit: BaseUnit = variant.quantity.baseUnit;
          const sellMode: SellMode = variant.sellMode;
          const priceUnit: PriceUnit = variant.priceUnit;
          const unitPrice: number = Number(variant.price?.selling ?? 0);
          const allowedPaymentMethods = ["cash", "card", "online", "other"];
          const allowedPaymentStatuses = ["pending", "paid", "partial", "refunded"];
          const allowedOrderStatuses = ["pending", "confirmed", "ready", "delivered", "cancelled"];

          if (!allowedPaymentMethods.includes(paymentMethod)) {
            return sendError(res, 400, "Invalid payment method");
          }

          if (!allowedPaymentStatuses.includes(paymentStatus)) {
            return sendError(res, 400, "Invalid payment status");
          }

          if (!allowedOrderStatuses.includes(orderStatus)) {
            return sendError(res, 400, "Invalid order status");
          }

          if (!isValidBaseUnit(unit) || !isValidPriceUnit(priceUnit)) {
            throw new Error("INVALID_VARIANT_UNITS");
          }
          if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            throw new Error("INVALID_UNIT_PRICE");
          }

          // if client sent these, validate they match variant snapshot
          if (item.unit && item.unit !== unit) throw new Error("UNIT_MISMATCH");
          if (item.sellMode && item.sellMode !== sellMode) throw new Error("SELLMODE_MISMATCH");
          if (item.priceUnit && item.priceUnit !== priceUnit) throw new Error("PRICEUNIT_MISMATCH");

          // packaged vs loose checks
          if (sellMode === "packaged") {
            if (unit !== "pcs" || priceUnit !== "pcs") throw new Error("PACKAGED_UNIT_MISMATCH");
            assertPackagedQty(qty);
          } else {
            if (
              (unit === "mg" && priceUnit !== "kg") ||
              (unit === "ml" && priceUnit !== "liter") ||
              unit === "pcs"
            ) {
              throw new Error("LOOSE_UNIT_MISMATCH");
            }
          }

          // stock check + deduction (stock stored in base unit)
          if (Number(variant.quantity.inStock) < qty) {
            throw new Error(`INSUFFICIENT_STOCK:${product.name}`);
          }
          variant.quantity.inStock = Number(variant.quantity.inStock) - qty;

          // subtotal
          let subtotal = 0;
          try {
            subtotal = calcSubtotal(qty, unit, priceUnit, unitPrice);
          } catch {
            throw new Error("UNIT_PRICE_UNIT_MISMATCH");
          }

          totalAmount += subtotal;

          processedItems.push({
            product: product._id,
            variant: variant._id,
            quantity: qty,
            unit,
            sellMode,
            priceUnit,
            unitPrice,
            subtotal,
          });

          await product.save({ session });
        }

        if (disc > totalAmount) throw new Error("DISCOUNT_EXCEEDS_TOTAL");
        const finalAmount = totalAmount - disc;

        const createdArr = await Order.create(
          [
            {
              orderNumber,
              customer,
              items: processedItems,
              totalAmount,
              discount: disc,
              finalAmount,
              paymentMethod,
              paymentStatus,
              orderStatus,
            }
          ],
          { session }
        );

        (req as any).__createdOrder = createdArr[0];
      });

      return sendSuccess(res, 201, "Order created successfully", (req as any).__createdOrder);
    } catch (error: any) {
      const msg = String(error?.message || "");

      // common mapped errors
      if (msg === "INVALID_PRODUCT_ID") return sendError(res, 400, "Invalid product id");
      if (msg === "INVALID_VARIANT_ID") return sendError(res, 400, "Invalid variant id");
      if (msg === "INVALID_QUANTITY") return sendError(res, 400, "Quantity must be > 0");
      if (msg === "PACKAGED_QTY_MUST_BE_INTEGER")
        return sendError(res, 400, "Packaged quantity must be an integer (pcs)");
      if (msg === "PRODUCT_NOT_FOUND") return sendError(res, 404, "Product not found");
      if (msg === "VARIANT_NOT_FOUND") return sendError(res, 404, "Variant not found");
      if (msg === "UNIT_MISMATCH") return sendError(res, 400, "Unit mismatch for variant");
      if (msg === "SELLMODE_MISMATCH") return sendError(res, 400, "Sell mode mismatch for variant");
      if (msg === "PRICEUNIT_MISMATCH") return sendError(res, 400, "Price unit mismatch for variant");
      if (msg === "PACKAGED_UNIT_MISMATCH")
        return sendError(res, 400, "Packaged variant must be pcs priceUnit=pcs");
      if (msg === "LOOSE_UNIT_MISMATCH")
        return sendError(res, 400, "Loose variant unit/priceUnit mismatch");
      if (msg === "UNIT_PRICE_UNIT_MISMATCH")
        return sendError(res, 400, "Unit and priceUnit are not compatible");
      if (msg.startsWith("INSUFFICIENT_STOCK:")) {
        return sendError(res, 400, `Insufficient stock for ${msg.split(":")[1] || "product"}`);
      }
      if (msg === "DISCOUNT_EXCEEDS_TOTAL")
        return sendError(res, 400, "Discount cannot exceed total amount");

      // duplicate orderNumber (should be extremely rare with atomic counter)
      if (error?.code === 11000 && error?.keyPattern?.orderNumber) {
        return sendError(res, 409, "Order number collision, please retry");
      }

      return sendError(res, 500, "Failed to create order", msg);
    } finally {
      session.endSession();
    }
  },

  // ─────────────────────────────
  // UPDATE ORDER STATUS (+ restore stock on cancel/refund)
  // ─────────────────────────────
  async updateStatus(req: Request, res: Response) {
    const session = await mongoose.startSession();

    try {
      const id = req.params.id as string;
      const { orderStatus, paymentStatus } = req.body as {
        orderStatus?: string;
        paymentStatus?: string;
      };

      if (!Types.ObjectId.isValid(id)) {
        return sendError(res, 400, "Invalid order id");
      }

      await session.withTransaction(async () => {
        const order: any = await Order.findById(id).session(session);
        if (!order) throw new Error("ORDER_NOT_FOUND");

        const willCancel = orderStatus === "cancelled" && order.orderStatus !== "cancelled";
        const willRefund = paymentStatus === "refunded" && order.paymentStatus !== "refunded";

        if (willCancel || willRefund) {
          for (const item of order.items) {
            const product: any = await Product.findById(item.product).session(session);
            if (!product) continue;

            const variant: any = product.variants.find(
              (v: any) => String(v._id) === String(item.variant)
            );
            if (!variant) continue;

            variant.quantity.inStock = Number(variant.quantity.inStock) + Number(item.quantity);
            await product.save({ session });
          }
        }

        if (orderStatus) order.orderStatus = orderStatus;
        if (paymentStatus) order.paymentStatus = paymentStatus;

        await order.save({ session });
        (req as any).__updatedOrder = order;
      });

      return sendSuccess(res, 200, "Order updated successfully", (req as any).__updatedOrder);
    } catch (error: any) {
      if (String(error?.message) === "ORDER_NOT_FOUND") {
        return sendError(res, 404, "Order not found");
      }
      return sendError(res, 500, "Failed to update order", error.message);
    } finally {
      session.endSession();
    }
  },

  // ─────────────────────────────
  // GET ALL ORDERS
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
        date,
        phone,
      } = req.query as any;

      const pageNumber = typeof page === "string" ? Math.max(1, parseInt(page, 10)) : 1;
      const pageSize = typeof limit === "string" ? Math.max(1, parseInt(limit, 10)) : 10;
      const skip = (pageNumber - 1) * pageSize;

      const filter: any = {};

      // 🔍 Search
      if (typeof search === "string" && search.trim()) {
        filter.$or = [
          { orderNumber: { $regex: search.trim(), $options: "i" } },
          { "customer.name": { $regex: search.trim(), $options: "i" } },
        ];
      }

      if (typeof orderStatus === "string" && orderStatus) {
        filter.orderStatus = orderStatus;
      }

      if (typeof paymentStatus === "string" && paymentStatus) {
        filter.paymentStatus = paymentStatus;
      }

      if (typeof phone === "string" && phone) {
        filter["customer.phone"] = phone;
      }

      if (typeof date === "string" && date) {
        const start = new Date(`${date}T00:00:00.000Z`);
        const end = new Date(`${date}T23:59:59.999Z`);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return sendError(res, 400, "Invalid date format. Use YYYY-MM-DD");
        }

        filter.createdAt = { $gte: start, $lte: end };
      } else if (typeof from === "string" || typeof to === "string") {
        filter.createdAt = {};

        if (typeof from === "string" && from) {
          const d = new Date(from);
          if (isNaN(d.getTime())) {
            return sendError(res, 400, "Invalid from date");
          }
          filter.createdAt.$gte = d;
        }

        if (typeof to === "string" && to) {
          const d = new Date(to);
          if (isNaN(d.getTime())) {
            return sendError(res, 400, "Invalid to date");
          }
          filter.createdAt.$lte = d;
        }
      }

      const [
        orders,
        total,
        totalOrders,
        pendingOrders,
        deliveredOrders,
        paidOrders,
        topProductsAgg,
      ] = await Promise.all([
        Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
        Order.countDocuments(filter),

        // ✅ Global stats — NO FILTER
        Order.countDocuments({}),
        Order.countDocuments({ orderStatus: "pending" }),
        Order.countDocuments({ orderStatus: "delivered" }),
        Order.countDocuments({ paymentStatus: "paid" }),

        // ✅ Global top 5 performing products — NO FILTER
        Order.aggregate([
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.product",
              totalSoldQty: { $sum: "$items.quantity" },
            },
          },
          { $sort: { totalSoldQty: -1, totalRevenue: -1 } },
          { $limit: 5 },
        ]),
      ]);

      const topProductIds = topProductsAgg.map((item: any) => item._id);

      const productDocs = await Product.find({ _id: { $in: topProductIds } })
        .select("_id name")
        .lean();

      const productNameMap = new Map(
        productDocs.map((p: any) => [String(p._id), p.name])
      );

      const topPerformingProducts = topProductsAgg.map((item: any) => ({
        productId: item._id,
        name: productNameMap.get(String(item._id)) || "Unknown Product",
        totalSoldQty: item.totalSoldQty,
      }));

      const paidPercentage =
        totalOrders > 0 ? Number(((paidOrders / totalOrders) * 100).toFixed(2)) : 0;

      return sendSuccess(res, 200, "Orders fetched successfully", {
        orders,
        pagination: {
          total,
          page: pageNumber,
          limit: pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
        statistics: {
          totalOrders,
          pendingOrders,
          deliveredOrders,
          paidPercentage,
          topPerformingProducts,
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
        .populate({
          path: "items.product",
          select: "name type category isActive",
          populate: { path: "category", select: "name" },
        })
        .lean();

      if (!order) {
        return sendError(res, 404, "Order not found");
      }

      return sendSuccess(res, 200, "Order fetched successfully", order);
    } catch (error: any) {
      return sendError(res, 500, "Failed to fetch order", error.message);
    }
  },
};