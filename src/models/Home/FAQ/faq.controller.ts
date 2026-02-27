import { Request, Response } from "express";
import { getDB } from "../../../config/db";
import { ObjectId } from "mongodb";
import { FAQ } from "./faq.model";

// Create a new FAQ
export const createFAQ = async (req: Request, res: Response) => {
    try {
        const db = getDB();

        const {
            question,
            answer,
            isActive,
            order
        } = req.body;

        // Validate required fields
        if (!question || !answer) {
            return res.status(400).json({
                success: false,
                message: "Required fields missing: question and answer are required"
            });
        }

        const faq: FAQ = {
            question,
            answer,
            isActive: isActive !== undefined ? isActive : true,
            order: order !== undefined ? order : 0,
            createdAt: new Date()
        };

        const result = await db.collection("faqs").insertOne(faq);

        return res.status(201).json({
            success: true,
            message: "FAQ created successfully",
            data: { ...faq, _id: result.insertedId }
        });
    } catch (error) {
        console.error("Create FAQ error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create FAQ",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};

// Get all FAQs (public endpoint)
export const getAllFAQs = async (req: Request, res: Response) => {
    try {
        const db = getDB();
        const { isActive, limit, skip } = req.query;

        // Build filter object
        const filter: any = {};

        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        // Build query with pagination, sorted by order
        let query = db.collection("faqs").find(filter).sort({ order: 1, createdAt: 1 });

        if (skip) query = query.skip(Number(skip));
        if (limit) query = query.limit(Number(limit));

        const faqs = await query.toArray();
        const totalCount = await db.collection("faqs").countDocuments(filter);

        return res.status(200).json({
            success: true,
            count: faqs.length,
            totalCount,
            data: faqs,
            pagination: {
                skip: Number(skip) || 0,
                limit: Number(limit) || faqs.length,
                hasMore: (Number(skip) || 0) + faqs.length < totalCount
            }
        });
    } catch (error) {
        console.error("Get all FAQs error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get FAQs"
        });
    }
};

// Get active FAQs (public endpoint)
export const getActiveFAQs = async (req: Request, res: Response) => {
    try {
        const db = getDB();
        const { limit } = req.query;

        let query = db.collection("faqs")
            .find({ isActive: true })
            .sort({ order: 1, createdAt: 1 });

        if (limit) query = query.limit(Number(limit));

        const faqs = await query.toArray();

        return res.status(200).json({
            success: true,
            count: faqs.length,
            data: faqs
        });
    } catch (error) {
        console.error("Get active FAQs error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get active FAQs"
        });
    }
};

// Get FAQ by ID
export const getFAQById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id || !ObjectId.isValid(id as string)) {
            return res.status(400).json({
                success: false,
                message: "Invalid FAQ ID"
            });
        }

        const db = getDB();

        const faq = await db.collection("faqs").findOne({ _id: new ObjectId(id as string) });

        if (!faq) {
            return res.status(404).json({
                success: false,
                message: "FAQ not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: faq
        });
    } catch (error) {
        console.error("Get FAQ by ID error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get FAQ"
        });
    }
};

// Update FAQ by ID
export const updateFAQ = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (!id || !ObjectId.isValid(id as string)) {
            return res.status(400).json({
                success: false,
                message: "Invalid FAQ ID"
            });
        }

        if (!updateData || typeof updateData !== 'object' || Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Request body is required and must contain update data"
            });
        }

        const db = getDB();

        // First check if FAQ exists
        const existingFAQ = await db.collection("faqs").findOne({ _id: new ObjectId(id as string) });

        if (!existingFAQ) {
            return res.status(404).json({
                success: false,
                message: "FAQ not found"
            });
        }

        // Remove fields that shouldn't be updated
        delete updateData._id;
        delete updateData.createdAt;

        // Add updated timestamp
        updateData.updatedAt = new Date();

        const result = await db.collection("faqs").updateOne(
            { _id: new ObjectId(id as string) },
            { $set: updateData }
        );

        // Get the updated document
        const updatedFAQ = await db.collection("faqs").findOne({ _id: new ObjectId(id as string) });

        return res.status(200).json({
            success: true,
            message: "FAQ updated successfully",
            data: updatedFAQ
        });
    } catch (error) {
        console.error("Update FAQ error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update FAQ",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};

// Delete FAQ by ID
export const deleteFAQ = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id || !ObjectId.isValid(id as string)) {
            return res.status(400).json({
                success: false,
                message: "Invalid FAQ ID"
            });
        }

        const db = getDB();

        const result = await db.collection("faqs").deleteOne({ _id: new ObjectId(id as string) });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "FAQ not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "FAQ deleted successfully",
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error("Delete FAQ error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete FAQ"
        });
    }
};

// Reorder FAQs
export const reorderFAQs = async (req: Request, res: Response) => {
    try {
        const { faqs } = req.body;

        if (!faqs || !Array.isArray(faqs)) {
            return res.status(400).json({
                success: false,
                message: "faqs array is required"
            });
        }

        const db = getDB();
        const bulkOps = faqs.map((faq: { _id: string; order: number }) => ({
            updateOne: {
                filter: { _id: new ObjectId(faq._id) },
                update: { $set: { order: faq.order, updatedAt: new Date() } }
            }
        }));

        await db.collection("faqs").bulkWrite(bulkOps);

        return res.status(200).json({
            success: true,
            message: "FAQs reordered successfully"
        });
    } catch (error) {
        console.error("Reorder FAQs error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to reorder FAQs",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
