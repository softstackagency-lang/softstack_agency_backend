import { Request, Response } from 'express'
import { getProductsCollection } from '../db'
import { ObjectId } from 'mongodb'

/**
 * Check if request is authenticated
 */
function isAuthenticated(req: Request) {
  return Boolean((req as any).firebaseUser || (req as any).sessionUser)
}

/**
 * Get authenticated user ID
 */
function getUserId(req: Request): string | null {
  const firebaseUser = (req as any).firebaseUser
  const sessionUser = (req as any).sessionUser
  return firebaseUser?.uid || sessionUser?.uid || null
}

/**
 * GET /api/products
 * Get all products (public)
 */
export async function listProducts(req: Request, res: Response) {
  try {
    const { category, minPrice, maxPrice, search } = req.query

    // Build query
    const query: any = {}

    if (category) {
      query.category = category
    }

    if (minPrice || maxPrice) {
      query.price = {}
      if (minPrice) query.price.$gte = Number(minPrice)
      if (maxPrice) query.price.$lte = Number(maxPrice)
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ]
    }

    const products = await getProductsCollection()
      .find(query)
      .sort({ createdAt: -1 })
      .toArray()

    return res.json(products)
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
}

/**
 * GET /api/products/:id
 * Get single product by ID (public)
 */
export async function getProduct(req: Request, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const product = await getProductsCollection().findOne({ _id: new ObjectId(id) })

    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    return res.json(product)
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
}

/**
 * POST /api/products
 * Create new product (authenticated users only)
 */
export async function createProduct(req: Request, res: Response) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const userId = getUserId(req)
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { name, description, price, category, stock, imageUrl } = req.body

  if (!name || !description || !price || !category) {
    return res.status(400).json({ error: 'name, description, price, and category are required' })
  }

  try {
    const result = await getProductsCollection().insertOne({
      name,
      description,
      price: Number(price),
      category,
      stock: Number(stock) || 0,
      imageUrl: imageUrl || '',
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const product = await getProductsCollection().findOne({ _id: result.insertedId })
    return res.status(201).json(product)
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
}

/**
 * PUT /api/products/:id
 * Update product (owner or admin only)
 */
export async function updateProduct(req: Request, res: Response) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const userId = getUserId(req)
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const product = await getProductsCollection().findOne({ _id: new ObjectId(id) })

    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    // Check if user owns the product
    if (product.createdBy !== userId) {
      const firebaseUser = (req as any).firebaseUser
      const isAdmin = firebaseUser && firebaseUser.admin === true

      if (!isAdmin) {
        return res.status(403).json({ error: 'Forbidden - You can only edit your own products' })
      }
    }

    const { name, description, price, category, stock, imageUrl } = req.body

    // Build update object
    const updateDoc: any = { updatedAt: new Date() }
    if (name !== undefined) updateDoc.name = name
    if (description !== undefined) updateDoc.description = description
    if (price !== undefined) updateDoc.price = Number(price)
    if (category !== undefined) updateDoc.category = category
    if (stock !== undefined) updateDoc.stock = Number(stock)
    if (imageUrl !== undefined) updateDoc.imageUrl = imageUrl

    await getProductsCollection().updateOne(
      { _id: new ObjectId(id) },
      { $set: updateDoc }
    )

    const updatedProduct = await getProductsCollection().findOne({ _id: new ObjectId(id) })
    return res.json(updatedProduct)
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
}

/**
 * DELETE /api/products/:id
 * Delete product (owner or admin only)
 */
export async function deleteProduct(req: Request, res: Response) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const userId = getUserId(req)
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const product = await getProductsCollection().findOne({ _id: new ObjectId(id) })

    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    // Check if user owns the product
    if (product.createdBy !== userId) {
      const firebaseUser = (req as any).firebaseUser
      const isAdmin = firebaseUser && firebaseUser.admin === true

      if (!isAdmin) {
        return res.status(403).json({ error: 'Forbidden - You can only delete your own products' })
      }
    }

    await getProductsCollection().deleteOne({ _id: new ObjectId(id) })

    return res.json({ message: 'Product deleted successfully' })
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
}
