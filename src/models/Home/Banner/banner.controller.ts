import { Request, Response } from "express";
import { getDB } from "../../../config/db";
import { ObjectId } from "mongodb";
import { HeroBanner } from "./banner.model";

// Create a new banner
export const createBanner = async (req: Request, res: Response) => {
    try {
        const db = getDB();

        // Support both formats: direct fields or nested under heroBanner
        const data = req.body.heroBanner || req.body;

        const {
            badge,
            title,
            description,
            ctaButtons,
            images,
            layout,
            isActive
        } = data;



        // If this banner is set to active, deactivate all other banners
        if (isActive) {
            await db.collection("home_banners").updateMany(
                { isActive: true },
                { $set: { isActive: false, updatedAt: new Date() } }
            );
        }

        const banner: HeroBanner = {
            badge,
            title: {
                highlight: title.highlight,
                text: title.text
            },
            description,
            ctaButtons: ctaButtons || [],
            images: images || [],
            layout: layout || "grid-5",
            isActive: isActive !== undefined ? isActive : true,
            createdAt: new Date()
        };

        const result = await db.collection("home_banners").insertOne(banner);

        return res.status(201).json({
            success: true,
            message: "Banner created successfully",
            data: { ...banner, _id: result.insertedId }
        });
    } catch (error) {
        console.error("Create banner error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create banner",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};

// Get the active banner (public endpoint)
export const getBanner = async (req: Request, res: Response) => {
    try {
        const db = getDB();

        const banner = await db.collection("home_banners").findOne({ isActive: true });

        if (!banner) {
            return res.status(404).json({
                success: false,
                message: "No active banner found"
            });
        }

        return res.status(200).json({
            success: true,
            data: banner
        });
    } catch (error) {
        console.error("Get banner error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get banner"
        });
    }
};

// Get all banners (admin only)
export const getAllBanners = async (req: Request, res: Response) => {
    try {
        const db = getDB();
        const { isActive, limit, skip } = req.query;

        // Build filter object
        const filter: any = {};
        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        // Build query with pagination
        let query = db.collection("home_banners").find(filter).sort({ createdAt: -1 });

        if (skip) query = query.skip(Number(skip));
        if (limit) query = query.limit(Number(limit));

        const banners = await query.toArray();
        const totalCount = await db.collection("home_banners").countDocuments(filter);

        return res.status(200).json({
            success: true,
            count: banners.length,
            totalCount,
            data: banners,
            pagination: {
                skip: Number(skip) || 0,
                limit: Number(limit) || banners.length,
                hasMore: (Number(skip) || 0) + banners.length < totalCount
            }
        });
    } catch (error) {
        console.error("Get all banners error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get banners"
        });
    }
};

// Update banner by ID
export const updateBanner = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (!id || !ObjectId.isValid(id as string)) {
            return res.status(400).json({
                success: false,
                message: "Invalid banner ID"
            });
        }

        if (!updateData || typeof updateData !== 'object' || Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Request body is required and must contain update data"
            });
        }

        const db = getDB();

        // First check if banner exists
        const existingBanner = await db.collection("home_banners").findOne({ _id: new ObjectId(id as string) });

        if (!existingBanner) {
            return res.status(404).json({
                success: false,
                message: "Banner not found"
            });
        }

        // If updating to active, deactivate all other banners
        if (updateData.isActive === true) {
            await db.collection("home_banners").updateMany(
                { _id: { $ne: new ObjectId(id as string) }, isActive: true },
                { $set: { isActive: false, updatedAt: new Date() } }
            );
        }

        // Remove fields that shouldn't be updated
        delete updateData._id;
        delete updateData.createdAt;

        // Add updated timestamp
        updateData.updatedAt = new Date();

        const result = await db.collection("home_banners").updateOne(
            { _id: new ObjectId(id as string) },
            { $set: updateData }
        );

        // Get the updated document
        const updatedBanner = await db.collection("home_banners").findOne({ _id: new ObjectId(id as string) });

        return res.status(200).json({
            success: true,
            message: "Banner updated successfully",
            data: updatedBanner
        });
    } catch (error) {
        console.error("Update banner error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update banner",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};

// Delete banner by ID
export const deleteBanner = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id || !ObjectId.isValid(id as string)) {
            return res.status(400).json({
                success: false,
                message: "Invalid banner ID"
            });
        }

        const db = getDB();

        const result = await db.collection("home_banners").deleteOne({ _id: new ObjectId(id as string) });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Banner not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Banner deleted successfully",
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error("Delete banner error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete banner"
        });
    }
};
