import { Request, Response } from "express";
import { Order } from "../models/order.model";
import { Product } from "../models/product.model";
import { Category } from "../models/category.model";
import { sendSuccess, sendError } from "../utils/api.response";

/* ─────────────────────────────
   HELPERS
───────────────────────────── */

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

const prevMonthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth() - 1, 1);
const prevMonthEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 0, 23, 59, 59, 999);

function pctChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return parseFloat((((curr - prev) / prev) * 100).toFixed(1));
}

/* ─────────────────────────────
   CONTROLLER
───────────────────────────── */

export const dashboardController = {

  /* ══════════════════════════════════
     GET /api/dashboard/stats
     Row 1 cards:
       - todayRevenue
       - thisMonthRevenue (vs last month %)
       - ordersToday
       - lowStockCount
       - totalRevenue (all time)
       - totalProfit  (all time, selling - buying)
  ══════════════════════════════════ */
  getStats: async (_req: Request, res: Response) => {
    const now = new Date();

    const [
      todayOrders,
      thisMonthOrders,
      lastMonthOrders,
      allTimeOrders,
      allProducts,
      categoryCount,
    ] = await Promise.all([
      // TODAY
      Order.find({ createdAt: { $gte: startOfDay(now), $lte: endOfDay(now) } }).lean(),
      // THIS MONTH
      Order.find({ createdAt: { $gte: startOfMonth(now), $lte: endOfMonth(now) } }).lean(),
      // LAST MONTH
      Order.find({ createdAt: { $gte: prevMonthStart(now), $lte: prevMonthEnd(now) } }).lean(),
      // ALL TIME
      Order.find({}).lean(),
      // PRODUCTS (with variants for profit calc)
      Product.find({ isActive: true }).lean(),
      // CATEGORIES
      Category.countDocuments({ isActive: true }),
    ]);

    /* ── Revenue & Profit ── */
    const sum = (orders: typeof allTimeOrders) =>
      orders.reduce((s, o) => s + (o.finalAmount ?? 0), 0);

    const todayRevenue = sum(todayOrders);
    const thisMonthRevenue = sum(thisMonthOrders);
    const lastMonthRevenue = sum(lastMonthOrders);
    const totalRevenue = sum(allTimeOrders);
    const monthVsLast = pctChange(thisMonthRevenue, lastMonthRevenue);

    /* ── Profit (sum of (selling - buying) * qty per order item) ── */
    // Since order items only store unitPrice (selling), we compute
    // profit per item as: unitPrice - variant.buying price
    // Build a quick lookup: variantId → buying price
    const buyingMap = new Map<string, number>();
    for (const product of allProducts) {
      for (const variant of product.variants as any[]) {
        buyingMap.set(String(variant._id), variant.price?.buying ?? 0);
      }
    }

    let totalProfit = 0;
    for (const order of allTimeOrders) {
      for (const item of order.items as any[]) {
        const buying = buyingMap.get(String(item.variant)) ?? 0;
        const selling = item.unitPrice ?? 0;
        const qty = item.quantity ?? 0;
        // For packaged (pcs): profit = (selling - buying) * qty
        // For loose (kg/liter): already per-unit, same logic applies
        totalProfit += (selling - buying) * qty;
      }
    }
    totalProfit = parseFloat(totalProfit.toFixed(2));

    /* ── Orders today ── */
    const ordersToday = todayOrders.length;
    const ordersTodayByStatus = {
      pending: todayOrders.filter(o => o.orderStatus === "pending").length,
      confirmed: todayOrders.filter(o => o.orderStatus === "confirmed").length,
      ready: todayOrders.filter(o => o.orderStatus === "ready").length,
      delivered: todayOrders.filter(o => o.orderStatus === "delivered").length,
      cancelled: todayOrders.filter(o => o.orderStatus === "cancelled").length,
    };

    /* ── Low stock (inStock < 5 and product isActive) ── */
    let lowStockCount = 0;
    for (const product of allProducts) {
      for (const variant of product.variants as any[]) {
        if (variant.isActive && variant.quantity?.inStock < 5) lowStockCount++;
      }
    }

    /* ── Active products / total ── */
    const activeProducts = allProducts.length;
    const totalProducts = await Product.countDocuments({});

    return sendSuccess(res, 200, "Dashboard stats fetched", {
      todayRevenue,
      thisMonthRevenue,
      lastMonthRevenue,
      monthVsLast,
      totalRevenue,
      totalProfit,
      ordersToday,
      ordersTodayByStatus,
      lowStockCount,
      activeProducts,
      totalProducts,
      categoryCount,
    });
  },

  /* ══════════════════════════════════
     GET /api/dashboard/revenue-chart?from=YYYY-MM-DD&to=YYYY-MM-DD
     Row 2 left: daily revenue + profit for the selected range
     Default: last 30 days
  ══════════════════════════════════ */
  getRevenueChart: async (req: Request, res: Response) => {
    const now = new Date();

    // Parse date range
    let from: Date, to: Date;
    if (req.query.from && req.query.to) {
      from = new Date(req.query.from as string);
      to = endOfDay(new Date(req.query.to as string));
    } else {
      // Default: last 30 days
      from = new Date(now);
      from.setDate(from.getDate() - 29);
      from = startOfDay(from);
      to = endOfDay(now);
    }

    const orders = await Order.find({
      createdAt: { $gte: from, $lte: to },
    }).lean();

    // Build a map: dateStr → { revenue, orders }
    const dayMap = new Map<string, { revenue: number; profit: number; orders: number }>();

    // Pre-fill all days in range
    const cursor = new Date(from);
    while (cursor <= to) {
      const key = cursor.toISOString().split("T")[0];
      dayMap.set(key, { revenue: 0, profit: 0, orders: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    // Aggregate orders into days
    for (const order of orders) {
      const key = (order.createdAt as Date).toISOString().split("T")[0];
      if (!dayMap.has(key)) continue;
      const entry = dayMap.get(key)!;
      entry.revenue += order.finalAmount ?? 0;
      entry.orders += 1;
      // profit approximation: finalAmount - totalCost (totalAmount - discount is already finalAmount)
      // Use a margin estimate since buying price would require joining products.
      // We'll expose a `profit` field that's 0 here; the client can overlay if needed.
      // For a real profit line you'd need the buying price per item (use getStats for totals).
    }

    const chartData = Array.from(dayMap.entries()).map(([date, v]) => ({
      date,
      revenue: parseFloat(v.revenue.toFixed(2)),
      orders: v.orders,
    }));

    return sendSuccess(res, 200, "Revenue chart data fetched", {
      from: from.toISOString().split("T")[0],
      to: to.toISOString().split("T")[0],
      chartData,
    });
  },

  /* ══════════════════════════════════
     GET /api/dashboard/order-status
     Row 2 right: donut chart — count per orderStatus
  ══════════════════════════════════ */
  getOrderStatus: async (_req: Request, res: Response) => {
    const result = await Order.aggregate([
      { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
    ]);

    const statuses: Record<string, number> = {
      pending: 0, confirmed: 0, ready: 0, delivered: 0, cancelled: 0,
    };
    for (const r of result) {
      if (r._id in statuses) statuses[r._id] = r.count;
    }

    return sendSuccess(res, 200, "Order status distribution fetched", statuses);
  },

  /* ══════════════════════════════════
     GET /api/dashboard/recent-orders?limit=8
     Row 3 left: last N orders
  ══════════════════════════════════ */
  getRecentOrders: async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 8, 20);

    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const formatted = orders.map(o => ({
      _id: o._id,
      orderNumber: o.orderNumber,
      customer: o.customer,
      itemCount: o.items.length,
      totalAmount: o.totalAmount,
      discount: o.discount ?? 0,
      finalAmount: o.finalAmount,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      orderStatus: o.orderStatus,
      createdAt: o.createdAt,
    }));

    return sendSuccess(res, 200, "Recent orders fetched", formatted);
  },

  /* ══════════════════════════════════
     GET /api/dashboard/top-products?limit=5
     Row 3 right: top products by revenue
  ══════════════════════════════════ */
  getTopProducts: async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 10);

    const result = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          revenue: { $sum: "$items.subtotal" },
          unitsSold: { $sum: "$items.quantity" },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          revenue: 1,
          unitsSold: 1,
          orderCount: 1,
          name: "$product.name",
          type: "$product.type",
          isActive: "$product.isActive",
        },
      },
    ]);

    return sendSuccess(res, 200, "Top products fetched", result);
  },

  /* ══════════════════════════════════
     GET /api/dashboard/low-stock?threshold=5&limit=10
     Row 4 left: variants with low stock
  ══════════════════════════════════ */
  getLowStock: async (req: Request, res: Response) => {
    const threshold = parseInt(req.query.threshold as string) || 5;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const products = await Product.find({ isActive: true })
      .populate("category", "name")
      .lean();

    type LowStockItem = {
      productId: string;
      productName: string;
      category: string;
      variantId: string;
      sku: string;
      attributes: Record<string, string>;
      inStock: number;
      baseUnit: string;
      sellMode: string;
      sellingPrice: number;
      priceUnit: string;
    };

    const items: LowStockItem[] = [];

    for (const product of products) {
      for (const variant of product.variants as any[]) {
        if (variant.isActive && variant.quantity?.inStock < threshold) {
          items.push({
            productId: String(product._id),
            productName: product.name,
            category: (product.category as any)?.name ?? "—",
            variantId: String(variant._id),
            sku: variant.sku,
            attributes: Object.fromEntries(
              variant.attributes instanceof Map
                ? variant.attributes
                : Object.entries(variant.attributes ?? {})
            ),
            inStock: variant.quantity.inStock,
            baseUnit: variant.quantity.baseUnit,
            sellMode: variant.sellMode,
            sellingPrice: variant.price?.selling ?? 0,
            priceUnit: variant.priceUnit,
          });
        }
      }
    }

    // Sort by inStock ascending (most critical first)
    items.sort((a, b) => a.inStock - b.inStock);

    return sendSuccess(res, 200, "Low stock items fetched", {
      threshold,
      total: items.length,
      items: items.slice(0, limit),
    });
  },

  /* ══════════════════════════════════
     GET /api/dashboard/payment-summary
     Row 4 right: payment status breakdown (amounts + counts)
  ══════════════════════════════════ */
  getPaymentSummary: async (_req: Request, res: Response) => {
    const result = await Order.aggregate([
      {
        $group: {
          _id: "$paymentStatus",
          total: { $sum: "$finalAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const summary: Record<string, { total: number; count: number }> = {
      pending: { total: 0, count: 0 },
      paid: { total: 0, count: 0 },
      partial: { total: 0, count: 0 },
      refunded: { total: 0, count: 0 },
    };

    for (const r of result) {
      if (r._id in summary) {
        summary[r._id] = {
          total: parseFloat(r.total.toFixed(2)),
          count: r.count,
        };
      }
    }

    // Payment method breakdown
    const methodResult = await Order.aggregate([
      {
        $group: {
          _id: "$paymentMethod",
          total: { $sum: "$finalAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const byMethod: Record<string, { total: number; count: number }> = {
      cash: { total: 0, count: 0 },
      card: { total: 0, count: 0 },
      online: { total: 0, count: 0 },
      other: { total: 0, count: 0 },
    };
    for (const r of methodResult) {
      if (r._id in byMethod) {
        byMethod[r._id] = {
          total: parseFloat(r.total.toFixed(2)),
          count: r.count,
        };
      }
    }

    return sendSuccess(res, 200, "Payment summary fetched", {
      byStatus: summary,
      byMethod,
    });
  },
};