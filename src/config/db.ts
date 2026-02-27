import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;

let db: Db | null = null;
let client: MongoClient | null = null;

// Connect using MongoDB native driver
export const connectDB = async (): Promise<Db> => {
  if (db) {
    return db;
  }

  try {
    client = new MongoClient(MONGODB_URI, {
      tls: true,
      tlsAllowInvalidCertificates: false,
      serverSelectionTimeoutMS: 5000,
    });
    await client.connect();
    db = client.db();
    console.log("MongoDB (native driver) connected successfully");
    return db;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
};

// Get the database instance
export const getDB = (): Db => {
  if (!db) {
    throw new Error("Database not initialized. Call connectDB first.");
  }
  return db;
};

// Close connection
export const closeDB = async (): Promise<void> => {
  if (client) {
    await client.close();
    db = null;
    client = null;
    console.log("MongoDB connection closed");
  }
};

