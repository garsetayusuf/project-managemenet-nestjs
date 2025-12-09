# Project Management API

> A production-ready RESTful API built with NestJS featuring custom JWT authentication, project & task management, and comprehensive test coverage.

**Tech Stack:** Node.js 20+ | NestJS 11 | Fastify 5 | PostgreSQL | Prisma 7 | JWT | Jest | Swagger

---

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Environment Configuration](#environment-configuration)
- [Database Schema](#database-schema)
- [Authentication Flow](#authentication-flow)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Development Commands](#development-commands)
  - [Database Management](#database-management)
  - [Code Quality](#code-quality)
- [Database Seeding](#database-seeding)
- [API Documentation (Swagger)](#api-documentation-swagger)
- [Troubleshooting](#troubleshooting)

---

## Features

### Core Features

- **Custom JWT Authentication System**
  - Short-lived access tokens (15 minutes default)
  - Long-lived refresh tokens (30 days default)
  - Token rotation on each refresh
  - Token blacklisting for revoked access tokens
  - Device tracking (device name, IP address)
  - Immediate logout capability

- **Project Management**
  - Create, read, update, delete projects
  - User-specific project isolation
  - Task count aggregation
  - Full CRUD operations

- **Task Management**
  - Full CRUD operations on tasks
  - Task filtering by project, status, priority
  - Status tracking: PENDING, IN_PROGRESS, DONE
  - Priority levels: LOW, MEDIUM, HIGH, URGENT
  - Due date management
  - Relationship with projects and users

- **Security & Authorization**
  - JWT-based authentication with Passport
  - Users can only access their own resources
  - Token blacklist system
  - Secure password hashing (Bcrypt with configurable salt rounds)
  - CORS protection
  - CSRF protection with cookies

- **Testing & Documentation**
  - Comprehensive unit tests with Jest
  - Swagger/OpenAPI auto-generated documentation
  - 100% endpoint coverage

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 20** or higher
- **pnpm 10+** (or npm 10+, but pnpm is recommended)
- **PostgreSQL 14** or higher

---

## Installation & Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/garsetayusuf/project-managemenet-nestjs.git
cd project-managemenet-nestjs
```

### Step 2: Install Dependencies

```bash
pnpm install
```

### Step 3: Setup Environment File

Create a `.env` file in the project root:

```bash
cp .env.example .env  # If .env.example exists, otherwise create manually
```

Edit the `.env` file with your configuration (see [Environment Configuration](#environment-configuration)).

### Step 4: Configure Database

Ensure PostgreSQL is running, then create the database:

```bash
createdb project_management_nestjs
```

Update your `.env` with the database credentials:

```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/project_management_nestjs?schema=public"
```

### Step 5: Run Database Migrations

```bash
pnpm exec prisma migrate dev
```

This creates all necessary tables based on the Prisma schema.

### Step 6: (Optional) Seed the Database

```bash
pnpm run seed
```

This creates test data:

- 1 test user with random email (@example.com)
- 2 projects per user
- 4 tasks total (2 per project with varied statuses and priorities)

See [Database Seeding](#database-seeding) for more details.

### Step 7: Start the Development Server

```bash
pnpm run start:dev
```

The API will be available at: `http://localhost:4200/api/v1`

Swagger documentation will be available at: `http://localhost:4200/swagger`

---

## Environment Configuration

### Application Settings

```env
APP_NAME=Project Management API
NODE_ENV=development              # Environment: development, staging, production
PORT=4200                          # Server port
CORS_ORIGIN=http://localhost:3000 # Comma-separated allowed origins
```

### Database Configuration

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/project_management_nestjs?schema=public"
```

**Connection String Format:**

```
postgresql://[user]:[password]@[host]:[port]/[database]?schema=public
```

### JWT Configuration

```env
JWT_SECRET=your-secret-key-here           # Secret key for signing tokens
JWT_EXPIRES=30d                            # Access token lifetime
JWT_EXPIRES_IN_DAYS=30d                    # Refresh token lifetime (alias)
JWT_EXPIRES_REFRESH_TOKEN=4h               # Alternative refresh token lifetime
```

**Token Details:**

- Access tokens expire after **15 minutes** (configurable via JWT_EXPIRES)
- Refresh tokens expire after **30 days** (configurable via JWT_EXPIRES_REFRESH_TOKEN)
- Tokens use **HS256** signing algorithm

### Password Hashing Configuration

```env
PASSWORD_SALT_ROUNDS=12    # Bcrypt salt rounds (higher = slower but more secure)
```

**Security Notes:**

- Default: 12 rounds (recommended for most applications)
- 10 rounds: Faster, suitable for high-traffic systems
- 14+ rounds: Slower, suitable for critical systems with fewer logins

---

## Database Schema

### Entity Relationship Diagram

```
users (1) ─────────── (many) projects
  │                       │
  │                       └─── (many) tasks
  │
  └─────────────────────────── (many) tasks

users
├─ id (UUID)
├─ name
├─ email (UNIQUE)
├─ password (bcrypt hashed)
├─ createdAt
└─ updatedAt

projects
├─ id (autoincrement)
├─ userId (FK → users.id, CASCADE delete)
├─ name
├─ description (optional)
├─ createdAt
└─ updatedAt

tasks
├─ id (autoincrement)
├─ userId (FK → users.id, CASCADE delete)
├─ projectId (FK → projects.id, CASCADE delete)
├─ title
├─ description (optional)
├─ status (enum: PENDING, IN_PROGRESS, DONE)
├─ priority (enum: LOW, MEDIUM, HIGH, URGENT)
├─ dueDate (optional)
├─ createdAt
└─ updatedAt

refresh_tokens
├─ id (UUID)
├─ userId (FK → users.id, CASCADE delete)
├─ token_hash (UNIQUE)
├─ deviceName (optional)
├─ ipAddress (optional)
├─ expiresAt
├─ revokedAt (nullable)
├─ lastUsedAt (nullable)
└─ createdAt
└─ updatedAt

token_blacklist
├─ id (UUID)
├─ userId
├─ token (UNIQUE)
├─ expiresAt
└─ createdAt
└─ updatedAt
```

### ID Column Strategy

The application uses a strategic mix of UUID and auto-increment primary keys:

| Table | ID Type | Reason |
|-------|---------|--------|
| **users** | UUID | User identification in distributed systems, privacy, and API exposure safety |
| **projects** | Auto-increment | Sequential IDs for user-facing references and better database indexing performance |
| **tasks** | Auto-increment | Simple, predictable IDs for task management within projects |
| **refresh_tokens** | UUID | Security and uniqueness for token identification |
| **token_blacklist** | UUID | Consistency with token management system |

- **UUID fields** use `CHAR(36)` storage and are suitable for sensitive operations
- **Auto-increment fields** are optimized for performance and are safe within user isolation context
- **Foreign keys** maintain appropriate type relationships (UUID FK → UUID PK, bigint FK → bigint PK)

---

## Authentication Flow

### JWT Token Lifecycle

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  1. User Registration/Login                     │
│     ├─ POST /api/v1/auth/register              │
│     ├─ POST /api/v1/auth/login                 │
│     └─ Verify credentials (email + password)   │
│                                                 │
├─────────────────────────────────────────────────┤
│  2. Receive Tokens                              │
│     ├─ access_token (JWT, 15 minutes)          │
│     ├─ refresh_token (UUID, 30 days)           │
│     └─ user (id, email, name)                  │
│                                                 │
├─────────────────────────────────────────────────┤
│  3. Make API Requests                           │
│     ├─ Header: Authorization: Bearer <token>   │
│     ├─ JWT Guard validates signature           │
│     ├─ Guard checks token expiration           │
│     ├─ Guard checks token blacklist            │
│     └─ Request proceeds if all checks pass     │
│                                                 │
├─────────────────────────────────────────────────┤
│  4. When Access Token Expires                   │
│     ├─ POST /api/v1/auth/refresh               │
│     ├─ Send refresh_token in body              │
│     ├─ Receive new access_token + refresh_token│
│     ├─ Old refresh_token marked as revoked     │
│     └─ Continue making requests                │
│                                                 │
├─────────────────────────────────────────────────┤
│  5. On Logout                                   │
│     ├─ GET /api/v1/auth/logout                 │
│     ├─ Access token added to blacklist         │
│     ├─ Refresh token marked as revoked         │
│     └─ All tokens become invalid               │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Token Blacklist System

When a user logs out:

- **Immediate effect** - Access token becomes invalid immediately
- **Cannot reuse** - Even with valid signature
- **Multi-device logout** - Future enhancement for logout from all devices

### Email Handling

The LoginDto accepts email with any case (e.g., `John@Example.com`), but stores and queries with exact case. For consistency, use lowercase emails.

## Testing

### Running Tests

```bash
# Run all unit tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage report
pnpm run test:cov

# Debug tests
pnpm run test:debug

# Run E2E tests
pnpm run test:e2e
```

### Test Coverage

- **Authentication Tests** - Registration, login, token refresh, password change
- **Authorization Tests** - User isolation, resource access control
- **Project Tests** - CRUD operations, filtering
- **Task Tests** - CRUD operations, filtering, relationships
- **Token Management** - Blacklisting, refresh token rotation

### Test Structure

Tests are located in `/test` directory:

```
test/
├── unit/
│   ├── auth/
│   ├── projects/
│   ├── tasks/
│   └── health-check/
└── jest-e2e.json
```

---

## Development Commands

### Build & Start

```bash
# Build the project
pnpm run build

# Start the application
pnpm run start

# Start in development mode (watch)
pnpm run start:dev

# Start with debugging enabled
pnpm run start:debug

# Start production build
pnpm run start:prod
```

### Database Management

#### Run Migrations

```bash
# Create and run pending migrations
pnpm exec prisma migrate dev

# Apply migrations in production
pnpm exec prisma migrate deploy

# Reset database (drops all data!)
pnpm exec prisma migrate reset
```

#### Generate Prisma Client

```bash
# Generate/regenerate Prisma client
pnpm exec prisma generate
```

#### Open Prisma Studio

Interactive database browser:

```bash
pnpm exec prisma studio
```

Accessible at: `http://localhost:5555`

### Database Seeding

```bash
# Seed with initial test data
pnpm run seed

# Reseed (clears and reseeds database)
pnpm exec prisma migrate reset
```

### Code Quality

#### Code Formatting

```bash
# Format all code with Prettier
pnpm run format

# Check formatting without fixing
pnpm run format:check
```

#### Linting

```bash
# Lint and fix all files
pnpm run lint
```

---

## Database Seeding

### What Gets Created

When running `pnpm run seed`:

- **1 User**
  - Email: `{randomName}@example.com` (case-preserving)
  - Password: `password123` (bcrypt hashed with 12 rounds)
  - Name: Random full name via faker

- **2 Projects** per user
  - Realistic project names via faker
  - Random descriptions via faker

- **4 Tasks** total (2 per project)
  - Varied statuses: PENDING, IN_PROGRESS, DONE
  - Varied priorities: LOW, MEDIUM, HIGH, URGENT
  - Random due dates (some future, some past, some null)
  - Descriptive titles via faker

### Seed Commands

```bash
# Seed database
pnpm run seed

# Seed and reset (caution: deletes all data!)
pnpm exec prisma migrate reset

# View database with Prisma Studio
pnpm exec prisma studio
```

### Seed Features

- **Idempotent** - Safe to run multiple times
- **Uses Faker** - Generates realistic test data
- **Preserves email case** - No forced lowercase transformation
- **Colored output** - Visual feedback during seeding
- **Configurable salt rounds** - Respects PASSWORD_SALT_ROUNDS env variable

### Reset Database Completely

**WARNING: This deletes all data!**

```bash
pnpm exec prisma migrate reset --force
```

---

## API Documentation (Swagger)

### Accessing Swagger UI

The API documentation is automatically generated and available at:

```
http://localhost:4200/swagger
```

**Note:** Swagger UI is only available in non-production environments.

### Features Available in Swagger

- ✅ View all endpoints and methods
- ✅ See request/response examples
- ✅ Test endpoints directly (Try it out)
- ✅ View authentication requirements
- ✅ Explore query parameters and filters
- ✅ Review error responses
- ✅ Copy curl commands

### Using Bearer Token in Swagger

1. Click the "Authorize" button in the top-right
2. Paste your `access_token` (without "Bearer" prefix)
3. Click "Authorize"
4. Now all requests will include the token

---

## Troubleshooting

### Common Issues and Solutions

#### 1. "Cannot find module '@prisma/client'"

**Error:** `Module not found: @prisma/client`

**Solution:**

```bash
# Reinstall dependencies
pnpm install

# Regenerate Prisma client
pnpm exec prisma generate
```

---

#### 2. Database Connection Errors

**Error:** `SQLSTATE[08006]: Connection refused`

**Checklist:**

```bash
# 1. Verify PostgreSQL is running
psql --version

# 2. Check database exists
psql -U postgres -l | grep project_management_nestjs

# 3. Create database if missing
createdb project_management_nestjs

# 4. Verify .env DATABASE_URL
cat .env | grep DATABASE_URL

# 5. Test connection with Prisma
pnpm exec prisma db push
```

---

#### 3. Migration Errors

**Error:** `SQLSTATE[42P07]: Duplicate table`

**Solution:**

```bash
# Reset to clean state (WARNING: deletes all data!)
pnpm exec prisma migrate reset --force
```

---

#### 4. Port Already in Use

**Error:** `EADDRINUSE: address already in use :::4200`

**Solution:**

```bash
# Find and kill process using port 4200
lsof -i :4200
kill -9 <PID>

# Or change PORT in .env
echo "PORT=4201" >> .env
```

---

#### 5. "Invalid credentials" on Login

**Error:** Login returns 400 Bad Request with "Invalid credentials"

**Checklist:**

1. Verify user exists in database:

   ```bash
   pnpm exec prisma studio
   # Check users table
   ```

2. Verify password was hashed correctly:
   - Password should be bcrypt hash (starts with `$2a$`, `$2b$`, or `$2x$`)
   - Use exact email and password `password123`

3. Reseed database:

   ```bash
   pnpm exec prisma migrate reset --force
   ```

---

#### 6. JWT Token Errors

**Error:** `Unauthorized: Invalid token` or `Token has been blacklisted`

**Causes and Solutions:**

- **Expired token:** Use refresh endpoint to get new token
- **Blacklisted token:** Token was revoked on logout, get new token via login
- **Malformed token:** Ensure "Bearer " prefix in Authorization header
- **Wrong secret:** Verify JWT_SECRET in .env

---

#### 7. CORS Errors in Frontend

**Error:** `Access to XMLHttpRequest... has been blocked by CORS policy`

**Solution:** Verify CORS configuration in `.env`:

```env
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

Multiple origins should be comma-separated.

---

#### 8. Tests Failing

**Error:** `Error: Test environment is not set up correctly`

**Solution:**

```bash
# Run tests with proper setup
pnpm test

# Clear Jest cache
pnpm test --clearCache

# Run specific test
pnpm test -- auth.service.spec.ts
```

---

### Debug Mode

Enable detailed error messages:

**In .env:**

```env
NODE_ENV=development  # Shows detailed errors
```

**In code (temporary debugging):**

```typescript
// Add to controller or service
console.log('Debug:', someVariable);
```
