import { Router } from "express";
import { productController } from "../controllers/product";
import { upload } from "../middlewares/upload";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();

router.post(
  "/",
  upload.array("images", 15),
  asyncHandler(productController.create)
);

router.put(
  "/:id",
  upload.array("images", 15),
  asyncHandler(productController.update)
);

router.get("/", asyncHandler(productController.getAll));

router.get("/:id", asyncHandler(productController.getOne));

router.delete("/:id", asyncHandler(productController.delete));

export default router;