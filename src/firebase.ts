import admin from 'firebase-admin'
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { validateFirebaseServiceAccount, FirebaseValidationError } from './utils/validateFirebase'
import * as fs from 'fs'
import * as path from 'path'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'
if (!process.env.JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.warn('Warning: using default JWT_SECRET. Set JWT_SECRET in production.')
}

// Initialize Firebase Admin with validation
if (!admin.apps.length) {
  try {
    let serviceAccount: any;

    // Check if we're in production (Vercel) or development
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Production: Use environment variable
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      } catch (error) {
        throw new FirebaseValidationError(
          'Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable. Must be valid JSON.'
        )
      }
    } else {
      // Development: Use local JSON file
      const serviceAccountPath = path.join(__dirname, 'config', 'firebase-service-account.json')

      if (!fs.existsSync(serviceAccountPath)) {
        throw new FirebaseValidationError(
          `Firebase service account file not found at: ${serviceAccountPath}\n` +
          'Please download the service account JSON from Firebase Console:\n' +
          '1. Go to Firebase Console > Project Settings > Service Accounts\n' +
          '2. Click "Generate New Private Key"\n' +
          '3. Save the file as src/config/firebase-service-account.json'
        )
      }

      try {
        const fileContent = fs.readFileSync(serviceAccountPath, 'utf-8')
        serviceAccount = JSON.parse(fileContent)
      } catch (error) {
        throw new FirebaseValidationError(
          `Failed to read or parse firebase-service-account.json: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    // Validate the service account structure and content
    validateFirebaseServiceAccount(serviceAccount)

    // Initialize Firebase Admin
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })

    console.log(`✓ Firebase Admin initialized successfully for project: ${serviceAccount.project_id}`)
  } catch (error) {
    if (error instanceof FirebaseValidationError) {
      console.error('\n❌ Firebase Configuration Error:')
      console.error(error.message)
      console.error('\nThe application cannot start without valid Firebase credentials.')
      throw error
    }
    throw error
  }
}

export const auth = admin.auth()
export const firestore = admin.firestore()

export function signSessionToken(uid: string) {
  return jwt.sign({ uid }, JWT_SECRET, { expiresIn: '7d' })
}

// Middleware to verify Firebase ID Token sent in Authorization: Bearer <token>
export async function verifyIdTokenMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || ''
  const match = authHeader.match(/Bearer\s+(.*)/i)

  if (!match) {
    console.log('No Bearer token found in Authorization header');
    return next();
  }

  const idToken = match[1]
  console.log('Verifying Firebase ID token...');

  try {
    const decoded = await auth.verifyIdToken(idToken, true)
    console.log('✅ Token verified successfully:', { uid: decoded.uid, email: decoded.email });
    ;(req as any).firebaseUser = decoded
    return next()
  } catch (err: any) {
    console.error('❌ Token verification failed:', err.code, err.message);
    if (err && (err.code === 'auth/id-token-revoked' || err.code === 'auth/token-revoked')) {
      return res.status(401).json({ error: 'Token revoked. Please reauthenticate.' })
    }
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

// Cookie auth middleware: verifies `session` cookie JWT and attaches `req.sessionUser`
export function cookieAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  const token = (req as any).cookies && (req as any).cookies.session
  if (!token) return next()
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    ;(req as any).sessionUser = { uid: decoded.uid }
    return next()
  } catch (err) {
    ;(req as any).sessionUser = undefined
    return next()
  }
}

export default admin
