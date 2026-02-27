import express, { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { connectDB } from "../../config/db";
import { Project, ProjectInput, ProjectCategory, ProjectCategoryInput, ProjectFilters } from "./project.model";

// Helper function to ensure id is a string
const getIdAsString = (id: string | string[]): string => {
  return Array.isArray(id) ? id[0] : id;
};

// Project Category Controllers
export const createProjectCategory = async (req: Request, res: Response) => {
  try {
    const categoryData: ProjectCategoryInput = req.body;

    // Auto-generate ID from name if not provided
    const categoryToInsert = {
      ...categoryData,
      id: categoryData.id || categoryData.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-]/g, ''), // Remove special characters except hyphens
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: categoryData.isActive !== undefined ? categoryData.isActive : true,
      projects: [] // Initialize empty projects array
    };

    const db = await connectDB();

    // Check if category with same id already exists
    if (categoryToInsert.id) {
      const existingCategory = await db.collection("projectCategories").findOne({ id: categoryToInsert.id });
      if (existingCategory) {
        return res.status(409).json({
          success: false,
          message: `Project category with ID "${categoryToInsert.id}" already exists`
        });
      }
    }

    const result = await db.collection("projectCategories").insertOne(categoryToInsert);

    return res.status(201).json({
      success: true,
      message: "Project category created successfully",
      data: { ...categoryToInsert, _id: result.insertedId }
    });
  } catch (error) {
    console.error("Error creating project category:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create project category",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const getAllProjectCategories = async (req: Request, res: Response) => {
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
      .collection("projectCategories")
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
    console.error("Error fetching project categories:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch project categories",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const getProjectCategoryById = async (req: Request, res: Response) => {
  try {
    const id = getIdAsString(req.params.id);
    const db = await connectDB();

    // Try to find by custom id first, then by _id
    let category = await db.collection("projectCategories").findOne({ id });

    if (!category && ObjectId.isValid(id)) {
      category = await db.collection("projectCategories").findOne({ _id: new ObjectId(id) });
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Project category not found"
      });
    }

    return res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error("Error fetching project category:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch project category",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const updateProjectCategory = async (req: Request, res: Response) => {
  try {
    const id = getIdAsString(req.params.id);
    const updateData = req.body;

    // Add updated timestamp
    updateData.updatedAt = new Date();

    const db = await connectDB();

    // Try to find by custom id first, then by _id
    let query: any = { id };
    let existingCategory = await db.collection("projectCategories").findOne(query);

    if (!existingCategory && ObjectId.isValid(id)) {
      query = { _id: new ObjectId(id) };
      existingCategory = await db.collection("projectCategories").findOne(query);
    }

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: "Project category not found"
      });
    }

    // If updating the id, check if new id already exists
    if (updateData.id && updateData.id !== existingCategory.id) {
      const duplicateCategory = await db.collection("projectCategories").findOne({
        id: updateData.id,
        _id: { $ne: existingCategory._id }
      });

      if (duplicateCategory) {
        return res.status(409).json({
          success: false,
          message: `Project category with ID "${updateData.id}" already exists`
        });
      }
    }

    const result = await db.collection("projectCategories").updateOne(
      query,
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: "No changes were made to the project category"
      });
    }

    // Fetch updated category
    const updatedCategory = await db.collection("projectCategories").findOne(query);

    return res.json({
      success: true,
      message: "Project category updated successfully",
      data: updatedCategory
    });
  } catch (error) {
    console.error("Error updating project category:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update project category",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const deleteProjectCategory = async (req: Request, res: Response) => {
  try {
    const id = getIdAsString(req.params.id);
    const db = await connectDB();

    // Try to find by custom id first, then by _id
    let query: any = { id };
    let existingCategory = await db.collection("projectCategories").findOne(query);

    if (!existingCategory && ObjectId.isValid(id)) {
      query = { _id: new ObjectId(id) };
      existingCategory = await db.collection("projectCategories").findOne(query);
    }

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: "Project category not found"
      });
    }

    const result = await db.collection("projectCategories").deleteOne(query);

    return res.json({
      success: true,
      message: "Project category deleted successfully",
      data: { deletedCount: result.deletedCount }
    });
  } catch (error) {
    console.error("Error deleting project category:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete project category",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Project management within categories
export const addProjectToCategory = async (req: Request, res: Response) => {
  try {
    const categoryId = getIdAsString(req.params.categoryId);
    const projectData: ProjectInput = req.body;

    // Auto-generate ID from title if not provided
    const projectToAdd = {
      ...projectData,
      id: projectData.id || projectData.title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-]/g, ''), // Remove special characters except hyphens
      isFeatured: projectData.isFeatured !== undefined ? projectData.isFeatured : false,
      tags: projectData.tags || []
    };

    const db = await connectDB();

    // Find the category
    let category = await db.collection("projectCategories").findOne({ id: categoryId });
    if (!category && ObjectId.isValid(categoryId)) {
      category = await db.collection("projectCategories").findOne({ _id: new ObjectId(categoryId) });
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Project category not found"
      });
    }

    // Check if project with same id already exists in the category
    const existingProject = category.projects.find((p: any) => p.id === projectToAdd.id);
    if (existingProject) {
      return res.status(409).json({
        success: false,
        message: `Project with ID "${projectToAdd.id}" already exists in this category`
      });
    }

    // Add the project to the category
    const result = await db.collection("projectCategories").updateOne(
      { _id: category._id },
      {
        $push: { projects: projectToAdd } as any,
        $set: { updatedAt: new Date() }
      }
    );

    return res.status(201).json({
      success: true,
      message: "Project added to category successfully",
      data: projectToAdd
    });
  } catch (error) {
    console.error("Error adding project to category:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add project to category",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const updateProjectInCategory = async (req: Request, res: Response) => {
  try {
    const categoryId = getIdAsString(req.params.categoryId);
    const projectId = getIdAsString(req.params.projectId);
    const updateData = req.body;

    const db = await connectDB();

    // Find the category
    let category = await db.collection("projectCategories").findOne({ id: categoryId });
    if (!category && ObjectId.isValid(categoryId)) {
      category = await db.collection("projectCategories").findOne({ _id: new ObjectId(categoryId) });
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Project category not found"
      });
    }

    // Check if project exists in the category
    const projectIndex = category.projects.findIndex((p: any) => p.id === projectId);
    if (projectIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Project not found in this category"
      });
    }

    // Update the project
    const updatedProject = { ...category.projects[projectIndex], ...updateData };

    const result = await db.collection("projectCategories").updateOne(
      { _id: category._id },
      {
        $set: {
          [`projects.${projectIndex}`]: updatedProject,
          updatedAt: new Date()
        }
      }
    );

    return res.json({
      success: true,
      message: "Project updated successfully",
      data: updatedProject
    });
  } catch (error) {
    console.error("Error updating project in category:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update project in category",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const removeProjectFromCategory = async (req: Request, res: Response) => {
  try {
    const categoryId = getIdAsString(req.params.categoryId);
    const projectId = getIdAsString(req.params.projectId);

    const db = await connectDB();

    // Find the category
    let category = await db.collection("projectCategories").findOne({ id: categoryId });
    if (!category && ObjectId.isValid(categoryId)) {
      category = await db.collection("projectCategories").findOne({ _id: new ObjectId(categoryId) });
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Project category not found"
      });
    }

    // Check if project exists in the category
    const projectExists = category.projects.some((p: any) => p.id === projectId);
    if (!projectExists) {
      return res.status(404).json({
        success: false,
        message: "Project not found in this category"
      });
    }

    // Remove the project from the category
    const result = await db.collection("projectCategories").updateOne(
      { _id: category._id },
      {
        $pull: { projects: { id: projectId } } as any,
        $set: { updatedAt: new Date() }
      }
    );

    return res.json({
      success: true,
      message: "Project removed from category successfully",
      data: { removedProjectId: projectId }
    });
  } catch (error) {
    console.error("Error removing project from category:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove project from category",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};