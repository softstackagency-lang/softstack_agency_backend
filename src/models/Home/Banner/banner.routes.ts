import express from "express";
import {
    createBanner,
    getBanner,
    getAllBanners,
    updateBanner,
    deleteBanner
} from "./banner.controller";
import { verifyToken, requireAdmin } from "../../../middlewares/auth.middleware";

const router = express.Router();

// Public route - Get active banner
router.get("/", getBanner);

// Admin-only routes
router.get("/all", getAllBanners);
router.post("/", verifyToken, requireAdmin, createBanner);
router.put("/:id", verifyToken, requireAdmin, updateBanner);
router.patch("/:id", verifyToken, requireAdmin, updateBanner);
router.delete("/:id", verifyToken, requireAdmin, deleteBanner);

export default router;
