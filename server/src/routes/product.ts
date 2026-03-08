import { Router } from "express";
import { productController } from "../controllers/product";
import { upload } from "../middlewares/upload";
import { asyncHandler } from "../middlewares/asyncHandler";
import { authGuard } from "../middlewares/auth.guard";

const router = Router();

router.use(authGuard.authenticate);
router.use(authGuard.ownerOnly);

router.post("/", upload.any(), asyncHandler(productController.create));

router.put("/:id", upload.any(), asyncHandler(productController.update));

router.get("/", asyncHandler(productController.getAll));
router.get("/:id", asyncHandler(productController.getOne));
router.delete("/:id", asyncHandler(productController.delete));

export default router;