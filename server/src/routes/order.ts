import { Router } from "express";
import { orderController } from "../controllers/order";
import { asyncHandler } from "../middlewares/asyncHandler";
import { authGuard } from "../middlewares/auth.guard";

const router = Router();

router.use(authGuard.authenticate);
router.use(authGuard.ownerOnly);
// Create order
router.post("/", asyncHandler(orderController.create));

// Update order status
router.patch("/:id/status", asyncHandler(orderController.updateStatus));

// Get all orders (pagination + filters + search)
router.get("/", asyncHandler(orderController.getAll));

// Get single order
router.get("/:id", asyncHandler(orderController.getById));

export default router;