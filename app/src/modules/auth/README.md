# Authentication Module

**Location:** `src/modules/auth/`

## Overview
Handles user authentication, registration, password recovery, and token management for the Junrai Karaoke Web Application.

## Structure

```
auth/
├── controllers/
│   └── AuthController.js          # Authentication request handlers
├── services/
│   ├── AuthService.js              # Business logic for auth operations
│   └── MailService.js              # Email sending service
├── models/
│   └── User.js                     # User data model
├── routes/
│   └── auth.routes.js              # Route definitions
├── validators/
│   └── authValidators.js           # Input validation rules
└── views/
    ├── auth.ejs                    # Login/Register page
    ├── forgot-password.ejs         # Forgot password form
    └── reset-password.ejs          # Reset password form
```

## Routes

### Page Routes (GET)
- `GET /auth/login` → Render login form
- `GET /auth/register` → Render registration form
- `GET /auth/forgot-password` → Render forgot password form
- `GET /auth/reset-password/:token` → Render reset password form with token

### API Routes (POST)

**Public Routes:**
- `POST /auth/register` → Create new user account
- `POST /auth/login` → Authenticate user and issue tokens
- `POST /auth/forgot-password` → Send password reset email
- `POST /auth/reset-password/:token` → Reset password using token
- `POST /auth/refresh-token` → Refresh JWT access token
- `POST /auth/verify-token` → Verify JWT token validity

**Protected Routes (require authentication):**
- `POST /auth/logout` → Logout user
- `GET /auth/profile` → Get current user profile
- `POST /auth/change-password` → Change user password

## Controller Methods

### AuthController
- `register()` - Handle user registration
- `login()` - Handle user login
- `logout()` - Handle user logout
- `getProfile()` - Get user profile data
- `changePassword()` - Change password for authenticated user
- `forgotPassword()` / `handleForgotPassword()` - Initiate password reset
- `resetPassword()` / `handleResetPassword()` - Complete password reset
- `refreshToken()` - Generate new access token
- `verifyToken()` - Verify token validity
- `showLoginForm()` - Render login page
- `showRegisterForm()` - Render register page
- `showForgotPasswordForm()` - Render forgot password page
- `showResetPasswordForm()` - Render reset password page

## Services

### AuthService
Handles core authentication business logic:
- User registration with password hashing
- User login with JWT token generation
- Password reset token generation
- Password reset processing
- Token refresh and verification

### MailService
Handles email communications:
- Send password reset emails
- Send welcome emails
- Send verification emails

## Data Flow

```
Client Request
    ↓
Route (auth.routes.js)
    ↓
Validator (authValidators.js)
    ↓
Controller (AuthController.js)
    ↓
Service (AuthService.js)
    ↓
Model (User.js)
    ↓
Database
```

## Dependencies

- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT token generation/verification
- **nodemailer** - Email sending
- **express-validator** - Input validation

## Security Features

- Password hashing with bcrypt
- JWT-based authentication
- Token expiration (access: 15m, refresh: 7d)
- Password reset tokens (1h expiration)
- Input validation and sanitization
- Rate limiting on sensitive endpoints

## Example Usage

### Register New User
```javascript
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePass123",
  "role_id": 2
}
```

### Login
```javascript
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePass123"
}

Response:
{
  "success": true,
  "message": "เข้าสู่ระบบสำเร็จ",
  "data": {
    "user": {...},
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

### Forgot Password
```javascript
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

### Reset Password
```javascript
POST /auth/reset-password/:token
Content-Type: application/json

{
  "password": "newSecurePass456",
  "confirmPassword": "newSecurePass456"
}
```

## Testing

```bash
# Test registration
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"test123","role_id":2}'

# Test login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Test forgot password page
curl http://localhost:3000/auth/forgot-password
```

## Migration Notes

- Views moved from `/views/auth/` to `src/modules/auth/views/`
- Controllers moved from `/src/controllers/` to `src/modules/auth/controllers/`
- Services moved from `/src/services/` to `src/modules/auth/services/`
- Models moved from `/src/models/` to `src/modules/auth/models/`
- Middleware imports updated to use `../../../core/middleware/auth`

## Maintenance

- Keep password hashing algorithms up to date
- Rotate JWT secret keys periodically
- Monitor failed login attempts
- Review and update validation rules
- Keep email templates current
