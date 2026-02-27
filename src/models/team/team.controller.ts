import express, { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { connectDB } from "../../config/db";
import { TeamMember, Department, TeamFilters } from "./team.model";

// Helper function to ensure id is a string
const getIdAsString = (id: string | string[]): string => {
  return Array.isArray(id) ? id[0] : id;
};

// Team Member Controllers
export const createTeamMember = async (req: Request, res: Response) => {
  try {
    const teamMemberData: TeamMember = req.body;

    // Add timestamps
    teamMemberData.createdAt = new Date();
    teamMemberData.updatedAt = new Date();

    const db = await connectDB();
    const result = await db.collection("teamMembers").insertOne(teamMemberData);

    res.status(201).json({
      success: true,
      message: "Team member created successfully",
      data: { ...teamMemberData, _id: result.insertedId }
    });
  } catch (error) {
    console.error("Error creating team member:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create team member",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const getAllTeamMembers = async (req: Request, res: Response) => {
  try {
    const {
      department,
      status, // Remove default value
      role,
      skills,
      page = 1,
      limit = 10,
      sortBy = 'roleValue',
      sortOrder = 'asc'
    } = req.query;

    const filters: any = {};

    if (department) filters.department = department;
    if (status) filters.status = status; // Only filter by status if explicitly provided
    if (role) filters.role = { $regex: role, $options: 'i' };
    if (skills) {
      const skillsArray = Array.isArray(skills) ? skills : [skills];
      filters.skills = { $in: skillsArray };
    }

    const db = await connectDB();
    const skip = (Number(page) - 1) * Number(limit);

    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const teamMembers = await db
      .collection("teamMembers")
      .find(filters)
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .toArray();

    const total = await db.collection("teamMembers").countDocuments(filters);

    return res.json({
      success: true,
      data: teamMembers,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit)
      }
    });
  } catch (error) {
    console.error("Error fetching team members:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch team members",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const getTeamMemberById = async (req: Request, res: Response) => {
  try {
    const id = getIdAsString(req.params.id);
    const db = await connectDB();

    // Try to find by custom id first, then by _id
    let teamMember = await db.collection("teamMembers").findOne({ id });

    if (!teamMember && ObjectId.isValid(id)) {
      teamMember = await db.collection("teamMembers").findOne({ _id: new ObjectId(id) });
    }

    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: "Team member not found"
      });
    }

    return res.json({
      success: true,
      data: teamMember
    });
  } catch (error) {
    console.error("Error fetching team member:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch team member",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const getTeamMembersByDepartment = async (req: Request, res: Response) => {
  try {
    const department = getIdAsString(req.params.department);
    const { status } = req.query; // Remove default value

    const db = await connectDB();

    // Build filter object conditionally
    const filter: any = {
      department: { $regex: department, $options: 'i' }
    };

    // Only add status filter if provided
    if (status) {
      filter.status = status;
    }

    const teamMembers = await db
      .collection("teamMembers")
      .find(filter)
      .sort({ roleValue: 1 })
      .toArray();

    return res.json({
      success: true,
      data: teamMembers
    });
  } catch (error) {
    console.error("Error fetching team members by department:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch team members by department",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const updateTeamMember = async (req: Request, res: Response) => {
  try {
    const id = getIdAsString(req.params.id);
    const updateData = { ...req.body };

    // Add update timestamp
    updateData.updatedAt = new Date();

    // Remove _id from update data if present
    delete updateData._id;

    const db = await connectDB();

    // Try to update by custom id first, then by _id
    let result = await db.collection("teamMembers").updateOne(
      { id },
      { $set: updateData }
    );

    if (result.matchedCount === 0 && ObjectId.isValid(id)) {
      result = await db.collection("teamMembers").updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );
    }

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Team member not found"
      });
    }

    return res.json({
      success: true,
      message: "Team member updated successfully"
    });
  } catch (error) {
    console.error("Error updating team member:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update team member",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const deleteTeamMember = async (req: Request, res: Response) => {
  try {
    const id = getIdAsString(req.params.id);
    const db = await connectDB();

    // Try to delete by custom id first, then by _id
    let result = await db.collection("teamMembers").deleteOne({ id });

    if (result.deletedCount === 0 && ObjectId.isValid(id)) {
      result = await db.collection("teamMembers").deleteOne({ _id: new ObjectId(id) });
    }

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Team member not found"
      });
    }

    return res.json({
      success: true,
      message: "Team member deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting team member:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete team member",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Department Controllers
export const createDepartment = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Department name is required"
      });
    }

    const departmentData = {
      name: name.trim(),
      description: description?.trim() || "",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const db = await connectDB();

    // Check if department already exists
    const existingDept = await db.collection("departments").findOne({
      name: { $regex: `^${name.trim()}$`, $options: 'i' }
    });

    if (existingDept) {
      return res.status(409).json({
        success: false,
        message: "Department already exists"
      });
    }

    const result = await db.collection("departments").insertOne(departmentData);

    return res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: { ...departmentData, _id: result.insertedId }
    });
  } catch (error) {
    console.error("Error creating department:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create department",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const deleteDepartment = async (req: Request, res: Response) => {
  try {
    const departmentName = getIdAsString(req.params.name);
    const db = await connectDB();

    // Check if any team members are assigned to this department
    const teamMembersCount = await db.collection("teamMembers").countDocuments({
      department: { $regex: `^${departmentName}$`, $options: 'i' }
    });

    if (teamMembersCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete department. ${teamMembersCount} team member(s) are assigned to this department.`
      });
    }

    // Delete the department
    const result = await db.collection("departments").deleteOne({
      name: { $regex: `^${departmentName}$`, $options: 'i' }
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    return res.json({
      success: true,
      message: "Department deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting department:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete department",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Get all departments (from departments collection)
export const getDepartments = async (req: Request, res: Response) => {
  try {
    const db = await connectDB();

    // Get all departments from the departments collection
    const departments = await db
      .collection("departments")
      .find({})
      .sort({ name: 1 })
      .toArray();

    return res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error("Error fetching departments:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch departments",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};