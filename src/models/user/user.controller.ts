import { Request, Response } from "express";
import { getDB } from "../../config/db";
import { ObjectId } from "mongodb";


// Get all users
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const db = getDB();
    const users = await db.collection("users").find().toArray();

    console.log('📊 getAllUsers found', users.length, 'users');
    console.log('📋 Sample user:', users[0] ? JSON.stringify(users[0], null, 2) : 'No users');

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error("Get all users error:", error);
    return res.status(500).json({ message: "Failed to get users" });
  }
};

// Get user by ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log('🔍 getUserById called with id:', id);

    if (!id) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const db = getDB();

    // Try to find by _id first (MongoDB primary key)
    let user = null;
    if (ObjectId.isValid(id as string)) {
      user = await db.collection("users").findOne({ _id: new ObjectId(id as string) });
      console.log('🔎 Search by _id result:', user ? 'Found' : 'Not found');
    }

    // Fallback to firebaseUid for backward compatibility
    if (!user) {
      user = await db.collection("users").findOne({ firebaseUid: id });
      console.log('🔎 Search by firebaseUid result:', user ? 'Found' : 'Not found');
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Debug: Log what we found in the database
    console.log('📊 Raw user data from DB:', JSON.stringify(user, null, 2));

    // Map to complete user data structure
    const completeUserData = {
      _id: user._id,
      uid: user.firebaseUid || user.uid,
      firebaseUid: user.firebaseUid || user.uid,
      name: user.displayName || user.name || '',
      displayName: user.displayName || user.name || '',
      email: user.email || '',
      phone: user.phoneNumber || user.phone || '',
      phoneNumber: user.phoneNumber || user.phone || '',
      address: user.address || '',
      image: user.photoURL || user.image || '',
      photoURL: user.photoURL || user.image || '',
      provider: user.provider || 'email',
      role: user.role || 'user',
      status: user.status || 'active',
      termsAccepted: user.termsAccepted || false,
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: user.updatedAt || new Date().toISOString(),
    };

    console.log('✅ Sending complete user data with', Object.keys(completeUserData).length, 'fields');

    return res.status(200).json({
      success: true,
      data: completeUserData,
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    return res.status(500).json({ message: "Failed to get user" });
  }
};

// Update user
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, displayName, email, phone, phoneNumber, address, image, photoURL, provider, role, status } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const db = getDB();

    // Find user by _id first, then firebaseUid
    let user = null;
    if (ObjectId.isValid(id as string)) {
      user = await db.collection("users").findOne({ _id: new ObjectId(id as string) });
    }
    if (!user) {
      user = await db.collection("users").findOne({ firebaseUid: id });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Build update object dynamically with proper field mapping
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (displayName || name) updateData.displayName = displayName || name;
    if (email) updateData.email = email;
    if (phoneNumber || phone) updateData.phoneNumber = phoneNumber || phone;
    if (address) updateData.address = address;
    if (photoURL || image) updateData.photoURL = photoURL || image;
    if (provider) updateData.provider = provider;
    if (role) updateData.role = role;
    if (status) updateData.status = status;

    const filter = user._id ? { _id: user._id } : { firebaseUid: id };
    const result = await db.collection("users").updateOne(
      filter,
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get the updated user
    const updatedUser = await db.collection("users").findOne(filter);

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update user error:", error);
    return res.status(500).json({ message: "Failed to update user" });
  }
};

// Delete user
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const db = getDB();

    // Find user by _id first, then firebaseUid
    let user = null;
    if (ObjectId.isValid(id as string)) {
      user = await db.collection("users").findOne({ _id: new ObjectId(id as string) });
    }
    if (!user) {
      user = await db.collection("users").findOne({ firebaseUid: id });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete using the filter that found the user
    const filter = user._id ? { _id: user._id } : { firebaseUid: id };
    const result = await db.collection("users").deleteOne(filter);

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({ message: "Failed to delete user" });
  }
};

// Update user status (Admin only)
export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate user ID
    if (!id) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Validate status
    const validStatuses = ['active', 'inactive', 'suspended', 'pending'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Must be one of: active, inactive, suspended, pending"
      });
    }

    const db = getDB();

    // Check if user exists - try _id first, then firebaseUid for backward compatibility
    let existingUser = null;
    if (ObjectId.isValid(id as string)) {
      existingUser = await db.collection("users").findOne({ _id: new ObjectId(id as string) });
    }
    if (!existingUser) {
      existingUser = await db.collection("users").findOne({ firebaseUid: id });
    }
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user status using _id
    const filter = existingUser._id ? { _id: existingUser._id } : { firebaseUid: id };
    const result = await db.collection("users").findOneAndUpdate(
      filter,
      {
        $set: {
          status: status,
          updatedAt: new Date()
        }
      },
      { returnDocument: "after" }
    );

    return res.status(200).json({
      success: true,
      message: "User status updated successfully",
      data: {
        _id: result?.value?._id,
        name: result?.value?.name,
        email: result?.value?.email,
        role: result?.value?.role,
        status: result?.value?.status,
        updatedAt: result?.value?.updatedAt
      },
    });
  } catch (error) {
    console.error("Update user status error:", error);
    return res.status(500).json({ message: "Failed to update user status" });
  }
};

// Get all users with their status (Admin only)
export const getAllUsersWithStatus = async (req: Request, res: Response) => {
  try {
    const db = getDB();

    // Get query parameters for filtering
    const { status, role } = req.query;

    console.log('🔍 getAllUsersWithStatus called with filters:', { status, role });

    // Build filter object
    const filter: any = {};
    if (status && typeof status === 'string') {
      filter.status = status;
    }
    if (role && typeof role === 'string') {
      filter.role = role;
    }

    // Fetch users with projection (only id and status)
    const users = await db.collection("users")
      .find(filter, {
        projection: {
          _id: 1,
          firebaseUid: 1,
          status: 1,
          role: 1
        }
      })
      .sort({ createdAt: -1 })
      .toArray();

    console.log('📊 Found', users.length, 'users with status');
    console.log('📋 Sample user with status:', users[0] ? JSON.stringify(users[0], null, 2) : 'No users');

    // Add default status for users who don't have one
    const usersWithStatus = users.map(user => ({
      _id: user._id,
      uid: user.firebaseUid,
      firebaseUid: user.firebaseUid,
      status: user.status || 'active', // Default to active if no status
      role: user.role || 'user'
    }));

    return res.status(200).json({
      success: true,
      count: usersWithStatus.length,
      data: usersWithStatus,
      filters: {
        status: status || 'all',
        role: role || 'all'
      }
    });
  } catch (error) {
    console.error("Get all users with status error:", error);
    return res.status(500).json({ message: "Failed to get users" });
  }
};

// Get user status by ID (Admin only)
export const getUserStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const db = getDB();

    // Try _id first, then firebaseUid for backward compatibility
    let user = null;
    if (ObjectId.isValid(id as string)) {
      user = await db.collection("users").findOne(
        { _id: new ObjectId(id as string) },
        {
          projection: {
            _id: 1,
            firebaseUid: 1,
            status: 1
          }
        }
      );
    }

    if (!user) {
      user = await db.collection("users").findOne(
        { firebaseUid: id },
        {
          projection: {
            _id: 1,
            firebaseUid: 1,
            status: 1
          }
        }
      );
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        uid: user.firebaseUid,
        status: user.status || 'active' // Default to active if no status
      }
    });
  } catch (error) {
    console.error("Get user status error:", error);
    return res.status(500).json({ message: "Failed to get user status" });
  }
};

// Get all users with their roles (Admin only)
export const getAllUsersWithRole = async (req: Request, res: Response) => {
  try {
    const db = getDB();

    // Get query parameters for filtering
    const { role, status } = req.query;

    // Build filter object
    const filter: any = {};
    if (role && typeof role === 'string') {
      filter.role = role;
    }
    if (status && typeof status === 'string') {
      filter.status = status;
    }

    // Fetch users with projection (only id and role)
    const users = await db.collection("users")
      .find(filter, {
        projection: {
          _id: 1,
          firebaseUid: 1,
          role: 1
        }
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Add default role for users who don't have one
    const usersWithRole = users.map(user => ({
      _id: user._id,
      uid: user.firebaseUid,
      role: user.role || 'user' // Default to user if no role
    }));

    return res.status(200).json({
      success: true,
      count: usersWithRole.length,
      data: usersWithRole,
      filters: {
        role: role || 'all',
        status: status || 'all'
      }
    });
  } catch (error) {
    console.error("Get all users with role error:", error);
    return res.status(500).json({ message: "Failed to get users" });
  }
};

// Get user role by ID (Admin only)
export const getUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const db = getDB();

    // Try _id first, then firebaseUid for backward compatibility
    let user = null;
    if (ObjectId.isValid(id as string)) {
      user = await db.collection("users").findOne(
        { _id: new ObjectId(id as string) },
        {
          projection: {
            _id: 1,
            role: 1
          }
        }
      );
    }

    if (!user) {
      user = await db.collection("users").findOne(
        { firebaseUid: id },
        {
          projection: {
            _id: 1,
            role: 1
          }
        }
      );
    }    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        role: user.role || 'user' // Default to user if no role
      }
    });
  } catch (error) {
    console.error("Get user role error:", error);
    return res.status(500).json({ message: "Failed to get user role" });
  }
};

// Update user role (Admin only)
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Validate user ID
    if (!id) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Validate role
    const validRoles = ['admin', 'user', 'moderator'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        message: "Invalid role. Must be one of: admin, user, moderator"
      });
    }

    const db = getDB();

    // Check if user exists - try _id first, then firebaseUid for backward compatibility
    let existingUser = null;
    if (ObjectId.isValid(id as string)) {
      existingUser = await db.collection("users").findOne({ _id: new ObjectId(id as string) });
    }
    if (!existingUser) {
      existingUser = await db.collection("users").findOne({ firebaseUid: id });
    }
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user role using _id
    const filter = existingUser._id ? { _id: existingUser._id } : { firebaseUid: id };
    const result = await db.collection("users").findOneAndUpdate(
      filter,
      {
        $set: {
          role: role,
          updatedAt: new Date()
        }
      },
      { returnDocument: "after" }
    );

    return res.status(200).json({
      success: true,
      message: "User role updated successfully",
      data: {
        _id: result?.value?._id,
        role: result?.value?.role,
        updatedAt: result?.value?.updatedAt
      },
    });
  } catch (error) {
    console.error("Update user role error:", error);
    return res.status(500).json({ message: "Failed to update user role" });
  }
};