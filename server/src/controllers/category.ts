import { Request, Response } from "express";
import slugify from "slugify";
import { Category } from "../models/category.model";
import { STATUS_CODES } from "../constants/common";
import { sendSuccess } from "../utils/api.response";

export const categoryController = {
  // ─────────────────────────────────────────
  // CREATE CATEGORY
  // ─────────────────────────────────────────
  create: async (req: Request, res: Response) => {
    const { name, parent, type, icon, description } = req.body;

    if (!name || !type) {
      const error: any = new Error("Name and type are required");
      error.statusCode = STATUS_CODES.BAD_REQUEST;
      throw error;
    }

    const slug = slugify(name, { lower: true, strict: true });

    const existing = await Category.findOne({ slug });
    if (existing) {
      const error: any = new Error("Category already exists");
      error.statusCode = STATUS_CODES.CONFLICT;
      throw error;
    }

    const category = await Category.create({
      name: name.trim(),
      slug,
      parent: parent || null,
      type,
      description,
    });

    return sendSuccess(
      res,
      STATUS_CODES.CREATED,
      "Category created successfully",
      category
    );
  },

  // ─────────────────────────────────────────
  // UPDATE CATEGORY
  // ─────────────────────────────────────────
  update: async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, parent, type, isActive, description } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      const error: any = new Error("Category not found");
      error.statusCode = STATUS_CODES.NOT_FOUND;
      throw error;
    }

    if (name) {
      category.name = name.trim();
      category.slug = slugify(name, { lower: true, strict: true });
    }

    if (parent !== undefined) category.parent = parent;
    if (type) category.type = type;
    if (description !== undefined) category.description = description;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    return sendSuccess(
      res,
      STATUS_CODES.SUCCESS,
      "Category updated successfully",
      category
    );
  },

  // ─────────────────────────────────────────
  // GET ALL CATEGORIES
  // ─────────────────────────────────────────
  getAll: async (req: Request, res: Response) => {
    const {
      page = "1",
      limit = "10",
      search,
      isActive,
      type,
      sort = "-createdAt", // 👈 default
    } = req.query;

    // ─────────────────────────────────────────
    // Pagination
    // ─────────────────────────────────────────
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // ─────────────────────────────────────────
    // Filter
    // ─────────────────────────────────────────
    const filter: any = {};

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (type) {
      filter.type = type;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // ─────────────────────────────────────────
    // Execute Query
    // ─────────────────────────────────────────
    const [categories, total] = await Promise.all([
      Category.find(filter)
        .populate("parent", "name slug")
        .sort(sort as string)
        .skip(skip)
        .limit(limitNumber)
        .select("-__v"),
      Category.countDocuments(filter),
    ]);

    return sendSuccess(res, STATUS_CODES.SUCCESS, "Categories fetched successfully", {
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
      results: categories,
    });
  },

  // ─────────────────────────────────────────
  // TOGGLE ACTIVE
  // ─────────────────────────────────────────
  toggleActive: async (req: Request, res: Response) => {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      const error: any = new Error("Category not found");
      error.statusCode = STATUS_CODES.NOT_FOUND;
      throw error;
    }

    category.isActive = !category.isActive;
    await category.save();

    return sendSuccess(
      res,
      STATUS_CODES.SUCCESS,
      `Category ${category.isActive ? "activated" : "deactivated"
      } successfully`,
      category
    );
  },
};