import express from "express";
import {
  // Team Member routes
  createTeamMember,
  getAllTeamMembers,
  getTeamMemberById,
  getTeamMembersByDepartment,
  updateTeamMember,
  deleteTeamMember,
  // Department routes
  createDepartment,
  deleteDepartment,
  // Utility routes
  getDepartments
} from "./team.controller";
import { verifyToken, requireAdmin } from "../../middlewares/auth.middleware";

const router = express.Router();


// Public routes for team members
router.get("/", getAllTeamMembers);
router.get("/departments", getDepartments);
router.get("/department/:department", getTeamMembersByDepartment);
router.get("/:id", getTeamMemberById);

// Admin-only routes for team members
router.post("/", verifyToken, requireAdmin, createTeamMember);
router.put("/:id", verifyToken, requireAdmin, updateTeamMember);
router.patch("/:id", verifyToken, requireAdmin, updateTeamMember);
router.delete("/:id", verifyToken, requireAdmin, deleteTeamMember);

// Admin-only routes for departments
router.post("/departments", verifyToken, requireAdmin, createDepartment);
router.delete("/departments/:name", verifyToken, requireAdmin, deleteDepartment);

export default router;