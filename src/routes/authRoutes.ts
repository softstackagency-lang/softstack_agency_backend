import { Router } from 'express'
import {
  registerWithCookie,
  loginWithCookie,
  googleLogin,
  googleRegister,
  logout,
  getProfile,
  getMe,
  forgotPassword,
  resetPassword,
} from '../controllers/authController'

const router = Router()

// Email/password authentication
router.post('/register-cookie', registerWithCookie)
router.post('/login-cookie', loginWithCookie)

// Google OAuth
router.post('/google-login', googleLogin)
router.post('/google-register', googleRegister)

// Session management
router.post('/logout', logout)

// User profile
router.get('/auth/profile', getProfile)
router.get('/auth/me', getMe)

// Password reset
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)

export default router
