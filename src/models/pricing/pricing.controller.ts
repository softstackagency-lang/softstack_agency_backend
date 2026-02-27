import express, { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { connectDB } from "../../config/db";
import { PricingCategory, PricingPlan, PricingFilters } from "./pricing.model";

// Helper function to ensure id is a string
const getIdAsString = (id: string | string[]): string => {
  return Array.isArray(id) ? id[0] : id;
};

// Pricing Category Controllers
export const createPricingCategory = async (req: Request, res: Response) => {
  try {
    const categoryData: PricingCategory = req.body;

    // Auto-generate ID from name if not provided
    if (!categoryData.id) {
      categoryData.id = categoryData.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-]/g, ''); // Remove special characters except hyphens
    }

    // Add timestamps
    categoryData.createdAt = new Date();
    categoryData.updatedAt = new Date();

    // Initialize empty plans array if not provided
    if (!categoryData.plans) {
      categoryData.plans = [];
    }

    const db = await connectDB();

    // Check if category with same id already exists
    const existingCategory = await db.collection("pricingCategories").findOne({ id: categoryData.id });
    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: `Category with ID "${categoryData.id}" already exists`
      });
    }

    const result = await db.collection("pricingCategories").insertOne(categoryData);

    return res.status(201).json({
      success: true,
      message: "Pricing category created successfully",
      data: { ...categoryData, _id: result.insertedId }
    });
  } catch (error) {
    console.error("Error creating pricing category:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create pricing category",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const getAllPricingCategories = async (req: Request, res: Response) => {
  try {
    const {
      isActive,
      sortBy = 'order',
      sortOrder = 'asc'
    } = req.query;

    const filters: any = {};
    if (isActive !== undefined) filters.isActive = isActive === 'true';

    const db = await connectDB();

    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const categories = await db
      .collection("pricingCategories")
      .find(filters)
      .sort(sortOptions)
      .toArray();

    return res.json({
      success: true,
      data: {
        categories: categories
      }
    });
  } catch (error) {
    console.error("Error fetching pricing categories:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pricing categories",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const getPricingCategoryById = async (req: Request, res: Response) => {
  try {
    const id = getIdAsString(req.params.id);
    const db = await connectDB();

    // Try to find by custom id first, then by _id
    let category = await db.collection("pricingCategories").findOne({ id });

    if (!category && ObjectId.isValid(id)) {
      category = await db.collection("pricingCategories").findOne({ _id: new ObjectId(id) });
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Pricing category not found"
      });
    }

    return res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error("Error fetching pricing category:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pricing category",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const updatePricingCategory = async (req: Request, res: Response) => {
  try {
    const id = getIdAsString(req.params.id);
    const updateData = { ...req.body };

    // Add update timestamp
    updateData.updatedAt = new Date();

    // Remove _id from update data if present
    delete updateData._id;

    const db = await connectDB();

    // Try to update by custom id first, then by _id
    let result = await db.collection("pricingCategories").updateOne(
      { id },
      { $set: updateData }
    );

    if (result.matchedCount === 0 && ObjectId.isValid(id)) {
      result = await db.collection("pricingCategories").updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );
    }

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Pricing category not found"
      });
    }

    return res.json({
      success: true,
      message: "Pricing category updated successfully"
    });
  } catch (error) {
    console.error("Error updating pricing category:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update pricing category",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const deletePricingCategory = async (req: Request, res: Response) => {
  try {
    const id = getIdAsString(req.params.id);
    const db = await connectDB();

    // Try to delete by custom id first, then by _id
    let result = await db.collection("pricingCategories").deleteOne({ id });

    if (result.deletedCount === 0 && ObjectId.isValid(id)) {
      result = await db.collection("pricingCategories").deleteOne({ _id: new ObjectId(id) });
    }

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Pricing category not found"
      });
    }

    return res.json({
      success: true,
      message: "Pricing category deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting pricing category:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete pricing category",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Plan Management within Categories
export const addPlanToCategory = async (req: Request, res: Response) => {
  try {
    const categoryId = getIdAsString(req.params.categoryId);
    const planData: PricingPlan = req.body;

    // Auto-generate ID from name if not provided
    if (!planData.id) {
      planData.id = planData.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-]/g, ''); // Remove special characters except hyphens
    }

    const db = await connectDB();

    // Find the category
    let category = await db.collection("pricingCategories").findOne({ id: categoryId });

    if (!category && ObjectId.isValid(categoryId)) {
      category = await db.collection("pricingCategories").findOne({ _id: new ObjectId(categoryId) });
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Pricing category not found"
      });
    }

    // Check if plan with same id already exists in this category
    const existingPlan = category.plans?.find((plan: any) => plan.id === planData.id);
    if (existingPlan) {
      return res.status(409).json({
        success: false,
        message: `Plan with ID "${planData.id}" already exists in this category`
      });
    }

    // Add the plan to the category
    const updateResult = await db.collection("pricingCategories").updateOne(
      { _id: category._id },
      {
        $push: { plans: planData } as any,
        $set: { updatedAt: new Date() }
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(500).json({
        success: false,
        message: "Failed to add plan to category"
      });
    }

    return res.status(201).json({
      success: true,
      message: "Plan added to category successfully",
      data: planData
    });
  } catch (error) {
    console.error("Error adding plan to category:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add plan to category",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const updatePlanInCategory = async (req: Request, res: Response) => {
  try {
    const categoryId = getIdAsString(req.params.categoryId);
    const planId = getIdAsString(req.params.planId);
    const updateData = req.body;

    const db = await connectDB();

    // Find the category
    let category = await db.collection("pricingCategories").findOne({ id: categoryId });

    if (!category && ObjectId.isValid(categoryId)) {
      category = await db.collection("pricingCategories").findOne({ _id: new ObjectId(categoryId) });
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Pricing category not found"
      });
    }

    // Update the specific plan
    const updateResult = await db.collection("pricingCategories").updateOne(
      {
        _id: category._id,
        "plans.id": planId
      },
      {
        $set: {
          "plans.$": { ...updateData, id: planId },
          updatedAt: new Date()
        }
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Plan not found in this category"
      });
    }

    return res.json({
      success: true,
      message: "Plan updated successfully"
    });
  } catch (error) {
    console.error("Error updating plan in category:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update plan",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const removePlanFromCategory = async (req: Request, res: Response) => {
  try {
    const categoryId = getIdAsString(req.params.categoryId);
    const planId = getIdAsString(req.params.planId);

    const db = await connectDB();

    // Find the category
    let category = await db.collection("pricingCategories").findOne({ id: categoryId });

    if (!category && ObjectId.isValid(categoryId)) {
      category = await db.collection("pricingCategories").findOne({ _id: new ObjectId(categoryId) });
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Pricing category not found"
      });
    }

    // Remove the plan from the category
    const updateResult = await db.collection("pricingCategories").updateOne(
      { _id: category._id },
      {
        $pull: { plans: { id: planId } } as any,
        $set: { updatedAt: new Date() }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Plan not found in this category"
      });
    }

    return res.json({
      success: true,
      message: "Plan removed from category successfully"
    });
  } catch (error) {
    console.error("Error removing plan from category:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove plan from category",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};