import { Router } from "express";
import { authController } from "../controllers/auth";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();

router.post("/register", asyncHandler(authController.register));
router.post("/login", asyncHandler(authController.login));
router.post("/refresh", asyncHandler(authController.refreshToken));
router.put("/update-password", asyncHandler(authController.updatePassword));
router.put("/update-profile", asyncHandler(authController.updateProfile));
router.post("/logout", asyncHandler(authController.logout));

export default router;