import { Request, Response, NextFunction } from "express";
import { STATUS_CODES } from "../constants/common";

export const globalErrorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error("❌ Error:", err);

  const statusCode = err.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    code: err.code || "INTERNAL_SERVER_ERROR",
  });
};