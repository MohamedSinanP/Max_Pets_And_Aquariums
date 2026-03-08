import "express";

declare global {
  namespace Express {
    interface UserPayload {
      id: string;
      role: "owner" | "admin" | "staff";
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

export { };