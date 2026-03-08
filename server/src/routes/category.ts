import { Router } from "express";
import { categoryController } from "../controllers/category";
import { authGuard } from "../middlewares/auth.guard";

const router = Router();

router.use(authGuard.authenticate);
router.use(authGuard.ownerOnly);

// Public
router.get("/", categoryController.getAll);

// Owner only
router.post(
  "/",
  categoryController.create
);

router.put(
  "/:id",
  categoryController.update
);

router.patch(
  "/:id/toggle",
  categoryController.toggleActive
);

export default router;