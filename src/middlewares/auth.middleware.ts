import { Request, Response, NextFunction } from "express";
import { getDB } from "../config/db";
import { ObjectId } from "mongodb";

// Extend Express Request type to include firebaseUser and sessionUser
declare global {
  namespace Express {
    interface Request {
      firebaseUser?: any;
      sessionUser?: any;
      user?: any;
    }
  }
}

// Check if user is authenticated via Firebase or session
function isAuthenticated(req: Request): boolean {
  return Boolean(req.firebaseUser || req.sessionUser);
}

// Get user from either Firebase or session
function getUser(req: Request): any {
  return req.firebaseUser || req.sessionUser;
}

// Fetch user role from database
async function getUserRole(userId: string): Promise<string | null> {
  try {
    const db = getDB();
    let user = null;

    // Try _id first, then firebaseUid
    if (ObjectId.isValid(userId)) {
      user = await db.collection("users").findOne({ _id: new ObjectId(userId) }, { projection: { role: 1 } });
    }
    if (!user) {
      user = await db.collection("users").findOne({ firebaseUid: userId }, { projection: { role: 1 } });
    }

    return user?.role || null;
  } catch (error) {
    console.error("Error fetching user role:", error);
    return null;
  }
}

// Verify token (works with Firebase middleware)
export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: "Authentication required" });
  }

  req.user = getUser(req);
  next();
};

// Optional token verification (doesn't fail if no token)
export const optionalToken = (req: Request, res: Response, next: NextFunction) => {
  if (isAuthenticated(req)) {
    req.user = getUser(req);
  }
  next();
};

// Require admin role
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const user = getUser(req);
  const userId = user.uid || user.user_id || user._id;

  // Fetch role from database
  const role = await getUserRole(userId);

  // Check admin from database role or custom claims
  if (role !== "admin" && user.role !== "admin" && !user.admin) {
    return res.status(403).json({ message: "Admin access required" });
  }

  req.user = { ...user, role: role || user.role };
  next();
};

// Require user role (any authenticated user)
export const requireUser = (req: Request, res: Response, next: NextFunction) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: "Authentication required" });
  }

  req.user = getUser(req);
  next();
};

// Require user or admin (for accessing own resources or admin access)
export const requireUserOrAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const user = getUser(req);
  const userId = req.params.id || req.params.uid;
  const currentUserId = user.uid || user.user_id || user._id;

  // Fetch role from database
  const role = await getUserRole(currentUserId);

  // Allow if user is admin or accessing their own resource
  if (role === "admin" || user.role === "admin" || user.admin || currentUserId === userId || user.uid === userId || user.user_id === userId) {
    req.user = { ...user, role: role || user.role };
    return next();
  }

  return res.status(403).json({ message: "Access denied" });
};
