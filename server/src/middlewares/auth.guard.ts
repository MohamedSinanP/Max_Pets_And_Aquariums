import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { STATUS_CODES } from "../constants/common";

export const authGuard = {
  authenticate: (
    req: Request,
    _res: Response,
    next: NextFunction
  ) => {
    let token: string | undefined;

    // 1️⃣ Try header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // 2️⃣ If not in header, try cookie
    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      const error: any = new Error("Access token missing");
      error.statusCode = STATUS_CODES.UNAUTHORIZED;
      return next(error);
    }

    try {
      const decoded: any = verifyAccessToken(token);

      req.user = {
        id: decoded.id,
        role: decoded.role,
      };

      next();
    } catch {
      const error: any = new Error("Invalid or expired token");
      error.statusCode = STATUS_CODES.UNAUTHORIZED;
      next(error);
    }
  },

  ownerOnly: (
    req: Request,
    _res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      const error: any = new Error("Unauthorized");
      error.statusCode = STATUS_CODES.UNAUTHORIZED;
      return next(error);
    }

    if (req.user.role !== "owner") {
      const error: any = new Error("Access denied. Owner only.");
      error.statusCode = STATUS_CODES.FORBIDDEN;
      return next(error);
    }

    next();
  },
};