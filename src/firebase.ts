import admin from 'firebase-admin'
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import * as fs from 'fs'
import * as path from 'path'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    let serviceAccount;

    // Try environment variable first (for Vercel deployment)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      // Fallback to local file (for development)
      const serviceAccountPath = path.join(__dirname, 'config', 'firebase-service-account.json')
      if (fs.existsSync(serviceAccountPath)) {
        serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'))
      }
    }

    if (serviceAccount) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
      console.log('Firebase initialized successfully')
    } else {
      console.warn('No Firebase credentials found')
    }
  } catch (error) {
    console.error('Firebase init failed:', error)
  }
}

export const auth = admin.auth()
export const firestore = admin.firestore()

export function signSessionToken(uid: string) {
  return jwt.sign({ uid }, JWT_SECRET, { expiresIn: '7d' })
}

export async function verifyIdTokenMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader) return next()

  const match = authHeader.match(/Bearer\s+(.*)/i)
  if (!match) return next()

  try {
    const decoded = await auth.verifyIdToken(match[1])
    ;(req as any).firebaseUser = decoded
    next()
  } catch (err: any) {
    res.status(401).json({ error: 'Invalid token' })
  }
}

export function cookieAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  const token = (req as any).cookies?.session
  if (!token) return next()

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    ;(req as any).sessionUser = { uid: decoded.uid }
  } catch (err) {
    ;(req as any).sessionUser = undefined
  }
  next()
}

export default admin
