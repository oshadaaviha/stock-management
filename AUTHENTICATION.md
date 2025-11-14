# Authentication System Guide

## Overview
The stock management system now has role-based authentication with JWT tokens.

## User Roles & Permissions

### 1. Admin Role
- **Access**: Full system access + User Management
- **Permissions**: 
  - All Finance role permissions (see below)
  - View all users
  - Create new users
  - Edit user details (username, name, email, role, status)
  - Reset user passwords
  - Delete users
- **This role has complete control over the system**

### 2. Finance Role
- **Access**: Full business operations access
- **Permissions**:
  - Dashboard
  - Products management
  - Purchase (Stock-In)
  - Sales / Invoice creation
  - Sales Reference
  - Customers management
  - Suppliers management
  - Stock balance view
- **Cannot**: Manage users (only Admin can)

### 3. Reporter Role
- **Access**: Stock balance page only (Read-only)
- **Permissions**:
  - View stock balance
  - View product details
- **Cannot**: Make any changes, create invoices, manage data, or manage users

## Default Login Credentials

After running the initialization script, you can login with these accounts:

| Username | Password   | Role     |
|----------|------------|----------|
| admin    | admin123   | Admin    |
| finance  | finance123 | Finance  |
| reporter | reporter123| Reporter |

⚠️ **IMPORTANT**: Change all default passwords immediately after first login!

## How to Use

### First Time Setup

1. **Database Migration**: The users table has been updated with the new schema. If you're setting up fresh:
   ```bash
   cd stock-backend
   mysql -u root stockdb < migrate-users.sql
   ```

2. **Create Default Users**:
   ```bash
   cd stock-backend
   node init-users.js
   ```

3. **Start Backend** (if not running):
   ```bash
   cd stock-backend
   npm run dev
   ```

4. **Start Frontend** (if not running):
   ```bash
   cd stock-management
   npm run dev
   ```

5. **Login**: Open the app in your browser and use one of the default credentials above.

### Managing Users (Admin Role)

1. Login with admin account
2. You'll see the "User Management" page
3. Click "Add New User" to create accounts
4. Edit users by clicking the "Edit" button
5. Reset passwords using "Reset Password" button
6. Delete users with the "Delete" button

### Changing Your Password

1. Login with any account
2. Click on your name in the header
3. Select "Change Password"
4. Enter your current password and new password

## Security Features

- **Password Hashing**: All passwords are hashed using bcrypt (10 rounds)
- **JWT Tokens**: Authentication uses JSON Web Tokens with 24-hour expiration
- **Role-Based Access Control**: Each endpoint checks user role before allowing access
- **Session Persistence**: Login state is saved in localStorage
- **Automatic Logout**: Users are logged out after token expiration

## API Endpoints

### Public Endpoints
- `POST /api/auth/login` - Login with username and password

### Protected Endpoints (Require Authentication)
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/change-password` - Change own password

### Admin Only Endpoints
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `POST /api/users/:id/reset-password` - Reset user password
- `DELETE /api/users/:id` - Delete user

### Finance Only Endpoints
All business operations (products, purchases, sales, customers, suppliers) require Finance role or Admin role.

### Reporter Access
Stock view endpoints are accessible to Reporter role for read-only access.

### Admin Access
Admin has access to all Finance endpoints plus exclusive user management endpoints.

## Troubleshooting

### Can't Login
- Check that backend is running on port 8080
- Verify database connection
- Ensure users were created with init-users.js

### "Unauthorized" Errors
- Token may have expired (24 hours) - login again
- User role may not have permission for that feature

### Forgot Password
- Only Admin users can reset passwords
- Login as admin and use "Reset Password" button in User Management

## Technical Details

### Frontend
- **AuthContext**: React Context provides auth state globally
- **authFetch()**: Helper function adds Bearer token to API requests
- **Protected Routes**: Role-based rendering in App.tsx

### Backend
- **JWT Secret**: Configured in environment (default: "lenama-stock-secret-key")
- **Token Expiration**: 24 hours
- **Middleware**: `authenticate` verifies token, `authorize` checks roles
- **Password Rules**: Minimum 6 characters

### Database
- **Table**: users
- **Fields**: id, username, name, email, password, role, status, created_at, updated_at
- **Indexes**: username, role, status for faster queries
