import express from "express";
import { createProduct, deleteProduct, getAllProducts, updateProduct } from "./product.controller";
import { verifyToken, requireAdmin, requireUser, optionalToken } from "../../middlewares/auth.middleware";

const router = express.Router();

// User routes - authenticated users can create products
router.post("/:userId", verifyToken, requireUser, createProduct);

// Admin-only routes (update, delete)
router.put("/:id", verifyToken, requireAdmin, updateProduct);
router.delete("/:id", verifyToken, requireAdmin, deleteProduct);

// Public routes (view products)
router.get("/", optionalToken, getAllProducts); // Public access with optional user info

export default router;
