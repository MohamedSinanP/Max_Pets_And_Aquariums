import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { STATUS_CODES } from "../constants/common";

export const authGuard = {
  authenticate: (req: Request, _res: Response, next: NextFunction) => {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      const error: any = new Error("Access token missing");
      error.statusCode = STATUS_CODES.UNAUTHORIZED;
      error.code = "ACCESS_TOKEN_MISSING";
      return next(error);
    }

    try {
      const decoded = verifyAccessToken(token) as {
        id: string;
        role: "owner" | "admin" | "staff";
      };

      req.user = {
        id: decoded.id,
        role: decoded.role,
      };

      return next();
    } catch {
      const error: any = new Error("Invalid or expired token");
      error.statusCode = STATUS_CODES.UNAUTHORIZED;
      error.code = "ACCESS_TOKEN_INVALID";
      return next(error);
    }
  },

  ownerOnly: (req: Request, _res: Response, next: NextFunction) => {
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

    return next();
  },
};