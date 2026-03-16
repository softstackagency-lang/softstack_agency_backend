import { Request, Response } from "express";
import { getDb } from "../../db";
import { Blog, BlogInput } from "./blog.model";

const toSlug = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");

const generateBlogId = (title: string): string => {
  const slug = toSlug(title);
  return `${slug || "blog"}-${Date.now()}`;
};

const normalizeTags = (tags?: string[] | string): string[] => {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags.map((item) => String(item).trim()).filter(Boolean);
  }

  return tags
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export const uploadBlog = async (req: Request, res: Response) => {
  try {
    const { image, title, description, tags }: BlogInput = req.body;

    if (!image || !title || !description) {
      return res.status(400).json({
        success: false,
        message: "image, title and description are required"
      });
    }

    const db = getDb();
    const now = new Date();
    const stringId = generateBlogId(String(title));

    const blog: Blog = {
      id: stringId,
      image: String(image).trim(),
      title: String(title).trim(),
      description: String(description).trim(),
      tags: normalizeTags(tags),
      createdAt: now,
      updatedAt: now
    };

    const result = await db.collection("blogs").insertOne(blog);

    return res.status(201).json({
      success: true,
      message: "Blog uploaded successfully",
      data: { ...blog, _id: result.insertedId }
    });
  } catch (error) {
    console.error("Upload blog error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload blog"
    });
  }
};

export const getAllBlogs = async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const blogs = await db.collection("blogs").find({}).sort({ createdAt: -1 }).toArray();

    return res.status(200).json({
      success: true,
      count: blogs.length,
      data: blogs
    });
  } catch (error) {
    console.error("Get all blogs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch blogs"
    });
  }
};

export const getBlogById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid blog ID"
      });
    }

    const db = getDb();
    const blog = await db.collection("blogs").findOne({ id });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: blog
    });
  } catch (error) {
    console.error("Get blog by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch blog"
    });
  }
};

export const updateBlog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid blog ID"
      });
    }

    const { image, title, description, tags }: Partial<BlogInput> = req.body;

    const updateData: Record<string, unknown> = {};

    if (image !== undefined) updateData.image = String(image).trim();
    if (title !== undefined) updateData.title = String(title).trim();
    if (description !== undefined) updateData.description = String(description).trim();
    if (tags !== undefined) updateData.tags = normalizeTags(tags);

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one field is required to update"
      });
    }

    updateData.updatedAt = new Date();

    const db = getDb();
  const filter = { id };

    const existingBlog = await db.collection("blogs").findOne(filter);
    if (!existingBlog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found"
      });
    }

    await db.collection("blogs").updateOne(filter, { $set: updateData });
    const updatedBlog = await db.collection("blogs").findOne(filter);

    return res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      data: updatedBlog
    });
  } catch (error) {
    console.error("Update blog error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update blog"
    });
  }
};

export const deleteBlog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid blog ID"
      });
    }

    const db = getDb();
  const filter = { id };

    const existingBlog = await db.collection("blogs").findOne(filter);
    if (!existingBlog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found"
      });
    }

    await db.collection("blogs").deleteOne(filter);

    return res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
      data: { deletedId: id }
    });
  } catch (error) {
    console.error("Delete blog error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete blog"
    });
  }
};
