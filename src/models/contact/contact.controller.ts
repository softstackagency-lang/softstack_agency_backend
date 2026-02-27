import { Request, Response } from "express";
import { getDB } from "../../config/db";
import { ObjectId } from "mongodb";
import { Contact } from "./contact.model";

// Submit a contact form (public endpoint)
export const createContact = async (req: Request, res: Response) => {
    try {
        const db = getDB();
        const { name, email, phone, subject, message } = req.body;

        // Validate required fields
        if (!name || !email || !phone || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: "All fields are required: name, email, phone, subject, and message"
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }

        // Validate phone (basic validation)
        if (phone.length < 10) {
            return res.status(400).json({
                success: false,
                message: "Invalid phone number"
            });
        }

        const contact: Contact = {
            name,
            email,
            phone,
            subject,
            message,
            status: "new",
            createdAt: new Date()
        };

        const result = await db.collection("contacts").insertOne(contact);

        return res.status(201).json({
            success: true,
            message: "Contact form submitted successfully. We'll get back to you soon!",
            data: { ...contact, _id: result.insertedId }
        });
    } catch (error) {
        console.error("Create contact error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to submit contact form",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};

// Get all contacts with filtering and pagination (admin only)
export const getAllContacts = async (req: Request, res: Response) => {
    try {
        const db = getDB();
        const {
            status,
            startDate,
            endDate,
            limit,
            skip,
            sortBy = "createdAt",
            sortOrder = "desc"
        } = req.query;

        // Build filter object
        const filter: any = {};

        if (status) {
            filter.status = status;
        }

        // Date range filter
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate as string);
            }
            if (endDate) {
                filter.createdAt.$lte = new Date(endDate as string);
            }
        }

        // Build sort object
        const sort: any = {};
        sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

        // Build query with pagination
        let query = db.collection("contacts").find(filter).sort(sort);

        if (skip) query = query.skip(Number(skip));
        if (limit) query = query.limit(Number(limit));

        const contacts = await query.toArray();
        const totalCount = await db.collection("contacts").countDocuments(filter);

        // Count by status
        const newCount = await db.collection("contacts").countDocuments({ status: "new" });
        const readCount = await db.collection("contacts").countDocuments({ status: "read" });
        const repliedCount = await db.collection("contacts").countDocuments({ status: "replied" });
        const archivedCount = await db.collection("contacts").countDocuments({ status: "archived" });

        return res.status(200).json({
            success: true,
            count: contacts.length,
            totalCount,
            statusCounts: {
                new: newCount,
                read: readCount,
                replied: repliedCount,
                archived: archivedCount
            },
            data: contacts,
            pagination: {
                skip: Number(skip) || 0,
                limit: Number(limit) || contacts.length,
                hasMore: (Number(skip) || 0) + contacts.length < totalCount
            }
        });
    } catch (error) {
        console.error("Get all contacts error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get contacts"
        });
    }
};

// Get a single contact by ID (admin only)
export const getContactById = async (req: Request, res: Response) => {
    try {
        const db = getDB();
        const { id } = req.params;
        const contactId = id as string;

        if (!ObjectId.isValid(contactId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid contact ID"
            });
        }

        const contact = await db.collection("contacts").findOne({ _id: new ObjectId(contactId) });

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: "Contact not found"
            });
        }

        // Mark as read if status is "new"
        if (contact.status === "new") {
            await db.collection("contacts").updateOne(
                { _id: new ObjectId(contactId) },
                {
                    $set: {
                        status: "read",
                        readAt: new Date()
                    }
                }
            );
            contact.status = "read";
            contact.readAt = new Date();
        }

        return res.status(200).json({
            success: true,
            data: contact
        });
    } catch (error) {
        console.error("Get contact by ID error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get contact"
        });
    }
};

// Update contact status (admin only)
export const updateContactStatus = async (req: Request, res: Response) => {
    try {
        const db = getDB();
        const { id } = req.params;
        const contactId = id as string;
        const { status } = req.body;

        if (!ObjectId.isValid(contactId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid contact ID"
            });
        }

        const validStatuses = ["new", "read", "replied", "archived"];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status. Must be one of: new, read, replied, archived"
            });
        }

        const updateData: any = { status };

        // Set appropriate timestamp based on status
        if (status === "read" && !await db.collection("contacts").findOne({ _id: new ObjectId(contactId), readAt: { $exists: true } })) {
            updateData.readAt = new Date();
        }
        if (status === "replied") {
            updateData.repliedAt = new Date();
        }

        const result = await db.collection("contacts").updateOne(
            { _id: new ObjectId(contactId) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Contact not found"
            });
        }

        const updatedContact = await db.collection("contacts").findOne({ _id: new ObjectId(contactId) });

        return res.status(200).json({
            success: true,
            message: "Contact status updated successfully",
            data: updatedContact
        });
    } catch (error) {
        console.error("Update contact status error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update contact status"
        });
    }
};

// Delete a contact (admin only)
export const deleteContact = async (req: Request, res: Response) => {
    try {
        const db = getDB();
        const { id } = req.params;
        const contactId = id as string;

        if (!ObjectId.isValid(contactId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid contact ID"
            });
        }

        const result = await db.collection("contacts").deleteOne({ _id: new ObjectId(contactId) });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Contact not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Contact deleted successfully"
        });
    } catch (error) {
        console.error("Delete contact error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete contact"
        });
    }
};

// Delete multiple contacts (admin only)
export const deleteMultipleContacts = async (req: Request, res: Response) => {
    try {
        const db = getDB();
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Contact IDs array is required"
            });
        }

        // Validate all IDs
        const objectIds = ids.map(id => {
            if (!ObjectId.isValid(id)) {
                throw new Error(`Invalid contact ID: ${id}`);
            }
            return new ObjectId(id);
        });

        const result = await db.collection("contacts").deleteMany({
            _id: { $in: objectIds }
        });

        return res.status(200).json({
            success: true,
            message: `${result.deletedCount} contact(s) deleted successfully`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error("Delete multiple contacts error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete contacts",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};

// Get contact statistics (admin only)
export const getContactStats = async (req: Request, res: Response) => {
    try {
        const db = getDB();

        const totalContacts = await db.collection("contacts").countDocuments();
        const newContacts = await db.collection("contacts").countDocuments({ status: "new" });
        const readContacts = await db.collection("contacts").countDocuments({ status: "read" });
        const repliedContacts = await db.collection("contacts").countDocuments({ status: "replied" });
        const archivedContacts = await db.collection("contacts").countDocuments({ status: "archived" });

        // Get contacts from last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentContacts = await db.collection("contacts").countDocuments({
            createdAt: { $gte: thirtyDaysAgo }
        });

        return res.status(200).json({
            success: true,
            data: {
                total: totalContacts,
                byStatus: {
                    new: newContacts,
                    read: readContacts,
                    replied: repliedContacts,
                    archived: archivedContacts
                },
                last30Days: recentContacts
            }
        });
    } catch (error) {
        console.error("Get contact stats error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get contact statistics"
        });
    }
};
