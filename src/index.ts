import dotenv from 'dotenv'
dotenv.config()

import express, { Request, Response } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { verifyIdTokenMiddleware, cookieAuthMiddleware } from './firebase'
import { connectDb } from './db'
import { registerRoutes } from './routes'

const app = express()

const allowedOrigins = [
  'http://localhost:3000',
  'https://softstackagency.vercel.app',
  process.env.FRONTEND_URL
].filter((origin): origin is string => typeof origin === 'string');

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-secret']
}))

app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none')
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
  next()
})

app.use(express.json())
app.use(cookieParser())

const PORT = process.env.PORT || 5000

let dbInitialized = false
app.use(async (req, res, next) => {
  if (!dbInitialized) {
    try {
      await connectDb()
      dbInitialized = true
    } catch (err) {
      console.error('DB init failed:', err)
    }
  }
  next()
})

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

app.use(verifyIdTokenMiddleware)
app.use(cookieAuthMiddleware)
registerRoutes(app)

app.get('/', (_req: Request, res: Response) => {
  res.send('Server running')
})

if (process.env.NODE_ENV !== 'production') {
  app.listen(Number(PORT), () => {
    console.log(`Server: http://localhost:${PORT}`)
  })
}



// Export for Vercel
export default app