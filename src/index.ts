import dotenv from 'dotenv'

// Load environment variables FIRST before any other imports
dotenv.config()

// Validate environment variables early
import { validateEnvironmentVariables } from './utils/validateFirebase'

let envError: string | null = null;
try {
  validateEnvironmentVariables()
} catch (error) {
  envError = error instanceof Error ? error.message : 'Unknown environment configuration error';
  console.error('\n❌ Environment Configuration Error:')
  console.error(envError)
  console.error('\nPlease check your Vercel/Environment variables and ensure all required variables are set.')
  console.error('See .env.example for reference.\n')
  // Do NOT process.exit(1) in serverless environments as it crashes the instance immediately
  // We will handle this error during request time or in the initialization block
}

import express, { Request, Response } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { verifyIdTokenMiddleware, cookieAuthMiddleware } from './firebase'
import { connectDb } from './db'
import { connectDB } from './config/db'
import { registerRoutes } from './routes'

const app = express()

// CORS configuration for Next.js client
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://agency-blue-two.vercel.app',
  process.env.FRONTEND_URL
].filter((origin): origin is string => typeof origin === 'string');

console.log('Allowed CORS origins:', allowedOrigins);

app.use(cors({
  origin: allowedOrigins,
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-admin-secret',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}))

// Security headers - Completely disable COOP for popup authentication
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none')
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
  next()
})

app.use(express.json())
app.use(cookieParser())

const PORT = process.env.PORT || 5000

// Initialize database connections
const initializeDatabases = async () => {
  try {
    await connectDb()
    console.log('MongoDB (Mongoose) connected')
  } catch (err) {
    console.error('Failed to connect to MongoDB (Mongoose)', err)
  }

  try {
    await connectDB()
    console.log('MongoDB (Native Driver) connected')
  } catch (err) {
    console.error('Failed to connect to MongoDB (Native Driver)', err)
  }
}

// For serverless (Vercel), initialize on first request
let dbInitialized = false
app.use(async (req, res, next) => {
  // If there was an environment error, report it
  if (envError) {
    return res.status(500).json({
      error: 'Environment Configuration Error',
      message: envError,
      hint: 'Check Vercel environment variables'
    });
  }

  if (!dbInitialized) {
    try {
      await initializeDatabases()
      dbInitialized = true
    } catch (err) {
      console.error('Database initialization failed:', err);
      // We don't return here so health checks might still work
    }
  }
  next()
})

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

// Apply Firebase ID token verification middleware
app.use(verifyIdTokenMiddleware)

// Apply cookie session middleware (must be before routes that need it)
app.use(cookieAuthMiddleware)

// Register all application routes
registerRoutes(app)

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.send('Express + TypeScript server')
})

// Start server only in development (not in Vercel)
if (process.env.NODE_ENV !== 'production') {
  app.listen(Number(PORT), () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

// Export for Vercel
export default app