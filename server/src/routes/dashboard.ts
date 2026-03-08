import { Router } from "express";
import { dashboardController } from "../controllers/dashboard";
import { asyncHandler } from "../middlewares/asyncHandler"; //
import { authGuard } from "../middlewares/auth.guard";

const router = Router();

// All dashboard routes require authentication
router.use(authGuard.authenticate);

/**
 * GET /api/dashboard/stats
 * Row 1 cards: todayRevenue, thisMonthRevenue, monthVsLast%,
 *              totalRevenue, totalProfit, ordersToday,
 *              lowStockCount, activeProducts, categoryCount
 */
router.get("/stats", asyncHandler(dashboardController.getStats));

/**
 * GET /api/dashboard/revenue-chart?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Row 2 left: daily { date, revenue, orders } array
 * Default range: last 30 days
 */
router.get("/revenue-chart", asyncHandler(dashboardController.getRevenueChart));

/**
 * GET /api/dashboard/order-status
 * Row 2 right: { pending, confirmed, ready, delivered, cancelled } counts
 */
router.get("/order-status", asyncHandler(dashboardController.getOrderStatus));

/**
 * GET /api/dashboard/recent-orders?limit=8
 * Row 3 left: last N orders with customer + status info
 */
router.get("/recent-orders", asyncHandler(dashboardController.getRecentOrders));

/**
 * GET /api/dashboard/top-products?limit=5
 * Row 3 right: top products by revenue with unitsSold
 */
router.get("/top-products", asyncHandler(dashboardController.getTopProducts));

/**
 * GET /api/dashboard/low-stock?threshold=5&limit=10
 * Row 4 left: variant-level low stock list, sorted by inStock asc
 */
router.get("/low-stock", asyncHandler(dashboardController.getLowStock));

/**
 * GET /api/dashboard/payment-summary
 * Row 4 right: payment status amounts + counts, and payment method breakdown
 */
router.get("/payment-summary", asyncHandler(dashboardController.getPaymentSummary));

export default router;