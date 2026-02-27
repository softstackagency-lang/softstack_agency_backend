import express from "express";
import {
    createFAQ,
    getAllFAQs,
    getActiveFAQs,
    getFAQById,
    updateFAQ,
    deleteFAQ,
    reorderFAQs
} from "./faq.controller";
import { verifyToken, requireAdmin } from "../../../middlewares/auth.middleware";

const router = express.Router();

// Public routes
router.get("/", getAllFAQs);
router.get("/active", getActiveFAQs);
router.get("/:id", getFAQById);

// Admin-only routes
router.post("/", verifyToken, requireAdmin, createFAQ);
router.put("/:id", verifyToken, requireAdmin, updateFAQ);
router.patch("/:id", verifyToken, requireAdmin, updateFAQ);
router.delete("/:id", verifyToken, requireAdmin, deleteFAQ);
router.post("/reorder", verifyToken, requireAdmin, reorderFAQs);

export default router;
