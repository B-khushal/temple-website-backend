import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AuthRequest, generateAccessToken, generateRefreshToken } from '../middleware/auth';
import { logActivity } from '../utils/audit';
import { sendEmail } from '../services/EmailService';
import logger from '../config/logger';

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'durga-mata-temple-refresh-secret-key-super-secure-2026';

// Register User (Admin Only, or bypass if first user)
export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, email, password, role } = req.body;

  try {
    const userCount = await User.countDocuments();
    
    // First user can register without auth to bootstrap Super Admin
    if (userCount > 0) {
      if (!req.user || req.user.role !== 'Super Admin') {
        res.status(403).json({ success: false, message: 'Forbidden. Only Super Admins can register new users.' });
        return;
      }
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'User with this email already exists' });
      return;
    }

    const user = new User({ name, email, password, role });
    await user.save();

    await logActivity(req, 'CREATE_USER', 'User', user._id.toString(), null, { name, email, role });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error: any) {
    logger.error(`Error in register controller: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Login with Account Lockout (5 attempts)
export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ success: false, message: 'Account is deactivated' });
      return;
    }

    // Check account lockout
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      res.status(403).json({ 
        success: false, 
        message: `Account is temporarily locked due to multiple failed login attempts. Try again in ${remainingMinutes} minute(s).` 
      });
      return;
    }

    const isMatch = await (user as any).comparePassword(password);
    if (!isMatch) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
        user.failedLoginAttempts = 0;
        logger.warn(`User ${email} locked out due to excessive failed attempts.`);
      }
      await user.save();
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    // Reset failed login attempts on success
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    req.user = { id: user._id.toString(), email: user.email, role: user.role, name: user.name };
    await logActivity(req, 'USER_LOGIN', 'User', user._id.toString());

    // Optional secure cookie support
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error: any) {
    logger.error(`Error in login controller: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Logout
export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user) {
      const user = await User.findById(req.user.id);
      if (user) {
        user.refreshToken = undefined;
        await user.save();
      }
      await logActivity(req, 'USER_LOGOUT', 'User', req.user.id);
    }
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    logger.error(`Error in logout controller: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Refresh Token with Rotation
export const refresh = async (req: AuthRequest, res: Response): Promise<void> => {
  const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

  if (!refreshToken) {
    res.status(400).json({ success: false, message: 'Refresh token is required' });
    return;
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken || !user.isActive) {
      res.status(403).json({ success: false, message: 'Invalid or expired refresh token' });
      return;
    }

    // Refresh Token Rotation: Generate new set of tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ 
      success: true, 
      accessToken: newAccessToken, 
      refreshToken: newRefreshToken 
    });
  } catch (error: any) {
    res.status(403).json({ success: false, message: 'Expired or invalid refresh token' });
  }
};

// Forgot Password - Request OTP
export const forgotPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      // Security standard: don't disclose user non-existence
      res.json({ success: true, message: 'If account exists, password reset OTP has been sent' });
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry
    await user.save();

    await sendEmail({
      to: user.email,
      subject: 'Sri Durga Mata Temple - Password Reset OTP',
      text: `Hello ${user.name},\n\nYour OTP to reset your password is: ${otp}\nThis code is valid for 15 minutes.\n\nWarm regards,\nSri Durga Mata Temple Administration`,
    });

    res.json({ success: true, message: 'Reset OTP has been sent to your email.' });
  } catch (error: any) {
    logger.error(`Error in forgotPassword controller: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reset Password using OTP
export const resetPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  const { email, otp, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({ success: false, message: 'Invalid request parameters' });
      return;
    }

    if (
      !user.resetPasswordOTP ||
      user.resetPasswordOTP !== otp ||
      !user.resetPasswordOTPExpiry ||
      user.resetPasswordOTPExpiry < new Date()
    ) {
      res.status(400).json({ success: false, message: 'Invalid or expired OTP code' });
      return;
    }

    user.password = newPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpiry = undefined;
    user.refreshToken = undefined; // Force logout on all locations
    await user.save();

    await logActivity(req, 'RESET_PASSWORD', 'User', user._id.toString());

    res.json({ success: true, message: 'Your password has been reset successfully.' });
  } catch (error: any) {
    logger.error(`Error in resetPassword controller: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Change Password
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user?.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const isMatch = await (user as any).comparePassword(oldPassword);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Incorrect current password' });
      return;
    }

    user.password = newPassword;
    user.refreshToken = undefined; // Force token refresh on all sessions
    await user.save();

    await logActivity(req, 'CHANGE_PASSWORD', 'User', user._id.toString());

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error: any) {
    logger.error(`Error in changePassword controller: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get profile
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const user = await User.findById(req.user.id).select('-password -refreshToken');
    res.json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// USER MANAGEMENT CRUD (Super Admin Only)

// List Users
export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find().select('-password -refreshToken');
    res.json({ success: true, users });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update User
export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, email, role, isActive } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const original = user.toObject();

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    await logActivity(req, 'UPDATE_USER', 'User', user._id.toString(), original, user.toObject());

    res.json({ success: true, message: 'User updated successfully', data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete User
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (req.user?.id === id) {
      res.status(400).json({ success: false, message: 'You cannot delete your own account' });
      return;
    }

    const original = user.toObject();
    await user.deleteOne();

    await logActivity(req, 'DELETE_USER', 'User', id, original, null);

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Send Email Verification OTP
export const sendVerificationEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (user.isEmailVerified) {
      res.status(400).json({ success: false, message: 'Email is already verified' });
      return;
    }

    const token = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit verification token
    user.emailVerificationToken = token;
    await user.save();

    await sendEmail({
      to: user.email,
      subject: 'Sri Durga Mata Temple - Email Verification Code',
      text: `Hello ${user.name},\n\nYour code to verify your email address is: ${token}\n\nWarm regards,\nSri Durga Mata Temple Administration`,
    });

    res.json({ success: true, message: 'Verification code sent to email' });
  } catch (error: any) {
    logger.error(`Error in sendVerificationEmail: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Verify Email using Token
export const verifyEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  const { token } = req.body;
  const userId = req.user?.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (user.isEmailVerified) {
      res.status(400).json({ success: false, message: 'Email is already verified' });
      return;
    }

    if (!user.emailVerificationToken || user.emailVerificationToken !== token) {
      res.status(400).json({ success: false, message: 'Invalid verification token' });
      return;
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    await logActivity(req, 'VERIFY_EMAIL', 'User', user._id.toString());

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error: any) {
    logger.error(`Error in verifyEmail: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};
