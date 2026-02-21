import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { globalErrorHandler } from "./middlewares/error.middleware";
import authRoutes from "./routes/auth";
import categoryRoutes from "./routes/category";

const app = express();

// ─────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(morgan("dev"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);

app.use(globalErrorHandler);

// Health check


export default app;