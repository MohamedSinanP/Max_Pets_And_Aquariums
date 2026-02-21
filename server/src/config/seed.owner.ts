import bcrypt from "bcrypt";
import { User } from "../models/user.model";

export const seedOwner = async (): Promise<void> => {
  try {
    const { OWNER_NAME, OWNER_EMAIL, OWNER_PASSWORD } = process.env;

    if (!OWNER_NAME || !OWNER_EMAIL || !OWNER_PASSWORD) {
      console.warn(
        "⚠️ Owner seed skipped: OWNER_NAME, OWNER_EMAIL, and OWNER_PASSWORD must all be set in .env"
      );
      return;
    }

    // Check if owner already exists
    const existingOwner = await User.findOne({ role: "owner" });

    if (existingOwner) {
      console.log(`✅ Owner account already exists: ${existingOwner.email}`);
      return;
    }

    // 🔐 Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(OWNER_PASSWORD, saltRounds);

    // Create owner
    const owner = await User.create({
      name: OWNER_NAME,
      email: OWNER_EMAIL.toLowerCase(),
      password: hashedPassword,
      role: "owner",
      isActive: true,
    });

    console.log(`✅ Owner account created successfully: ${owner.email}`);
  } catch (error: any) {
    console.error(`❌ Failed to seed owner account: ${error.message}`);
  }
};