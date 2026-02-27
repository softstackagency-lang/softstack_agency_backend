import { connectDb, getProductsCollection } from './db'

const dummyProducts = [
  {
    name: 'Wireless Bluetooth Headphones',
    description: 'High-quality wireless headphones with noise cancellation and 30-hour battery life.',
    price: 79.99,
    category: 'Electronics',
    stock: 50,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
    createdBy: 'system',
  },
  {
    name: 'Smart Watch Pro',
    description: 'Fitness tracking smartwatch with heart rate monitor, GPS, and waterproof design.',
    price: 199.99,
    category: 'Electronics',
    stock: 30,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
    createdBy: 'system',
  },
  {
    name: 'Organic Cotton T-Shirt',
    description: 'Comfortable and eco-friendly cotton t-shirt available in multiple colors.',
    price: 24.99,
    category: 'Clothing',
    stock: 100,
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500',
    createdBy: 'system',
  },
  {
    name: 'Leather Messenger Bag',
    description: 'Premium genuine leather messenger bag perfect for work or travel.',
    price: 149.99,
    category: 'Accessories',
    stock: 25,
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500',
    createdBy: 'system',
  },
  {
    name: 'Stainless Steel Water Bottle',
    description: 'Insulated water bottle keeps drinks cold for 24h or hot for 12h. BPA-free.',
    price: 29.99,
    category: 'Home & Kitchen',
    stock: 75,
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500',
    createdBy: 'system',
  },
  {
    name: 'Yoga Mat Premium',
    description: 'Extra thick yoga mat with non-slip surface and carrying strap.',
    price: 39.99,
    category: 'Sports',
    stock: 60,
    imageUrl: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500',
    createdBy: 'system',
  },
  {
    name: 'Coffee Maker Deluxe',
    description: 'Programmable coffee maker with 12-cup capacity and auto-shutoff feature.',
    price: 89.99,
    category: 'Home & Kitchen',
    stock: 40,
    imageUrl: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=500',
    createdBy: 'system',
  },
  {
    name: 'Running Shoes Ultra',
    description: 'Lightweight running shoes with superior cushioning and breathable mesh.',
    price: 119.99,
    category: 'Sports',
    stock: 45,
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500',
    createdBy: 'system',
  },
  {
    name: 'Wireless Gaming Mouse',
    description: 'Ergonomic gaming mouse with customizable RGB lighting and 6 programmable buttons.',
    price: 59.99,
    category: 'Electronics',
    stock: 55,
    imageUrl: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=500',
    createdBy: 'system',
  },
  {
    name: 'Plant-Based Protein Powder',
    description: 'Organic vegan protein powder with 20g protein per serving. Chocolate flavor.',
    price: 34.99,
    category: 'Health',
    stock: 80,
    imageUrl: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=500',
    createdBy: 'system',
  },
]

async function seedProducts() {
  try {
    await connectDb()
    console.log('Connected to database')

    // Clear existing products (optional)
    const existingCount = await getProductsCollection().countDocuments()
    console.log(`Found ${existingCount} existing products`)

    // Add timestamps to products
    const productsWithTimestamps = dummyProducts.map(p => ({
      ...p,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))

    // Insert dummy products
    const result = await getProductsCollection().insertMany(productsWithTimestamps)
    console.log(`✅ Successfully added ${result.insertedCount} dummy products!`)

    process.exit(0)
  } catch (error) {
    console.error('Error seeding products:', error)
    process.exit(1)
  }
}

seedProducts()
