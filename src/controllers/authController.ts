import { Request, Response } from 'express'
import { auth } from '../firebase'
import { getUsersCollection, upsertUserProfile, getPasswordResetTokensCollection } from '../db'
import axios from 'axios'
import { signSessionToken } from '../firebase'
import crypto from 'crypto'
import { sendPasswordResetEmail, sendPasswordResetConfirmationEmail } from '../emailService'

/**
 * POST /api/register-cookie
 * Register with email/password and set session cookie
 */
export async function registerWithCookie(req: Request, res: Response) {
  // Accept both 'name' and 'displayName' for compatibility
  const {
    email,
    password,
    name,
    displayName,
    phone,
    phoneNumber,
    address,
    image,
    photoURL,
    termsAccepted
  } = req.body

  // Use name or displayName (whichever is provided)
  const fullName = name || displayName
  const phoneNum = phone || phoneNumber
  const photo = image || photoURL

  // Debug logging
  console.log('📝 Registration request body:', {
    email: email ? '✅' : '❌',
    password: password ? '✅' : '❌',
    fullName: fullName ? '✅' : '❌',
    phoneNum: phoneNum ? '✅' : '❌',
    address: address ? '✅' : '❌',
    receivedFields: Object.keys(req.body)
  })

  // Validation
  if (!email || !password || !fullName) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'Email, password, and full name are required',
      code: 'MISSING_FIELDS'
    })
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'Invalid email format',
      message: 'Please provide a valid email address',
      code: 'INVALID_EMAIL'
    })
  }

  // Validate password strength
  if (password.length < 6) {
    return res.status(400).json({
      error: 'Weak password',
      message: 'Password must be at least 6 characters long',
      code: 'WEAK_PASSWORD'
    })
  }

  try {
    // Format phone number to E.164 if provided
    let formattedPhone: string | undefined = undefined
    if (phoneNum) {
      // If phone doesn't start with +, assume US number and add +1
      if (!phoneNum.startsWith('+')) {
        formattedPhone = `+1${phoneNum.replace(/\D/g, '')}`
      } else {
        formattedPhone = phoneNum.replace(/\D/g, '')
        formattedPhone = `+${formattedPhone}`
      }
    }

    // Create Firebase user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: fullName,
      phoneNumber: formattedPhone,
      photoURL: photo
    })

    const token = signSessionToken(userRecord.uid)

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    }

    // Create user profile in MongoDB
    try {
      await getUsersCollection().insertOne({
        firebaseUid: userRecord.uid,
        email: userRecord.email || email,
        displayName: userRecord.displayName || fullName,
        phoneNumber: formattedPhone || phoneNum || '',
        address: address || '',
        photoURL: photo || '',
        role: 'user', // Default role
        status: 'active',
        termsAccepted: true, // Auto-accept since user filled the form
        createdAt: new Date(),
        updatedAt: new Date()
      })
    } catch (dbErr) {
      console.error('Failed to create user in MongoDB on register:', dbErr)
      // Continue anyway - Firebase user is created
    }

    res.cookie('session', token, cookieOptions)
    return res.status(201).json({
      success: true,
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      role: 'user',
      message: 'User registered successfully'
    })
  } catch (err: any) {
    console.error('Registration error:', err)

    // Handle specific Firebase errors
    if (err.code === 'auth/email-already-exists') {
      return res.status(409).json({
        error: 'Email already exists',
        message: 'An account with this email already exists. Please login instead.',
        code: 'EMAIL_EXISTS'
      })
    }

    if (err.code === 'auth/invalid-email') {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'The email address is not valid',
        code: 'INVALID_EMAIL'
      })
    }

    if (err.code === 'auth/weak-password') {
      return res.status(400).json({
        error: 'Weak password',
        message: 'Password should be at least 6 characters',
        code: 'WEAK_PASSWORD'
      })
    }

    // Generic error
    return res.status(500).json({
      error: 'Registration failed',
      message: err.message || 'An error occurred during registration. Please try again.',
      code: 'REGISTRATION_ERROR'
    })
  }
}

/**
 * POST /api/login-cookie
 * Login with email/password and set session cookie
 */
export async function loginWithCookie(req: Request, res: Response) {
  const { email, password } = req.body

  // Validation
  if (!email || !password) {
    return res.status(400).json({
      error: 'Missing credentials',
      message: 'Email and password are required',
      code: 'MISSING_CREDENTIALS'
    })
  }

  const apiKey = process.env.FIREBASE_API_KEY
  if (!apiKey) {
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'Authentication service is not properly configured',
      code: 'CONFIG_ERROR'
    })
  }

  try {
    const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`
    const resp = await axios.post(signInUrl, { email, password, returnSecureToken: true })
    const idToken = resp.data.idToken

    // verify id token and issue our session cookie
    const decoded = await auth.verifyIdToken(idToken)
    const uid = decoded.uid

    // ensure user in DB (upsert)
    try {
      await getUsersCollection().updateOne(
        { firebaseUid: uid },
        {
          $set: {
            firebaseUid: uid,
            email,
            displayName: decoded.name || '',
            phoneNumber: decoded.phone_number || '',
            photoURL: decoded.picture || '',
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
      console.error('Failed to update user in MongoDB on login:', dbErr)
      // Continue anyway - authentication succeeded
    }

    const token = signSessionToken(uid)
    res.cookie('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    return res.json({
      success: true,
      uid,
      email,
      message: 'Login successful'
    })
  } catch (err: any) {
    console.error('Login error:', err)

    // Handle Axios errors from Firebase REST API
    if (err.response?.data) {
      const errorData = err.response.data.error

      if (errorData?.message === 'INVALID_LOGIN_CREDENTIALS' ||
          errorData?.message === 'EMAIL_NOT_FOUND' ||
          errorData?.message === 'INVALID_PASSWORD') {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'The email or password you entered is incorrect',
          code: 'INVALID_CREDENTIALS'
        })
      }

      if (errorData?.message === 'USER_DISABLED') {
        return res.status(403).json({
          error: 'Account disabled',
          message: 'This account has been disabled. Please contact support.',
          code: 'ACCOUNT_DISABLED'
        })
      }

      if (errorData?.message === 'TOO_MANY_ATTEMPTS_TRY_LATER') {
        return res.status(429).json({
          error: 'Too many attempts',
          message: 'Too many failed login attempts. Please try again later.',
          code: 'TOO_MANY_ATTEMPTS'
        })
      }
    }

    // Generic error
    return res.status(500).json({
      error: 'Login failed',
      message: err.message || 'An error occurred during login. Please try again.',
      code: 'LOGIN_ERROR'
    })
  }
}

/**
 * POST /api/google-login
 * Handle Google OAuth login
 */
export async function googleLogin(req: Request, res: Response) {
  const { idToken } = req.body

  if (!idToken) {
    return res.status(400).json({
      error: 'Missing token',
      message: 'ID token is required for Google login',
      code: 'MISSING_TOKEN'
    })
  }

  try {
    // Verify the Firebase ID token from Google sign-in
    const decoded = await auth.verifyIdToken(idToken)
    const uid = decoded.uid

    // Check if user exists in Firebase
    const userRecord = await auth.getUser(uid)

    // Upsert user profile to MongoDB
    try {
      await upsertUserProfile({
        firebaseUid: uid,
        email: userRecord.email || decoded.email || '',
        displayName: userRecord.displayName || decoded.name || '',
        phoneNumber: userRecord.phoneNumber || decoded.phone_number || '',
        photoURL: userRecord.photoURL || decoded.picture || '',
      })
    } catch (dbErr) {
      console.error('Failed to upsert user to MongoDB on Google login:', dbErr)
      // Continue anyway
    }

    // Create session token and set cookie
    const token = signSessionToken(uid)
    res.cookie('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    return res.json({
      success: true,
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      message: 'Google login successful'
    })
  } catch (err: any) {
    console.error('Google login error:', err)

    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please sign in again.',
        code: 'TOKEN_EXPIRED'
      })
    }

    if (err.code === 'auth/invalid-id-token') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Invalid authentication token. Please try again.',
        code: 'INVALID_TOKEN'
      })
    }

    if (err.code === 'auth/user-not-found') {
      return res.status(404).json({
        error: 'User not found',
        message: 'No account found with this Google account. Please register first.',
        code: 'USER_NOT_FOUND'
      })
    }

    return res.status(500).json({
      error: 'Google login failed',
      message: err.message || 'An error occurred during Google login. Please try again.',
      code: 'GOOGLE_LOGIN_ERROR'
    })
  }
}

/**
 * POST /api/google-register
 * Handle Google OAuth registration
 */
export async function googleRegister(req: Request, res: Response) {
  const { idToken } = req.body

  if (!idToken) {
    return res.status(400).json({
      error: 'Missing token',
      message: 'ID token is required for Google registration',
      code: 'MISSING_TOKEN'
    })
  }

  try {
    // Verify the Firebase ID token from Google sign-in
    const decoded = await auth.verifyIdToken(idToken)
    const uid = decoded.uid

    // Get user record from Firebase Auth
    const userRecord = await auth.getUser(uid)

    // Check if user already exists in MongoDB
    const existingUser = await getUsersCollection().findOne({ firebaseUid: uid })

    // Upsert user profile to MongoDB
    try {
      if (!existingUser) {
        // Create new user with role
        await getUsersCollection().insertOne({
          firebaseUid: uid,
          email: userRecord.email || decoded.email || '',
          displayName: userRecord.displayName || decoded.name || '',
          phoneNumber: userRecord.phoneNumber || decoded.phone_number || '',
          photoURL: userRecord.photoURL || decoded.picture || '',
          role: 'user', // Default role
          status: 'active',
          termsAccepted: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      } else {
        // Update existing user
        await getUsersCollection().updateOne(
          { firebaseUid: uid },
          {
            $set: {
              email: userRecord.email || decoded.email || '',
              displayName: userRecord.displayName || decoded.name || '',
              photoURL: userRecord.photoURL || decoded.picture || '',
              updatedAt: new Date()
            }
          }
        )
      }
    } catch (dbErr) {
      console.error('Failed to upsert user to MongoDB on Google register:', dbErr)
      // Continue anyway - Firebase user exists
    }

    // Create session token and set cookie
    const token = signSessionToken(uid)
    res.cookie('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    return res.status(existingUser ? 200 : 201).json({
      success: true,
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      role: 'user',
      isNewUser: !existingUser,
      message: existingUser ? 'Welcome back!' : 'Account created successfully'
    })
  } catch (err: any) {
    console.error('Google register error:', err)

    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please sign in again.',
        code: 'TOKEN_EXPIRED'
      })
    }

    if (err.code === 'auth/invalid-id-token') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Invalid authentication token. Please try again.',
        code: 'INVALID_TOKEN'
      })
    }

    return res.status(500).json({
      error: 'Google registration failed',
      message: err.message || 'An error occurred during Google registration. Please try again.',
      code: 'GOOGLE_REGISTER_ERROR'
    })
  }
}

/**
 * POST /api/logout
 * Clear session cookie
 */
export async function logout(_req: Request, res: Response) {
  res.clearCookie('session')
  return res.json({ ok: true })
}

/**
 * GET /api/profile
 * Get current user profile from Firebase token (accepts Authorization header)
 */
export async function getProfile(req: Request, res: Response) {
  console.log('\n=== GET /api/profile ===');
  console.log('Authorization header:', req.headers.authorization);

  const firebaseUser = (req as any).firebaseUser
  console.log('Firebase user:', firebaseUser ? { uid: firebaseUser.uid, email: firebaseUser.email } : 'NOT FOUND');

  if (!firebaseUser) {
    console.log('❌ No Firebase user found - returning 401');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Try to get user from MongoDB
    console.log('Fetching user from MongoDB with uid:', firebaseUser.uid);
    const user = await getUsersCollection().findOne({ firebaseUid: firebaseUser.uid })
    console.log('MongoDB user found:', user ? { uid: user.firebaseUid, email: user.email, role: user.role } : 'NOT FOUND');

    if (!user) {
      // User not in DB yet, return Firebase data only
      console.log('User not in DB, returning Firebase data only');
      return res.json({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.name || '',
        photoURL: firebaseUser.picture || '',
      })
    }

    // Return full profile from MongoDB
    const profileData = {
      uid: user.firebaseUid,
      email: user.email,
      displayName: user.displayName,
      phoneNumber: user.phoneNumber,
      photoURL: user.photoURL,
      role: user.role || 'user',
      createdAt: user.createdAt,
    };
    console.log('✅ Returning profile data:', profileData);
    return res.json(profileData);
  } catch (err) {
    console.error('❌ Error in getProfile:', err);
    return res.status(500).json({ error: (err as Error).message })
  }
}

/**
 * GET /api/me
 * Get current user profile from session cookie OR Firebase token (accepts both)
 */
export async function getMe(req: Request, res: Response) {
  const sessionUser = (req as any).sessionUser
  const firebaseUser = (req as any).firebaseUser

  const uid = sessionUser?.uid || firebaseUser?.uid

  if (!uid) {
    return res.status(401).json({ error: 'Unauthorized - No session or token provided' })
  }

  try {
    const user = await getUsersCollection().findOne({ firebaseUid: uid })

    if (!user) {
      // User not in DB yet
      return res.json({
        uid,
        email: firebaseUser?.email || '',
        displayName: firebaseUser?.name || '',
        photoURL: firebaseUser?.picture || '',
      })
    }

    return res.json({
      uid: user.firebaseUid,
      email: user.email,
      displayName: user.displayName,
      phoneNumber: user.phoneNumber,
      photoURL: user.photoURL,
      createdAt: user.createdAt,
    })
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
}

/**
 * POST /api/forgot-password
 * Send password reset email
 */
export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body

  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }

  try {
    // Check if user exists in Firebase
    let userRecord
    try {
      userRecord = await auth.getUserByEmail(email)
    } catch (error: any) {
      // For security, don't reveal if email exists or not
      return res.json({
        message: 'If an account exists with this email, a password reset link has been sent.'
      })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex')

    // Store token in database (expires in 1 hour)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await getPasswordResetTokensCollection().insertOne({
      email,
      token: hashedToken,
      expiresAt,
      used: false,
      createdAt: new Date(),
    })

    // Create reset link
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`

    // Get user display name from MongoDB
    const mongoUser = await getUsersCollection().findOne({ firebaseUid: userRecord.uid })
    const displayName = mongoUser?.displayName || userRecord.displayName

    // Send email
    await sendPasswordResetEmail(email, resetLink, displayName)

    return res.json({
      message: 'If an account exists with this email, a password reset link has been sent.'
    })
  } catch (err) {
    console.error('Forgot password error:', err)
    return res.status(500).json({ error: 'Failed to process password reset request' })
  }
}

/**
 * POST /api/reset-password
 * Reset password using token
 */
export async function resetPassword(req: Request, res: Response) {
  const { email, token, newPassword } = req.body

  if (!email || !token || !newPassword) {
    return res.status(400).json({ error: 'Email, token, and new password are required' })
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  try {
    // Hash the token to compare with database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    // Find valid token
    const resetTokenDoc = await getPasswordResetTokensCollection().findOne({
      email,
      token: hashedToken,
      used: false,
      expiresAt: { $gt: new Date() },
    })

    if (!resetTokenDoc) {
      return res.status(400).json({ error: 'Invalid or expired reset token' })
    }

    // Get user from Firebase
    let userRecord
    try {
      userRecord = await auth.getUserByEmail(email)
    } catch (error) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Update password in Firebase
    await auth.updateUser(userRecord.uid, {
      password: newPassword,
    })

    // Mark token as used
    await getPasswordResetTokensCollection().updateOne(
      { _id: resetTokenDoc._id },
      { $set: { used: true } }
    )

    // Get user display name
    const mongoUser = await getUsersCollection().findOne({ firebaseUid: userRecord.uid })
    const displayName = mongoUser?.displayName || userRecord.displayName

    // Send confirmation email
    try {
      await sendPasswordResetConfirmationEmail(email, displayName)
    } catch (emailErr) {
      console.error('Failed to send confirmation email:', emailErr)
      // Continue even if email fails
    }

    return res.json({ message: 'Password has been reset successfully' })
  } catch (err) {
    console.error('Reset password error:', err)
    return res.status(500).json({ error: 'Failed to reset password' })
  }
}
