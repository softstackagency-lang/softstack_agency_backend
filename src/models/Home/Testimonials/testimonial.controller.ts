import { Request, Response } from "express";
import { getDB } from "../../../config/db";
import { ObjectId } from "mongodb";
import { Testimonial } from "./testimonial.model";

// Create a new testimonial
export const createTestimonial = async (req: Request, res: Response) => {
    try {
        const db = getDB();

        const {
            name,
            designation,
            company,
            rating,
            message,
            avatar,
            isFeatured
        } = req.body;

        // Validate required fields
        if (!name || !designation || !company || !rating || !message) {
            return res.status(400).json({
                success: false,
                message: "Required fields missing: name, designation, company, rating, and message are required"
            });
        }

        // Validate rating range
        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 5"
            });
        }

        const testimonial: Testimonial = {
            name,
            designation,
            company,
            rating,
            message,
            avatar: avatar || "",
            isFeatured: isFeatured !== undefined ? isFeatured : false,
            createdAt: new Date()
        };

        const result = await db.collection("testimonials").insertOne(testimonial);

        return res.status(201).json({
            success: true,
            message: "Testimonial created successfully",
            data: { ...testimonial, _id: result.insertedId }
        });
    } catch (error) {
        console.error("Create testimonial error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create testimonial",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};

// Get all testimonials (public endpoint)
export const getAllTestimonials = async (req: Request, res: Response) => {
    try {
        const db = getDB();
        const { isFeatured, rating, limit, skip } = req.query;

        // Build filter object
        const filter: any = {};

        if (isFeatured !== undefined) {
            filter.isFeatured = isFeatured === 'true';
        }

        if (rating) {
            filter.rating = Number(rating);
        }

        // Build query with pagination
        let query = db.collection("testimonials").find(filter).sort({ createdAt: -1 });

        if (skip) query = query.skip(Number(skip));
        if (limit) query = query.limit(Number(limit));

        const testimonials = await query.toArray();
        const totalCount = await db.collection("testimonials").countDocuments(filter);

        return res.status(200).json({
            success: true,
            count: testimonials.length,
            totalCount,
            data: testimonials,
            pagination: {
                skip: Number(skip) || 0,
                limit: Number(limit) || testimonials.length,
                hasMore: (Number(skip) || 0) + testimonials.length < totalCount
            }
        });
    } catch (error) {
        console.error("Get all testimonials error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get testimonials"
        });
    }
};

// Get featured testimonials (public endpoint)
export const getFeaturedTestimonials = async (req: Request, res: Response) => {
    try {
        const db = getDB();
        const { limit } = req.query;

        let query = db.collection("testimonials")
            .find({ isFeatured: true })
            .sort({ createdAt: -1 });

        if (limit) query = query.limit(Number(limit));

        const testimonials = await query.toArray();

        return res.status(200).json({
            success: true,
            count: testimonials.length,
            data: testimonials
        });
    } catch (error) {
        console.error("Get featured testimonials error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get featured testimonials"
        });
    }
};

// Get testimonial by ID
export const getTestimonialById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id || !ObjectId.isValid(id as string)) {
            return res.status(400).json({
                success: false,
                message: "Invalid testimonial ID"
            });
        }

        const db = getDB();

        const testimonial = await db.collection("testimonials").findOne({ _id: new ObjectId(id as string) });

        if (!testimonial) {
            return res.status(404).json({
                success: false,
                message: "Testimonial not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: testimonial
        });
    } catch (error) {
        console.error("Get testimonial by ID error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get testimonial"
        });
    }
};

// Update testimonial by ID
export const updateTestimonial = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (!id || !ObjectId.isValid(id as string)) {
            return res.status(400).json({
                success: false,
                message: "Invalid testimonial ID"
            });
        }

        if (!updateData || typeof updateData !== 'object' || Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Request body is required and must contain update data"
            });
        }

        // Validate rating if provided
        if (updateData.rating !== undefined && (updateData.rating < 1 || updateData.rating > 5)) {
            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 5"
            });
        }

        const db = getDB();

        // First check if testimonial exists
        const existingTestimonial = await db.collection("testimonials").findOne({ _id: new ObjectId(id as string) });

        if (!existingTestimonial) {
            return res.status(404).json({
                success: false,
                message: "Testimonial not found"
            });
        }

        // Remove fields that shouldn't be updated
        delete updateData._id;
        delete updateData.createdAt;

        // Add updated timestamp
        updateData.updatedAt = new Date();

        const result = await db.collection("testimonials").updateOne(
            { _id: new ObjectId(id as string) },
            { $set: updateData }
        );

        // Get the updated document
        const updatedTestimonial = await db.collection("testimonials").findOne({ _id: new ObjectId(id as string) });

        return res.status(200).json({
            success: true,
            message: "Testimonial updated successfully",
            data: updatedTestimonial
        });
    } catch (error) {
        console.error("Update testimonial error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update testimonial",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};

// Delete testimonial by ID
export const deleteTestimonial = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id || !ObjectId.isValid(id as string)) {
            return res.status(400).json({
                success: false,
                message: "Invalid testimonial ID"
            });
        }

        const db = getDB();

        const result = await db.collection("testimonials").deleteOne({ _id: new ObjectId(id as string) });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Testimonial not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Testimonial deleted successfully",
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error("Delete testimonial error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete testimonial"
        });
    }
};
