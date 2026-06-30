import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticateJWT, requireRoles } from '../middleware/auth';
import { authRateLimiter } from '../middleware/security';
import { validateRequest } from '../middleware/validation';
import { 
  loginSchema, 
  registerSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema, 
  changePasswordSchema, 
  updateUserSchema 
} from '../validators/auth.validator';

const router = Router();

// Authentication
router.post('/login', authRateLimiter, validateRequest(loginSchema), authController.login);
router.post('/logout', authenticateJWT, authController.logout);
router.post('/refresh', authController.refresh);
router.post('/forgot-password', authRateLimiter, validateRequest(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authRateLimiter, validateRequest(resetPasswordSchema), authController.resetPassword);
router.post('/change-password', authenticateJWT, validateRequest(changePasswordSchema), authController.changePassword);
router.get('/me', authenticateJWT, authController.getMe);

// Email Verification
router.post('/verify-email', authenticateJWT, authController.verifyEmail);
router.post('/send-verification', authenticateJWT, authController.sendVerificationEmail);

// User Management (Super Admin only, except register which handles first-time bootstrap)
router.post('/register', validateRequest(registerSchema), authController.register);
router.get('/users', authenticateJWT, requireRoles(['Super Admin']), authController.getUsers);
router.put('/users/:id', authenticateJWT, requireRoles(['Super Admin']), validateRequest(updateUserSchema), authController.updateUser);
router.delete('/users/:id', authenticateJWT, requireRoles(['Super Admin']), authController.deleteUser);

export default router;
