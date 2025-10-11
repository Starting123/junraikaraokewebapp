/**
 * ==========================================
 * Authentication Controller
 * Handles user authentication, registration, and profile management
 * ==========================================
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usersModel = require('../models/users');
const ApiResponse = require('../middleware/apiResponse');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_in_production';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

class AuthController {
    
    /**
     * User registration
     */
    async register(req, res, next) {
        try {
            const { name, email, password } = req.body;
            
            // Check if user already exists
            const existingUser = await usersModel.findByEmail(email);
            if (existingUser) {
                return ApiResponse.error(res, 'Email already registered', 409);
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
            
            // Create user
            const userId = await usersModel.create({
                name,
                email,
                password: hashedPassword,
                role_id: 2 // Default to customer role
            });

            // Generate JWT token
            const token = jwt.sign(
                { user_id: userId, email, role_id: 2 },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            return ApiResponse.success(res, {
                user: {
                    user_id: userId,
                    name,
                    email,
                    role_id: 2
                },
                token
            }, 'Registration successful', 201);
            
        } catch (err) {
            next(err);
        }
    }

    /**
     * User login
     */
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            
            // Find user by email
            const user = await usersModel.findByEmail(email);
            if (!user) {
                return ApiResponse.unauthorized(res, 'Invalid email or password');
            }

            // Check password
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return ApiResponse.unauthorized(res, 'Invalid email or password');
            }

            // Check if account is active
            if (user.status === 'inactive') {
                return ApiResponse.forbidden(res, 'Account is deactivated');
            }

            // Update last login
            await usersModel.updateLastLogin(user.user_id);

            // Generate JWT token
            const token = jwt.sign(
                { 
                    user_id: user.user_id, 
                    email: user.email, 
                    role_id: user.role_id 
                },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Remove password from response
            const { password: _, ...userResponse } = user;

            return ApiResponse.success(res, {
                user: userResponse,
                token
            }, 'Login successful');
            
        } catch (err) {
            next(err);
        }
    }

    /**
     * Get current user profile
     */
    async getProfile(req, res, next) {
        try {
            const user = req.user;
            const isAdmin = user.role_id === 1;
            
            return ApiResponse.success(res, { 
                user, 
                isAdmin 
            }, 'User profile retrieved successfully');
            
        } catch (err) {
            next(err);
        }
    }

    /**
     * Update user profile
     */
    async updateProfile(req, res, next) {
        try {
            const userId = req.user.user_id;
            const { name, phone, address } = req.body;
            
            // Update user profile
            await usersModel.updateProfile(userId, { name, phone, address });
            
            // Get updated user data
            const updatedUser = await usersModel.getById(userId);
            const { password: _, ...userResponse } = updatedUser;

            return ApiResponse.success(res, { 
                user: userResponse 
            }, 'Profile updated successfully');
            
        } catch (err) {
            next(err);
        }
    }

    /**
     * Change password
     */
    async changePassword(req, res, next) {
        try {
            const userId = req.user.user_id;
            const { currentPassword, newPassword } = req.body;
            
            // Get current user
            const user = await usersModel.getById(userId);
            if (!user) {
                return ApiResponse.notFound(res, 'User');
            }

            // Verify current password
            const isValidPassword = await bcrypt.compare(currentPassword, user.password);
            if (!isValidPassword) {
                return ApiResponse.error(res, 'Current password is incorrect', 400);
            }

            // Hash new password
            const hashedNewPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
            
            // Update password
            await usersModel.updatePassword(userId, hashedNewPassword);

            return ApiResponse.success(res, null, 'Password changed successfully');
            
        } catch (err) {
            next(err);
        }
    }

    /**
     * Request password reset
     */
    async requestPasswordReset(req, res, next) {
        try {
            const { email } = req.body;
            
            // Find user by email
            const user = await usersModel.findByEmail(email);
            if (!user) {
                // Don't reveal if email exists or not for security
                return ApiResponse.success(res, null, 'If email exists, reset instructions will be sent');
            }

            // Generate reset token
            const resetToken = jwt.sign(
                { user_id: user.user_id, type: 'password_reset' },
                JWT_SECRET,
                { expiresIn: '1h' }
            );

            // Store reset token (you'd typically send email here)
            await usersModel.storePasswordResetToken(user.user_id, resetToken);

            return ApiResponse.success(res, { 
                resetToken // In production, don't return this - send via email
            }, 'Password reset token generated');
            
        } catch (err) {
            next(err);
        }
    }

    /**
     * Reset password with token
     */
    async resetPassword(req, res, next) {
        try {
            const { token, newPassword } = req.body;
            
            // Verify reset token
            let payload;
            try {
                payload = jwt.verify(token, JWT_SECRET);
            } catch (err) {
                return ApiResponse.error(res, 'Invalid or expired reset token', 400);
            }

            if (payload.type !== 'password_reset') {
                return ApiResponse.error(res, 'Invalid reset token', 400);
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
            
            // Update password and clear reset token
            await usersModel.updatePassword(payload.user_id, hashedPassword);
            await usersModel.clearPasswordResetToken(payload.user_id);

            return ApiResponse.success(res, null, 'Password reset successful');
            
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new AuthController();