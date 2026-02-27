import { Request, Response } from "express";
import { getDB } from "../../config/db";
import { ObjectId } from "mongodb";
import { Service } from "./service.model";

// Create a new service
export const createService = async (req: Request, res: Response) => {
  try {
    const db = getDB();

    const {
      title,
      shortDescription,
      category,
      tags,
      images,
      links,
      pricing,
      deliveryTimeDays,
      features,
      technologies,
      requirements,
      status
    } = req.body;

    // Validate required fields
    if (!title || !shortDescription || !category || !pricing?.basePrice || !deliveryTimeDays) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const service: Service = {
      title,
      shortDescription,
      category,
      tags: tags || [],
      images: images || { thumbnail: "", gallery: [] },
      links: links || {},
      pricing: {
        basePrice: pricing.basePrice,
        currency: pricing.currency || "USD"
      },
      deliveryTimeDays,
      features: features || [],
      technologies: technologies || [],
      requirements: requirements || {
        businessName: false,
        businessType: false,
        pagesCount: false,
        contentProvided: false,
        referenceWebsites: false,
        domainHosting: false
      },
      status: status || "active",
      createdAt: new Date()
    };

    const result = await db.collection("services").insertOne(service);

    return res.status(201).json({
      success: true,
      message: "Service created successfully",
      data: { ...service, _id: result.insertedId }
    });
  } catch (error) {
    console.error("Create service error:", error);
    return res.status(500).json({ message: "Failed to create service" });
  }
};

// Get all services
export const getAllServices = async (req: Request, res: Response) => {
  try {
    const db = getDB();

    // Query parameters for filtering
    const { category, status, tags, minPrice, maxPrice, limit, skip } = req.query;

    // Build filter object
    const filter: any = {};

    if (category && typeof category === 'string') {
      filter.category = category;
    }

    if (status && typeof status === 'string') {
      filter.status = status;
    }

    if (tags && typeof tags === 'string') {
      filter.tags = { $in: tags.split(',') };
    }

    if (minPrice || maxPrice) {
      filter['pricing.basePrice'] = {};
      if (minPrice) filter['pricing.basePrice'].$gte = Number(minPrice);
      if (maxPrice) filter['pricing.basePrice'].$lte = Number(maxPrice);
    }

    // Build query with pagination
    let query = db.collection("services").find(filter).sort({ createdAt: -1 });

    if (skip) query = query.skip(Number(skip));
    if (limit) query = query.limit(Number(limit));

    const services = await query.toArray();
    const totalCount = await db.collection("services").countDocuments(filter);

    return res.status(200).json({
      success: true,
      count: services.length,
      totalCount,
      data: services,
      pagination: {
        skip: Number(skip) || 0,
        limit: Number(limit) || services.length,
        hasMore: (Number(skip) || 0) + services.length < totalCount
      }
    });
  } catch (error) {
    console.error("Get all services error:", error);
    return res.status(500).json({ message: "Failed to get services" });
  }
};

// Get service by ID
export const getServiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || !ObjectId.isValid(id as string)) {
      return res.status(400).json({ message: "Invalid service ID" });
    }

    const db = getDB();

    const service = await db.collection("services").findOne({ _id: new ObjectId(id as string) });

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    return res.status(200).json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error("Get service by ID error:", error);
    return res.status(500).json({ message: "Failed to get service" });
  }
};

// Get services by category
export const getServicesByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const { status, limit, skip } = req.query;

    if (!category) {
      return res.status(400).json({ message: "Category is required" });
    }

    const db = getDB();

    // Build filter
    const filter: any = { category };
    if (status && typeof status === 'string') {
      filter.status = status;
    }

    // Build query with pagination
    let query = db.collection("services").find(filter).sort({ createdAt: -1 });

    if (skip) query = query.skip(Number(skip));
    if (limit) query = query.limit(Number(limit));

    const services = await query.toArray();
    const totalCount = await db.collection("services").countDocuments(filter);

    return res.status(200).json({
      success: true,
      category,
      count: services.length,
      totalCount,
      data: services,
      pagination: {
        skip: Number(skip) || 0,
        limit: Number(limit) || services.length,
        hasMore: (Number(skip) || 0) + services.length < totalCount
      }
    });
  } catch (error) {
    console.error("Get services by category error:", error);
    return res.status(500).json({ message: "Failed to get services by category" });
  }
};

// Update service
export const updateService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id || !ObjectId.isValid(id as string)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID"
      });
    }

    if (!updateData || typeof updateData !== 'object' || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Request body is required and must contain update data"
      });
    }

    const db = getDB();

    // First check if service exists
    const existingService = await db.collection("services").findOne({ _id: new ObjectId(id as string) });

    if (!existingService) {
      return res.status(404).json({
        success: false,
        message: "Service not found"
      });
    }

    // Remove fields that shouldn't be updated
    delete updateData._id;
    delete updateData.createdAt;

    // Add updated timestamp
    updateData.updatedAt = new Date();

    const result = await db.collection("services").updateOne(
      { _id: new ObjectId(id as string) },
      { $set: updateData }
    );

    // Get the updated document
    const updatedService = await db.collection("services").findOne({ _id: new ObjectId(id as string) });

    return res.status(200).json({
      success: true,
      message: "Service updated successfully",
      data: updatedService
    });
  } catch (error) {
    console.error("Update service error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update service",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Delete service
export const deleteService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || !ObjectId.isValid(id as string)) {
      return res.status(400).json({ message: "Invalid service ID" });
    }

    const db = getDB();

    const result = await db.collection("services").deleteOne({ _id: new ObjectId(id as string) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Service not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Service deleted successfully",
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error("Delete service error:", error);
    return res.status(500).json({ message: "Failed to delete service" });
  }
};

// Create a new category
export const createCategory = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const { name, title, description, icon, status } = req.body;

    // Validate required fields
    if (!name || !title || !description) {
      return res.status(400).json({ message: "Name, title, and description are required" });
    }

    // Auto-generate ID from name
    const categoryId = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, ''); // Remove special characters except hyphens

    // Check if category with same id already exists
    const existingCategory = await db.collection("service_categories").findOne({ id: categoryId });
    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: `Category "${categoryId}" already posted`
      });
    }

    const category = {
      id: categoryId,
      name,
      title,
      description,
      icon: icon || "",
      status: status || "active",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection("service_categories").insertOne(category);

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: { ...category, _id: result.insertedId }
    });
  } catch (error) {
    console.error("Create category error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create category",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Get all categories
export const getCategories = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const { status } = req.query;

    // Build filter
    const filter: any = {};
    if (status && typeof status === 'string') {
      filter.status = status;
    }

    const categories = await db.collection("service_categories").find(filter).sort({ createdAt: -1 }).toArray();

    return res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error("Get categories error:", error);
    return res.status(500).json({ message: "Failed to get categories" });
  }
};

// Update category by ID
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required"
      });
    }

    if (!updateData || typeof updateData !== 'object' || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Request body is required and must contain update data"
      });
    }

    const db = getDB();

    // First check if category exists
    const existingCategory = await db.collection("service_categories").findOne({ id: id });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    // Remove fields that shouldn't be updated
    delete updateData._id;
    delete updateData.id;
    delete updateData.createdAt;

    // Add updated timestamp
    updateData.updatedAt = new Date();

    const result = await db.collection("service_categories").updateOne(
      { id: id },
      { $set: updateData }
    );

    // Get the updated document
    const updatedCategory = await db.collection("service_categories").findOne({ id: id });

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: updatedCategory
    });
  } catch (error) {
    console.error("Update category error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update category",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Delete category by ID
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required"
      });
    }

    const db = getDB();

    const result = await db.collection("service_categories").deleteOne({ id: id });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error("Delete category error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete category",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};