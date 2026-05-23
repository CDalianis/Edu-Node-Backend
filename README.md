# Edu REST API — TypeScript Backend

A RESTful backend service for managing educational staff records. The API supports user accounts with role-based access control (RBAC), teacher profiles with personal information, regional assignment, AMKA document uploads, and JWT authentication. It is implemented with **Express 5**, **TypeScript**, **Prisma**, and **MySQL**.

---

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Features](#features)
4. [Data Model](#data-model)
5. [Authentication and Authorization](#authentication-and-authorization)
6. [API Reference](#api-reference)
7. [Validation Rules](#validation-rules)
8. [Environment Variables](#environment-variables)
9. [Prerequisites](#prerequisites)
10. [Installation and Setup](#installation-and-setup)
11. [Running the Application](#running-the-application)
12. [Project Structure](#project-structure)
13. [Error Handling](#error-handling)

---

## Overview

This service exposes versioned HTTP endpoints under `/api/v1`. It is designed as the server component of a MEAN-stack educational application: clients authenticate, then access protected resources according to capabilities assigned to their role.

Public endpoints support onboarding (user and teacher registration). Protected endpoints require a valid Bearer token and one or more capabilities from the caller’s role.

---

## Technology Stack

| Layer            | Technology                          |
|------------------|-------------------------------------|
| Runtime          | Node.js                             |
| Language         | TypeScript                          |
| HTTP framework   | Express 5                           |
| ORM              | Prisma                              |
| Database         | MySQL                               |
| Authentication   | JSON Web Tokens (JWT)               |
| Password hashing | bcrypt (cost factor 12)             |
| Request validation | Zod                               |
| File uploads     | Multer (disk storage)               |
| Security headers | Helmet                              |
| CORS             | Configurable allowed origins        |
| Logging          | Morgan (development format)         |

---

## Features

### User management

- **Create user** — Register a new account with username, password, and role.
- **Get user by UUID** — Retrieve a non-deleted user’s public profile (username, role); requires `VIEW_USER`.

### Teacher management

- **Create teacher** — Atomically create a teacher record, linked user account, and personal information in a single transaction.
- **List teachers** — Paginated list of active teachers, ordered by last name; requires `VIEW_TEACHERS`.
- **Get teacher by UUID** — Retrieve a single teacher’s read-only profile; requires `VIEW_TEACHER` or `VIEW_ONLY_TEACHER`.
- **Update teacher** — Update teacher fields, linked user credentials, and personal information; requires `EDIT_TEACHER`.
- **Soft-delete teacher** — Mark a teacher as deleted (retains data with `deleted` / `deleted_at` flags); requires `DELETE_TEACHER`.
- **Attach AMKA file** — Upload a document (multipart form field `amkaFile`) and associate it with the teacher’s personal information record.

### Authentication

- **Authenticate** — Validate username and password; return a signed JWT for subsequent requests.
- **Bearer token middleware** — Verify JWT on protected routes; load user, role, and capabilities from the database.
- Reject deleted or missing users with `401 Unauthorized`.

### Role-based access control (RBAC)

- **Roles** — Each user belongs to one role (e.g. administrator, teacher).
- **Capabilities** — Fine-grained permissions stored in the database and linked to roles via a many-to-many `roles_capabilities` table.
- **Authorization middleware** — Protected routes declare required capabilities; access is granted if the authenticated user’s role includes **any** of the listed capabilities.

Capabilities referenced by the API:

| Capability           | Purpose                                      |
|----------------------|----------------------------------------------|
| `VIEW_USER`          | Read a user profile by UUID                  |
| `VIEW_TEACHERS`      | List teachers (paginated)                    |
| `VIEW_TEACHER`       | Read a single teacher profile                |
| `VIEW_ONLY_TEACHER`  | Alternative permission to read one teacher |
| `EDIT_TEACHER`       | Update a teacher and related records         |
| `DELETE_TEACHER`     | Soft-delete a teacher                        |

Roles and capabilities must exist in the database before use; seed or migrate your schema accordingly.

### Data integrity and persistence

- **UUID identifiers** — Users and teachers expose UUIDs (stored as 16-byte binary values).
- **Transactional writes** — Teacher creation and updates use database transactions where multiple tables are involved.
- **Soft delete** — Teachers (and related entities in the schema) support logical deletion via `deleted` and `deleted_at` columns; queries exclude deleted records by default.
- **Uniqueness constraints** — Usernames, VAT numbers, AMKA numbers, identity numbers, and attachment saved names are enforced at the database level.

### File handling

- AMKA uploads are stored on disk under a configurable directory (default: `uploads/`).
- Stored files use a random UUID filename; metadata is persisted in the `attachments` table.
- Maximum upload size: **5 MB** per file.

### API infrastructure

- **Versioned routes** — All business endpoints are prefixed with `/api/v1`.
- **Health check** — `GET /health` returns `{ "status": "ok" }`.
- **Centralized error handling** — Consistent JSON error responses with appropriate HTTP status codes.
- **Request body validation** — Zod schemas on all mutating and query endpoints.
- **Security** — Helmet middleware, configurable CORS, hashed passwords, JWT expiration.

---

## Data Model

The Prisma schema models the following entities:

| Entity              | Description                                                                 |
|---------------------|-----------------------------------------------------------------------------|
| `Role`              | Named role assigned to users                                                |
| `Capability`        | Named permission with optional description                                  |
| `RoleCapability`    | Join table linking roles to capabilities                                    |
| `User`              | Account (username, hashed password, role, UUID, soft-delete)                |
| `Teacher`           | Staff profile linked to a user, optional region and personal information    |
| `Region`            | Geographic region for teacher assignment                                    |
| `PersonalInfo`      | AMKA, identity number, place of birth, municipality; optional file attachment |
| `Attachment`        | Uploaded file metadata (path, content type, extension)                      |

A teacher has a one-to-one relationship with a user and optionally with personal information and a region.

---

## Authentication and Authorization

### Obtaining a token

Send credentials to `POST /api/v1/auth/authenticate`:

```json
{
  "username": "your_username",
  "password": "your_password"
}
```

On success, the response is:

```json
{
  "token": "<JWT>"
}
```

The token is signed with a Base64-decoded secret (`JWT_SECRET_KEY`), includes the role name in the payload, uses the username as the subject, and expires after `JWT_EXPIRATION_MS` (default: 3 hours).

### Using a token

Include the token on protected requests:

```http
Authorization: Bearer <JWT>
```

### Authorization flow

1. `authenticate` middleware validates the JWT and loads the user with role and capabilities.
2. `authorizeAny(...capabilities)` checks that the user has at least one of the required capabilities.
3. Missing or invalid tokens → `401`. Valid token but insufficient permissions → `403`.

---

## API Reference

Base URL: `http://localhost:<PORT>` (default port: `8080`).

### Health

| Method | Path      | Auth | Description        |
|--------|-----------|------|--------------------|
| `GET`  | `/health` | No   | Service health check |

### Authentication

| Method | Path                           | Auth | Description              |
|--------|--------------------------------|------|--------------------------|
| `POST` | `/api/v1/auth/authenticate`    | No   | Issue JWT for valid user |

### Users

| Method | Path                    | Auth | Capability  | Description                    |
|--------|-------------------------|------|-------------|--------------------------------|
| `POST` | `/api/v1/users`         | No   | —           | Create user; `201` + `Location`  |
| `GET`  | `/api/v1/users/:uuid`   | Yes  | `VIEW_USER` | Get user by UUID               |

**Create user body:**

```json
{
  "username": "string (3–20 chars)",
  "password": "string (see validation rules)",
  "roleId": "number or string"
}
```

**Response (create / get):**

```json
{
  "uuid": "uuid-string",
  "username": "string",
  "role": "role-name"
}
```

### Teachers

| Method   | Path                                  | Auth | Capability                              | Description              |
|----------|---------------------------------------|------|-----------------------------------------|--------------------------|
| `POST`   | `/api/v1/teachers`                    | No   | —                                       | Create teacher           |
| `POST`   | `/api/v1/teachers/:uuid/amka-file`    | No   | —                                       | Upload AMKA file (`multipart/form-data`, field `amkaFile`) |
| `GET`    | `/api/v1/teachers`                    | Yes  | `VIEW_TEACHERS`                         | List teachers (paginated)|
| `GET`    | `/api/v1/teachers/:uuid`              | Yes  | `VIEW_TEACHER` or `VIEW_ONLY_TEACHER`   | Get teacher by UUID      |
| `PUT`    | `/api/v1/teachers/:uuid`              | Yes  | `EDIT_TEACHER`                          | Update teacher           |
| `DELETE` | `/api/v1/teachers/:uuid`              | Yes  | `DELETE_TEACHER`                        | Soft-delete teacher      |

**List query parameters:**

| Parameter | Default | Description                          |
|-----------|---------|--------------------------------------|
| `page`    | `0`     | Zero-based page index                |
| `size`    | `5`     | Number of records per page           |

**List response:**

```json
{
  "content": [ { "uuid", "firstname", "lastname", "vat", "region" } ],
  "page": 0,
  "size": 5,
  "totalElements": 0,
  "totalPages": 0
}
```

**Create teacher body:**

```json
{
  "firstname": "string (min 2)",
  "lastname": "string (min 2)",
  "vat": "string (9+ digits)",
  "regionId": "number or string",
  "userInsertDTO": {
    "username": "string (3–20)",
    "password": "string (see validation rules)",
    "roleId": "number or string"
  },
  "personalInfoInsertDTO": {
    "amka": "string (11 digits)",
    "identityNumber": "string",
    "placeOfBirth": "string",
    "municipalityOfRegistration": "string"
  }
}
```

**Update teacher body:** Same structure as create, with `userUpdateDTO` (username 2–20, password) and `personalInfoUpdateDTO` instead of insert DTOs; `uuid` is taken from the URL path.

**Teacher read-only response:**

```json
{
  "uuid": "uuid-string",
  "firstname": "string",
  "lastname": "string",
  "vat": "string",
  "region": "region-name"
}
```

---

## Validation Rules

| Field / rule        | Requirement                                                                 |
|---------------------|-----------------------------------------------------------------------------|
| Password (create)   | Minimum 8 characters; at least one digit, lowercase, uppercase, and special character (`!@#$%^&+=`) |
| Password (update)   | Same pattern as create                                                    |
| Username (create)   | 3–20 characters                                                             |
| Username (update)   | 2–20 characters                                                             |
| VAT                 | Numeric string, at least 9 digits                                           |
| AMKA                | Exactly 11 digits                                                           |
| Teacher names       | Minimum 2 characters each                                                   |
| Personal info text  | Non-empty strings for identity, place of birth, municipality                |

Validation failures and business rule violations return `4xx` responses with a JSON `message` field.

---

## Environment Variables

Create a `.env` file in the project root (never commit secrets to version control).

| Variable             | Required | Default        | Description                                      |
|----------------------|----------|----------------|--------------------------------------------------|
| `DATABASE_URL`       | Yes      | —              | MySQL connection string for Prisma               |
| `JWT_SECRET_KEY`     | Yes      | —              | Base64-encoded secret used to sign and verify JWTs |
| `PORT`               | No       | `8080`         | HTTP listen port                                 |
| `JWT_EXPIRATION_MS`  | No       | `10800000`     | Token lifetime in milliseconds (3 hours)         |
| `ALLOWED_ORIGINS`    | No       | `*` (via CORS) | Comma-separated list of allowed CORS origins     |
| `FILE_UPLOAD_DIR`    | No       | `uploads`      | Directory for AMKA file storage (created on start) |

---

## Prerequisites

- **Node.js** (LTS recommended)
- **npm**
- **MySQL** server with a database created for this application
- Database schema aligned with `prisma/schema.prisma` (existing tables or migrations)

---

## Installation and Setup

1. **Clone the repository** and change into the backend directory:

   ```bash
   cd backend-ts
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables** — Copy your settings into `.env` (see [Environment Variables](#environment-variables)).

4. **Generate the Prisma client:**

   ```bash
   npm run prisma:generate
   ```

5. **Apply database migrations** (when migration files are available):

   ```bash
   npm run prisma:migrate
   ```

   Ensure roles, capabilities, and regions required by your deployment are present in MySQL (via seeds or manual SQL).

6. **Build TypeScript** (production):

   ```bash
   npm run build
   ```

---

## Running the Application

| Command              | Description                                      |
|----------------------|--------------------------------------------------|
| `npm run dev`        | Start development server with hot reload (`tsx`) |
| `npm run build`      | Compile TypeScript to `dist/`                    |
| `npm start`          | Run compiled output (`node dist/server.js`)      |
| `npm run prisma:studio` | Open Prisma Studio for database inspection    |

Development:

```bash
npm run dev
```

Production:

```bash
npm run build
npm start
```

The server logs the listening port on startup. Verify with `GET http://localhost:8080/health`.

---

## Project Structure

```
backend-ts/
├── prisma/
│   └── schema.prisma       # Database models and relations
├── src/
│   ├── app.ts              # Express application and middleware
│   ├── server.ts           # Entry point and upload directory setup
│   ├── config/
│   │   ├── env.ts          # Environment configuration
│   │   └── prisma.ts       # Prisma client singleton
│   ├── middleware/
│   │   ├── auth.ts         # JWT authentication
│   │   ├── authorize.ts    # Capability-based authorization
│   │   └── errorHandler.ts # 404 and global error handlers
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   ├── userRoutes.ts
│   │   └── teacherRoutes.ts
│   ├── services/
│   │   ├── authService.ts
│   │   ├── userService.ts
│   │   └── teacherService.ts
│   ├── types/
│   │   └── express.d.ts    # Extended Request typing (req.user)
│   └── utils/
│       ├── httpError.ts
│       └── uuid.ts         # UUID ↔ binary conversion
├── package.json
└── tsconfig.json
```

---

## Error Handling

| Status | Typical cause                                              |
|--------|------------------------------------------------------------|
| `400`  | Invalid input, missing file, invalid role/region ID          |
| `401`  | Missing/invalid token or authentication failure            |
| `403`  | Authenticated but missing required capability              |
| `404`  | Unknown route or resource not found                        |
| `409`  | Duplicate username, VAT, AMKA, or personal information     |
| `500`  | Unexpected server error                                    |

Errors are returned as JSON: `{ "message": "..." }`.

---

## License

ISC
