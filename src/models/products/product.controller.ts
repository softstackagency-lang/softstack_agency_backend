import { Request, Response } from "express";
import { getDB } from "../../config/db";
import { ObjectId } from "mongodb";

// Create a new product


export const createProduct = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const { userId } = req.params; // Get userId from URL params

    const {
      slug,
      title,
      tagline,
      description,
      coverImage,
      badge,
      liveLink,
      repoLink,
      highlights,
      features,
      cta,
      theme,
      status,
      order,
    } = req.body;

    if (!slug || !title) {
      return res.status(400).json({ message: "Required fields missing: slug and title" });
    }

    if (!userId) {
      return res.status(400).json({ message: "User ID is required in URL" });
    }

    // Find user by _id first, then firebaseUid
    let user = null;
    if (ObjectId.isValid(userId as string)) {
      user = await db.collection("users").findOne({ _id: new ObjectId(userId as string) });
    }
    if (!user) {
      user = await db.collection("users").findOne({ firebaseUid: userId });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const product = {
      slug,
      title,
      tagline,
      description,
      coverImage,
      badge,
      liveLink,
      repoLink,
      highlights,
      features,
      cta,
      theme,
      status: status || "active",
      order: order || 0,
      postedBy: user._id, // Use MongoDB _id from authenticated user
      postedByUid: user.firebaseUid, // Store Firebase UID for reference
      createdAt: new Date(),
    };

    const result = await db.collection("products").insertOne(product);

    return res.status(201).json({
      success: true,
      data: { ...product, _id: result.insertedId },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to create product" });
  }
};

// Get all products
export const getAllProducts = async (_req: Request, res: Response) => {
  try {
    const db = getDB();

    const products = await db
      .collection("products")
      .aggregate([
        {
          $lookup: {
            from: "users",
            localField: "postedBy",
            foreignField: "_id",
            as: "postedBy",
          },
        },
        {
          $addFields: {
            postedBy: {
              $ifNull: [{ $arrayElemAt: ["$postedBy", 0] }, null]
            }
          }
        },
        {
          $sort: { order: 1, createdAt: -1 },
        },
      ])
      .toArray();

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Get all products error:", error);
    return res.status(500).json({ message: "Failed to fetch products" });
  }
};


// updated product
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || !ObjectId.isValid(id as string)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const db = getDB();

    const updateData: any = {
      ...req.body,
      updatedAt: new Date(),
    };

    delete updateData.postedBy;
    delete updateData._id;
    delete updateData.createdAt;

    const result = await db.collection("products").findOneAndUpdate(
      { _id: new ObjectId(id as string) },
      { $set: updateData },
      { returnDocument: "after" }
    );

    if (!result) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Update product error:", error);
    return res.status(500).json({ message: "Failed to update product" });
  }
};

// Delete product
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate product ID
    if (!id || !ObjectId.isValid(id as string)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const db = getDB();

    const result = await db.collection("products").deleteOne({
      _id: new ObjectId(id as string),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);
    return res.status(500).json({ message: "Failed to delete product" });
  }
};