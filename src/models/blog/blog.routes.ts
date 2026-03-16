import express from "express";
import { uploadBlog, updateBlog, deleteBlog, getAllBlogs, getBlogById } from "./blog.controller";
import { verifyToken, requireAdmin } from "../../middlewares/auth.middleware";

const router = express.Router();

router.get("/", getAllBlogs);
router.get("/:id", getBlogById);

router.post("/upload", verifyToken, requireAdmin, uploadBlog);
router.put("/:id", verifyToken, requireAdmin, updateBlog);
router.patch("/:id", verifyToken, requireAdmin, updateBlog);
router.delete("/:id", verifyToken, requireAdmin, deleteBlog);

export default router;
