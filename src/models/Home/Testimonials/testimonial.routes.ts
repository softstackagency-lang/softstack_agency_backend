import express from "express";
import {
    createTestimonial,
    getAllTestimonials,
    getFeaturedTestimonials,
    getTestimonialById,
    updateTestimonial,
    deleteTestimonial
} from "./testimonial.controller";
import { verifyToken, requireAdmin } from "../../../middlewares/auth.middleware";

const router = express.Router();

// Public routes
router.get("/", getAllTestimonials);
router.get("/featured", getFeaturedTestimonials);
router.get("/:id", getTestimonialById);

// Admin-only routes
router.post("/", verifyToken, requireAdmin, createTestimonial);
router.put("/:id", verifyToken, requireAdmin, updateTestimonial);
router.patch("/:id", verifyToken, requireAdmin, updateTestimonial);
router.delete("/:id", verifyToken, requireAdmin, deleteTestimonial);

export default router;
