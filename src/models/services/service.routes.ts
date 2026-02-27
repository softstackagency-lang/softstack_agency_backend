import express from "express";
import {
  createService,
  getAllServices,
  getServiceById,
  getServicesByCategory,
  updateService,
  deleteService,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from "./service.controller";
import { verifyToken, requireAdmin } from "../../middlewares/auth.middleware";

const router = express.Router();

// Public routes
router.get("/", getAllServices);
router.get("/categories", getCategories);
router.get("/category/:category", getServicesByCategory);
router.get("/:id", getServiceById);
router.patch("/test/:id", updateService); // Temporary public update route for testing

// Admin-only routes
router.post("/categories", verifyToken, requireAdmin, createCategory);
router.put("/categories/:id", verifyToken, requireAdmin, updateCategory);
router.patch("/categories/:id", verifyToken, requireAdmin, updateCategory);
router.delete("/categories/:id", verifyToken, requireAdmin, deleteCategory);

// this is service routes
router.post("/", verifyToken, requireAdmin, createService);
router.put("/:id", verifyToken, requireAdmin, updateService);
router.patch("/:id", verifyToken, requireAdmin, updateService);
router.delete("/:id", verifyToken, requireAdmin, deleteService);

export default router;