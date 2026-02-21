import { Router } from "express";
import { categoryController } from "../controllers/category";
import { authGuard } from "../middlewares/auth.guard";

const router = Router();

// authGuard.authenticate

// Public
router.get("/", categoryController.getAll);

// Owner only
router.post(
  "/",
  // authGuard.ownerOnly,
  categoryController.create
);

router.put(
  "/:id",
  // authGuard.ownerOnly,
  categoryController.update
);

router.patch(
  "/:id/toggle",
  // authGuard.ownerOnly,
  categoryController.toggleActive
);

export default router;