import { Router } from "express";
import { productController } from "../controllers/product";
import { upload } from "../middlewares/upload";

const router = Router();

router.post(
  "/",
  upload.array("images", 15),
  productController.create
);

router.put(
  "/:id",
  upload.array("images", 15),
  productController.update
);

router.get("/", productController.getAll);

router.get("/:id", productController.getOne);

router.delete("/:id", productController.delete);

export default router;