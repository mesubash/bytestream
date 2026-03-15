# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Video Streaming Platform with a React frontend and Express backend.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS
- **Auth**: JWT via jsonwebtoken + bcryptjs
- **Video**: hls.js for HLS streaming
- **State**: Zustand (auth), React Query (data fetching)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── video-platform/     # React + Vite frontend (served at /)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (seed, etc.)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## API Endpoints

- `POST /api/auth/login` — Email/password login, returns JWT
- `POST /api/auth/register` — Register new user
- `GET /api/auth/me` — Get current user (requires Bearer token)
- `GET /api/videos` — List all videos (requires Bearer token)
- `POST /api/videos/upload` — Upload video as multipart/form-data (requires Bearer token)
- `GET /api/videos/:id` — Get video by ID (requires Bearer token)
- `GET /api/videos/:id/manifest` — Get HLS manifest URL (requires Bearer token)

## Frontend Pages

- `/login` — Login form (public)
- `/register` — Register form (public)
- `/dashboard` — Video grid (protected)
- `/watch/:id` — HLS video player (protected)
- `/upload` — Video upload form with progress (protected)

## Demo Credentials

- Email: `demo@example.com`
- Password: `demo123`

## Auth

JWT stored in localStorage via Zustand persist middleware (`video-platform-auth` key). Token auto-attached to all API requests via Authorization header.

## Database

- `users` table — id, email, password_hash, name, created_at
- `videos` table — id, title, thumbnail_url, duration, status, manifest_url, file_path, user_id, uploaded_at

## Database Commands

```bash
pnpm --filter @workspace/db run push          # Apply schema to DB
pnpm --filter @workspace/scripts run seed      # Seed demo user + videos
```

## Codegen

```bash
pnpm --filter @workspace/api-spec run codegen  # Regenerate API client + Zod schemas
```
