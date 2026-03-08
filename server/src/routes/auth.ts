import { Router } from "express";
import { authController } from "../controllers/auth";
import { asyncHandler } from "../middlewares/asyncHandler";
import { authGuard } from "../middlewares/auth.guard";
import { upload } from "../middlewares/upload";

const router = Router();

router.post("/register", asyncHandler(authController.register));
router.post("/login", asyncHandler(authController.login));
router.post("/refresh", asyncHandler(authController.refreshToken));

router.use(authGuard.authenticate);
router.get("/me", asyncHandler(authController.me));
router.post("/forgot-password", asyncHandler(authController.forgotPassword));
router.post("/reset-password", asyncHandler(authController.resetPassword));
router.put("/update-password", asyncHandler(authController.updatePassword));
router.put("/update-profile", upload.single("avatar"), asyncHandler(authController.updateProfile));
router.post("/logout", asyncHandler(authController.logout));

export default router;