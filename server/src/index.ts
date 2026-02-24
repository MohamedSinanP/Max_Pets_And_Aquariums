import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import connectDB from "./config/db";
import { seedOwner } from "./config/seed.owner";


const PORT = process.env.PORT || 5001;

const startServer = async (): Promise<void> => {
  try {
    // Connect DB
    await connectDB();

    // Seed Owner
    await seedOwner();

    // Start Server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();