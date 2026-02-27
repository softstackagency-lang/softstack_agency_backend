import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateUserStatus,
  getAllUsersWithStatus,
  getUserStatus,
  getAllUsersWithRole,
  getUserRole,
  updateUserRole
} from "./user.controller";
import { verifyToken, requireAdmin, requireUserOrAdmin } from "../../middlewares/auth.middleware";

const router = express.Router();

// Routes with specific paths MUST come before dynamic :id routes
// Get all users
router.get("/", verifyToken, requireUserOrAdmin, getAllUsers);

// Status and role aggregate routes (MUST be before /:id routes)
router.get("/status/all", verifyToken, requireUserOrAdmin, getAllUsersWithStatus);
router.get("/role/all", verifyToken, requireUserOrAdmin, getAllUsersWithRole);

// Admin-only routes with :id
router.get("/:id/status", verifyToken, requireAdmin, getUserStatus);
router.get("/:id/role", verifyToken, requireUserOrAdmin, getUserRole);
router.patch("/:id/status", verifyToken, requireAdmin, updateUserStatus);
router.patch("/:id/role", verifyToken, requireAdmin, updateUserRole);

// User or Admin routes with :id (MUST be last)
router.get("/:id", verifyToken, requireUserOrAdmin, getUserById);
router.put("/:id", verifyToken, requireUserOrAdmin, updateUser);
router.patch("/:id", verifyToken, requireUserOrAdmin, updateUser);
router.delete("/:id", verifyToken, requireAdmin, deleteUser);

export default router;
