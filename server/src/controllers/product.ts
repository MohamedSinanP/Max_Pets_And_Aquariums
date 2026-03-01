import { Request, Response } from "express";
import { Product } from "../models/product.model";
import { Types } from "mongoose";
import { cloudinaryUtil } from "../utils/cloudinary.utils";
import { IVariant } from "../types/types";

/* ═══════════════════════════════════════════
   TYPES
═══════════════════════════════════════════ */

interface ParsedVariant {
  _id?: string;
  sellMode: "packaged" | "loose";
  price?: { buying: number; selling: number };
  pricePerBaseUnit?: number;
  quantity: { inStock: number; baseUnit: "g" | "ml" | "pcs" };
  attributes?: { key: string; value: string }[];
  images?: { url: string; public_id: string }[];
  isActive?: boolean;
}

type ValidationResult =
  | { valid: true }
  | { valid: false; message: string };

/* ═══════════════════════════════════════════
   SHARED HELPERS
═══════════════════════════════════════════ */

function validateVariant(variant: ParsedVariant, index: number): ValidationResult {
  const { sellMode, price, pricePerBaseUnit, quantity } = variant;

  if (quantity.inStock < 0) {
    return {
      valid: false,
      message: `Variant ${index + 1}: inStock must be >= 0`,
    };
  }

  if (sellMode === "packaged") {
    if (!price || price.selling == null || price.selling < 0) {
      return {
        valid: false,
        message: `Variant ${index + 1}: packaged variants require a valid selling price`,
      };
    }
    if (price.buying == null || price.buying < 0) {
      return {
        valid: false,
        message: `Variant ${index + 1}: packaged variants require a valid buying price`,
      };
    }
    if (quantity.baseUnit !== "pcs") {
      return {
        valid: false,
        message: `Variant ${index + 1}: packaged variants must use "pcs" as baseUnit`,
      };
    }
  }

  if (sellMode === "loose") {
    if (pricePerBaseUnit == null || pricePerBaseUnit < 0) {
      return {
        valid: false,
        message: `Variant ${index + 1}: loose variants require pricePerBaseUnit >= 0`,
      };
    }
    if (!["g", "ml"].includes(quantity.baseUnit)) {
      return {
        valid: false,
        message: `Variant ${index + 1}: loose variants must use "g" or "ml" as baseUnit, not "pcs"`,
      };
    }
  }

  return { valid: true };
}

function sanitizeVariant(variant: ParsedVariant): ParsedVariant {
  const sanitized = { ...variant };

  if (sanitized.sellMode === "packaged") {
    delete sanitized.pricePerBaseUnit;
    sanitized.quantity = { ...sanitized.quantity, baseUnit: "pcs" };
  }

  if (sanitized.sellMode === "loose") {
    delete sanitized.price;
  }

  return sanitized;
}

function validateAndSanitizeVariants(
  variants: ParsedVariant[]
): { valid: false; message: string } | { valid: true; variants: ParsedVariant[] } {
  if (!variants || variants.length === 0) {
    return { valid: false, message: "Product must have at least one variant" };
  }

  const sanitized: ParsedVariant[] = [];

  for (let i = 0; i < variants.length; i++) {
    const result = validateVariant(variants[i], i);
    if (!result.valid) return result;
    sanitized.push(sanitizeVariant(variants[i]));
  }

  return { valid: true, variants: sanitized };
}

async function handleVariantImages(
  variantIndex: number,
  files: Express.Multer.File[],
  oldImages?: { url: string; public_id: string }[]
): Promise<{ url: string; public_id: string }[] | null> {
  const variantFiles = files.filter(
    (file) => file.fieldname === `variants[${variantIndex}][images]`
  );

  if (variantFiles.length === 0) return null; // no new uploads

  // Delete old Cloudinary images before uploading new ones
  if (oldImages && oldImages.length > 0) {
    for (const img of oldImages) {
      await cloudinaryUtil.deleteImage(img.public_id);
    }
  }

  return cloudinaryUtil.uploadMultiple(variantFiles, "max_pets/images");
}

/* ═══════════════════════════════════════════
   CONTROLLER
═══════════════════════════════════════════ */

export const productController = {
  // ─────────────────────────────
  // CREATE PRODUCT
  // ─────────────────────────────
  async create(req: Request, res: Response) {
    try {
      const {
        name,
        category,
        type,
        description,
        supplier,
        attributes,
        variantOptions,
        variants,
      } = req.body;

      if (!variants) {
        return res.status(400).json({
          success: false,
          message: "Product must contain variants",
        });
      }

      const parsedVariants: ParsedVariant[] = JSON.parse(variants);
      const parsedAttributes = attributes ? JSON.parse(attributes) : [];
      const parsedVariantOptions = variantOptions ? JSON.parse(variantOptions) : [];

      // ── Validate + sanitize ───────────────────────────────────────────
      const validation = validateAndSanitizeVariants(parsedVariants);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.message });
      }

      const sanitizedVariants = validation.variants;

      // ── Image uploads ─────────────────────────────────────────────────
      if (req.files && Array.isArray(req.files)) {
        for (let i = 0; i < sanitizedVariants.length; i++) {
          const uploaded = await handleVariantImages(
            i,
            req.files as Express.Multer.File[]
          );
          if (uploaded) sanitizedVariants[i].images = uploaded;
        }
      }

      const product = await Product.create({
        name,
        category,
        type,
        description,
        supplier,
        attributes: parsedAttributes,
        variantOptions: parsedVariantOptions,
        variants: sanitizedVariants,
      });

      return res.status(201).json({ success: true, data: product });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  },

  // ─────────────────────────────
  // UPDATE PRODUCT
  // ─────────────────────────────
  async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;

      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid product id" });
      }

      const existingProduct = await Product.findById(id);

      if (!existingProduct) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      const {
        variants: rawVariants,
        attributes,
        variantOptions,
        ...scalarFields
      } = req.body;

      const incomingVariants: ParsedVariant[] = rawVariants
        ? JSON.parse(rawVariants)
        : null;

      // ── Validate + sanitize ───────────────────────────────────────────
      const validation = validateAndSanitizeVariants(incomingVariants);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.message });
      }

      const sanitizedVariants = validation.variants;

      // ── Diff: find removed variants and delete their images ───────────
      const incomingIds = new Set(
        sanitizedVariants
          .filter((v) => v._id && Types.ObjectId.isValid(v._id))
          .map((v) => v._id as string)
      );

      const removedVariants = existingProduct.variants.filter(
        (v: IVariant) => !incomingIds.has(v._id.toString())
      );

      for (const removed of removedVariants) {
        for (const img of removed.images ?? []) {
          await cloudinaryUtil.deleteImage(img.public_id);
        }
      }

      // ── Build final variants array ────────────────────────────────────
      const uploadedFiles = Array.isArray(req.files)
        ? (req.files as Express.Multer.File[])
        : [];

      const finalVariants: ParsedVariant[] = [];

      for (let i = 0; i < sanitizedVariants.length; i++) {
        const incoming = sanitizedVariants[i];

        // Match to existing variant by _id
        const existingVariant =
          incoming._id && Types.ObjectId.isValid(incoming._id)
            ? existingProduct.variants.find(
              (v: IVariant) => v._id.toString() === incoming._id
            )
            : null;

        // Handle images: upload new or preserve old
        const uploaded = await handleVariantImages(
          i,
          uploadedFiles,
          existingVariant?.images
        );

        if (uploaded) {
          incoming.images = uploaded;
        } else if (existingVariant) {
          incoming.images = existingVariant.images; // preserve existing
        }

        finalVariants.push(incoming);
      }

      // ── Build update payload ──────────────────────────────────────────
      const updatePayload: Record<string, unknown> = {
        ...scalarFields,
        variants: finalVariants,
      };

      if (attributes) updatePayload.attributes = JSON.parse(attributes);
      if (variantOptions) updatePayload.variantOptions = JSON.parse(variantOptions);

      const updatedProduct = await Product.findByIdAndUpdate(
        id,
        updatePayload,
        { new: true, runValidators: true }
      )
        .populate("category")
        .populate("supplier");

      return res.json({ success: true, data: updatedProduct });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  },

  // ─────────────────────────────
  // GET ONE PRODUCT
  // ─────────────────────────────
  async getOne(req: Request, res: Response) {
    try {
      const id = req.params.id as string;

      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid product id" });
      }

      const product = await Product.findById(id)
        .populate("category")
        .populate("supplier");

      if (!product || !product.isActive) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      return res.json({ success: true, data: product });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  },

  // ─────────────────────────────
  // GET ALL PRODUCTS
  // Pagination + Filter + Search
  // ─────────────────────────────
  async getAll(req: Request, res: Response) {
    try {
      const {
        page = "1",
        limit = "10",
        search,
        category,
        type,
        supplier,
        isActive = "true",
      } = req.query;

      const query: Record<string, unknown> = {
        isActive: isActive === "true",
      };

      if (search) query.$text = { $search: search as string };
      if (category) query.category = category;
      if (type) query.type = type;
      if (supplier) query.supplier = supplier;

      const skip = (Number(page) - 1) * Number(limit);

      const [products, total] = await Promise.all([
        Product.find(query)
          .populate("category")
          .populate("supplier")
          .skip(skip)
          .limit(Number(limit))
          .sort({ createdAt: -1 }),
        Product.countDocuments(query),
      ]);

      return res.json({
        success: true,
        data: products,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  },

  // ─────────────────────────────
  // SOFT DELETE
  // ─────────────────────────────
  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;

      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid product id" });
      }

      const product = await Product.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true }
      );

      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      return res.json({ success: true, message: "Product soft deleted" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  },
};