import { MongoClient, Db, Collection, ObjectId } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agency'

let db: Db | null = null
let client: MongoClient | null = null

export interface IUser {
  _id?: ObjectId
  firebaseUid: string
  email: string
  displayName: string
  phoneNumber?: string
  address?: string
  photoURL?: string
  role: 'user' | 'admin' | 'moderator'
  status: 'active' | 'inactive' | 'suspended' | 'pending'
  termsAccepted: boolean
  createdAt: Date
  updatedAt: Date
}

export interface IProduct {
  _id?: ObjectId
  name: string
  description: string
  price: number
  category: string
  stock: number
  imageUrl?: string
  createdBy: string // Firebase UID
  createdAt: Date
  updatedAt: Date
}

export interface IPasswordResetToken {
  _id?: ObjectId
  email: string
  token: string
  expiresAt: Date
  used: boolean
  createdAt: Date
}

export async function connectDb(): Promise<Db> {
  if (db) return db

  client = new MongoClient(MONGODB_URI, {
    tls: true,
    tlsAllowInvalidCertificates: false,
    serverSelectionTimeoutMS: 5000,
  })
  await client.connect()
  db = client.db()
  await createIndexes()
  return db
}
export function getDb(): Db {
  if (!db) {
    throw new Error('Database not initialized. Call connectDb first.')
  }
  return db
}

export function getUsersCollection(): Collection<IUser> {
  return getDb().collection<IUser>('users')
}

export function getProductsCollection(): Collection<IProduct> {
  return getDb().collection<IProduct>('products')
}

export function getPasswordResetTokensCollection(): Collection<IPasswordResetToken> {
  return getDb().collection<IPasswordResetToken>('passwordresettokens')
}

async function createIndexes() {
  const usersCol = getUsersCollection()
  await usersCol.createIndex({ firebaseUid: 1 }, { unique: true })
  await usersCol.createIndex({ email: 1 })

  const tokensCol = getPasswordResetTokensCollection()
  await tokensCol.createIndex({ email: 1 })
  await tokensCol.createIndex({ token: 1 }, { unique: true })
  await tokensCol.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
}

export async function upsertUserProfile(fields: {
  firebaseUid: string
  email: string
  displayName?: string
  phoneNumber?: string
  photoURL?: string
  address?: string
  role?: 'user' | 'admin' | 'moderator'
  status?: 'active' | 'inactive' | 'suspended' | 'pending'
  termsAccepted?: boolean
}) {
  const usersCol = getUsersCollection()
  const now = new Date()

  // Check if user exists
  const existingUser = await usersCol.findOne({ firebaseUid: fields.firebaseUid })

  const updateDoc: Partial<IUser> = {
    firebaseUid: fields.firebaseUid,
    email: fields.email,
    displayName: fields.displayName || '',
    phoneNumber: fields.phoneNumber || '',
    address: fields.address || '',
    photoURL: fields.photoURL || '',
    // Only set role if it's explicitly provided OR if user doesn't exist
    ...(fields.role ? { role: fields.role } : existingUser ? {} : { role: 'user' }),
    // Only set status if it's explicitly provided OR if user doesn't exist
    ...(fields.status ? { status: fields.status } : existingUser ? {} : { status: 'active' }),
    termsAccepted: fields.termsAccepted !== undefined ? fields.termsAccepted : false,
    updatedAt: now,
  }

  return usersCol.updateOne(
    { firebaseUid: fields.firebaseUid },
    {
      $set: updateDoc,
      $setOnInsert: { createdAt: now }
    },
    { upsert: true }
  )
}

export const User = {
  findOne: (query: any) => getUsersCollection().findOne(query),
  find: (query: any) => getUsersCollection().find(query),
  updateOne: (filter: any, update: any, options?: any) => getUsersCollection().updateOne(filter, update, options),
  create: (doc: any) => getUsersCollection().insertOne(doc),
  deleteOne: (filter: any) => getUsersCollection().deleteOne(filter),
}

export const Product = {
  findOne: (query: any) => getProductsCollection().findOne(query),
  find: (query: any) => getProductsCollection().find(query),
  updateOne: (filter: any, update: any, options?: any) => getProductsCollection().updateOne(filter, update, options),
  create: (doc: any) => getProductsCollection().insertOne(doc),
  deleteOne: (filter: any) => getProductsCollection().deleteOne(filter),
}

export const PasswordResetToken = {
  findOne: (query: any) => getPasswordResetTokensCollection().findOne(query),
  find: (query: any) => getPasswordResetTokensCollection().find(query),
  updateOne: (filter: any, update: any, options?: any) => getPasswordResetTokensCollection().updateOne(filter, update, options),
  create: (doc: any) => getPasswordResetTokensCollection().insertOne(doc),
  deleteOne: (filter: any) => getPasswordResetTokensCollection().deleteOne(filter),
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.close()
    db = null
    client = null
  }
}
