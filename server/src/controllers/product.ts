import { Request, Response } from "express";
import { Product } from "../models/product.model";
import { Types } from "mongoose";
import { cloudinaryUtil } from "../utils/cloudinary.utils";

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

      const parsedVariants = JSON.parse(variants);
      const parsedAttributes = attributes ? JSON.parse(attributes) : [];
      const parsedVariantOptions = variantOptions
        ? JSON.parse(variantOptions)
        : [];

      // 🔥 BUSINESS LOGIC ENFORCEMENT
      for (const variant of parsedVariants) {
        const { sellMode, quantity, price } = variant;

        if (!price?.selling || price.selling < 0) {
          return res.status(400).json({
            success: false,
            message: "Selling price must be greater than 0",
          });
        }

        // ✅ Enforce base units
        if (sellMode === "loose") {
          if (!["kg", "L"].includes(quantity.unit)) {
            return res.status(400).json({
              success: false,
              message: "Loose products must use kg or L as unit",
            });
          }
        }

        if (sellMode === "packaged") {
          quantity.unit = "pcs"; // force base unit
        }

        // ✅ Enforce minThreshold logic
        if (quantity.minThreshold > quantity.inStock) {
          return res.status(400).json({
            success: false,
            message: "minThreshold cannot exceed inStock quantity",
          });
        }
      }

      // Handle variant-level image uploads
      if (req.files && Array.isArray(req.files)) {
        for (let i = 0; i < parsedVariants.length; i++) {
          const variantFiles = req.files.filter(
            (file: any) => file.fieldname === `variants[${i}][images]`
          );

          if (variantFiles.length > 0) {
            const uploadedImages = await cloudinaryUtil.uploadMultiple(
              variantFiles,
              "max_pets/images"
            );

            parsedVariants[i].images = uploadedImages;
          }
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
        variants: parsedVariants,
      });

      res.status(201).json({
        success: true,
        data: product,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // ─────────────────────────────
  // UPDATE PRODUCT
  // ─────────────────────────────
  async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid product id",
        });
      }

      const existingProduct = await Product.findById(id);

      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      const updateData: any = { ...req.body };

      if (updateData.attributes)
        updateData.attributes = JSON.parse(updateData.attributes);

      if (updateData.variantOptions)
        updateData.variantOptions = JSON.parse(updateData.variantOptions);

      if (updateData.variants)
        updateData.variants = JSON.parse(updateData.variants);

      if (updateData.variants) {
        for (const variant of updateData.variants) {
          const { sellMode, quantity, price } = variant;

          if (!price?.selling || price.selling < 0) {
            return res.status(400).json({
              success: false,
              message: "Selling price must be greater than 0",
            });
          }

          // ✅ Loose must be kg or L
          if (sellMode === "loose") {
            if (!["kg", "L"].includes(quantity.unit)) {
              return res.status(400).json({
                success: false,
                message: "Loose products must use kg or L as unit",
              });
            }
          }

          // ✅ Packaged always pcs
          if (sellMode === "packaged") {
            quantity.unit = "pcs";
          }

          if (quantity.minThreshold > quantity.inStock) {
            return res.status(400).json({
              success: false,
              message: "minThreshold cannot exceed inStock quantity",
            });
          }
        }
      }
      // Handle variant-level image updates
      if (req.files && Array.isArray(req.files) && updateData.variants) {
        for (let i = 0; i < updateData.variants.length; i++) {
          const variantFiles = req.files.filter(
            (file: any) => file.fieldname === `variants[${i}][images]`
          );

          if (variantFiles.length > 0) {
            // 🔥 Delete old images from cloudinary
            const oldVariant = existingProduct.variants.find(
              (v: any) => v._id.toString() === updateData.variants[i]._id
            );

            if (oldVariant && oldVariant.images.length > 0) {
              for (const img of oldVariant.images) {
                await cloudinaryUtil.deleteImage(img.public_id);
              }
            }

            // 🔥 Upload new images
            const uploadedImages = await cloudinaryUtil.uploadMultiple(
              variantFiles,
              "max_pets/images"
            );

            updateData.variants[i].images = uploadedImages;
          }
        }
      }

      const updatedProduct = await Product.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );

      res.json({
        success: true,
        data: updatedProduct,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // ─────────────────────────────
  // GET ONE PRODUCT
  // ─────────────────────────────
  async getOne(req: Request, res: Response) {
    try {
      const id = req.params.id as string;

      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid product id",
        });
      }

      const product = await Product.findById(id)
        .populate("category")
        .populate("supplier");

      if (!product || !product.isActive) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      res.json({
        success: true,
        data: product,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
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

      const query: any = {
        isActive: isActive === "true",
      };

      if (search) {
        query.$text = { $search: search as string };
      }

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

      res.json({
        success: true,
        data: products,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // ─────────────────────────────
  // SOFT DELETE
  // ─────────────────────────────
  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;

      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid product id",
        });
      }

      const product = await Product.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true }
      );

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      res.json({
        success: true,
        message: "Product soft deleted",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
};