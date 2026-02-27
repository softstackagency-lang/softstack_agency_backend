import { Request, Response } from 'express'
import { auth } from '../firebase'
import { getUsersCollection } from '../db'

/**
 * POST /api/create-user
 * Admin-only endpoint to create users via Firebase Admin SDK
 */
export async function createUser(req: Request, res: Response) {
  const adminSecretEnv = process.env.ADMIN_SECRET
  const headerSecret = (req.headers['x-admin-secret'] as string) || undefined

  const firebaseUser = (req as any).firebaseUser
  const hasAdminClaim = !!(firebaseUser && firebaseUser.admin === true)
  const hasHeaderSecret = !!(headerSecret && adminSecretEnv && headerSecret === adminSecretEnv)

  if (!hasAdminClaim && !hasHeaderSecret) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const { email, password, displayName, phoneNumber, photoURL, disabled, uid, customClaims } = req.body
  if (!email && !phoneNumber && !uid) {
    return res.status(400).json({ error: 'email or phoneNumber or uid required' })
  }

  try {
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      phoneNumber,
      photoURL,
      disabled,
      uid,
    })

    if (customClaims && typeof customClaims === 'object') {
      await auth.setCustomUserClaims(userRecord.uid, customClaims)
    }

    // upsert user into MongoDB so profile is stored
    try {
      await getUsersCollection().updateOne(
        { firebaseUid: userRecord.uid },
        {
          $set: {
            firebaseUid: userRecord.uid,
            email: userRecord.email || email,
            displayName: userRecord.displayName || displayName || '',
            phoneNumber: userRecord.phoneNumber || phoneNumber || '',
            photoURL: userRecord.photoURL || photoURL || '',
            updatedAt: new Date()
          },
          $setOnInsert: {
            role: 'user',
            status: 'active',
            termsAccepted: true,
            createdAt: new Date()
          }
        },
        { upsert: true }
      )
    } catch (dbErr) {
      console.error('Failed to upsert user to MongoDB on admin create:', dbErr)
    }

    return res.status(201).json({ uid: userRecord.uid, email: userRecord.email })
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
}
