# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Online gacha web application allowing users to create, manage, and execute gacha draws. All users can create and manage their own gachas. Built with React + Material-UI frontend and Node.js + Fastify backend using PostgreSQL and MinIO for image storage.

## Architecture

### Monorepo Structure
- `frontend/` - React 18 + Material-UI client application
- `web/` - Node.js + Fastify backend API server
- `doc/` - Design documentation and specifications
- `docker-compose.yml` - Containerized development environment

### Backend Architecture (`web/`)
- **Framework**: Fastify with JWT authentication (HTTPOnly cookies)
- **Database**: PostgreSQL with direct SQL queries (no ORM)
- **Image Storage**: MinIO (S3-compatible) with Sharp.js processing
- **Models**: `src/models/` - Database abstraction layer (e.g., `Gacha.js`)
- **Routes**: `src/routes/` - API endpoint handlers (`auth.js`, `gacha.js`, `admin.js`)
- **Middleware**: `src/middleware/auth.js` - JWT authentication (`fastify.authenticate`)
- **Validation**: Joi schemas in `src/schemas/validation.js`

### Frontend Architecture (`frontend/`)
- **Framework**: React 18 with Material-UI components
- **Routing**: React Router (`/gacha`, `/gacha/:id`, `/my-gacha`, `/profile`)
- **API Layer**: Centralized in `src/utils/api.js` with error handling
- **State Management**: React hooks (no Redux/Context API)
- **UI Libraries**: Material-UI, Framer Motion, Swiper.js

### Key API Patterns
- **Public APIs**: `/api/gachas` (public gacha access)
- **User APIs**: `/api/my/gachas` (owner-only gacha management)
- **Auth APIs**: `/api/auth` (authentication and profile)
- **Admin APIs**: `/api/admin` (advanced image management)

### Database Design
- **Core Tables**: `gachas`, `gacha_items`, `gacha_results`, `users`
- **Image Tables**: `gacha_images`, `image_variants` (Sharp.js processed variants)
- **Auth Tables**: `user_avatar_images`, `user_avatar_variants`
- **No roles/permissions** - all users have equal access to create gachas

## Development Commands

### Environment Setup
```bash
make setup              # Complete setup: docker + install + migrate + seed
make install-all        # Install all dependencies (web + frontend)
make docker-up          # Start Docker services
```

### Database Operations
```bash
make migrate            # Run pending migrations
make migrate-status     # Show migration status
make migrate-down       # Rollback last migration
make migrate-check      # Check migration status and image processing progress
make seed               # Insert seed data
```

### Development Tools
```bash
make docker-sh          # Access web container shell
make clean              # Remove all containers and volumes
```

### Service URLs
- Frontend: http://localhost:3000
- Backend: http://localhost:8080
- Database: PostgreSQL on port 5432
- MinIO: http://localhost:9001

## Code Conventions

### API Response Format
- Success: `{ data: {...}, pagination?: {...} }`
- Error: `{ error: "message", details?: "..." }`
- Japanese error messages for user-facing errors

### Authentication
- JWT tokens stored as HTTPOnly cookies
- All protected routes use `fastify.authenticate` middleware
- No admin roles - all users have equal privileges

### Database Queries
- Direct SQL queries with parameter binding (`$1, $2, ...`)
- Models handle complex queries and business logic
- Transactions for multi-table operations

### Image Management
- Sharp.js processing creates multiple variants (AVIF/WebP/JPEG)
- MinIO storage with base object keys and variant tracking
- Progressive image loading with format fallbacks

### Validation
- Backend: Joi schemas for request validation
- Frontend: Yup schemas with React Hook Form
- Consistent field naming (camelCase in JS, snake_case in DB)

### File Organization
- Models contain database logic and business rules
- Routes handle HTTP requests and response formatting
- Utils provide shared functionality (MinIO, SSE, image processing)
- Middleware handles cross-cutting concerns

## Key Implementation Notes
- All users can create and manage gachas (no admin-only features)
- Gacha draws use equal probability distribution
- Real-time stock updates via Server-Sent Events (SSE)
- Image uploads support multiple formats with automatic optimization
- Pagination implemented on both API and frontend levels
- No testing framework currently configured