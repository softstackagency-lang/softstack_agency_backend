import express from "express";
import {
  // Category management
  createPricingCategory,
  getAllPricingCategories,
  getPricingCategoryById,
  updatePricingCategory,
  deletePricingCategory,
  // Plan management
  addPlanToCategory,
  updatePlanInCategory,
  removePlanFromCategory
} from "./pricing.controller";
import { verifyToken, requireAdmin } from "../../middlewares/auth.middleware";

const router = express.Router();

// Public routes for pricing
router.get("/", getAllPricingCategories);
router.get("/categories/:id", getPricingCategoryById);

// Admin-only routes for pricing categories
router.post("/categories", verifyToken, requireAdmin, createPricingCategory);
router.put("/categories/:id", verifyToken, requireAdmin, updatePricingCategory);
router.patch("/categories/:id", verifyToken, requireAdmin, updatePricingCategory);
router.delete("/categories/:id", verifyToken, requireAdmin, deletePricingCategory);


// Admin-only routes for plan management within categories
router.post("/categories/:categoryId/plans", verifyToken, requireAdmin, addPlanToCategory);
router.put("/categories/:categoryId/plans/:planId", verifyToken, requireAdmin, updatePlanInCategory);
router.patch("/categories/:categoryId/plans/:planId", verifyToken, requireAdmin, updatePlanInCategory);
router.delete("/categories/:categoryId/plans/:planId", verifyToken, requireAdmin, removePlanFromCategory);

export default router;