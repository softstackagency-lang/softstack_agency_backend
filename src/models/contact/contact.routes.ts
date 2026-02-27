import express from "express";
import {
    createContact,
    getAllContacts,
    getContactById,
    updateContactStatus,
    deleteContact,
    deleteMultipleContacts,
    getContactStats
} from "./contact.controller";
import { verifyToken, requireAdmin } from "../../middlewares/auth.middleware";

const router = express.Router();

// Public route - Submit contact form
router.post("/", createContact);

// Admin-only routes
router.get("/", verifyToken, requireAdmin, getAllContacts);
router.get("/stats", verifyToken, requireAdmin, getContactStats);
router.get("/:id", verifyToken, requireAdmin, getContactById);
router.patch("/:id/status", verifyToken, requireAdmin, updateContactStatus);
router.delete("/:id", verifyToken, requireAdmin, deleteContact);
router.post("/delete-multiple", verifyToken, requireAdmin, deleteMultipleContacts);

export default router;
