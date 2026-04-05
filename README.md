# ByteStream

A modern video streaming platform with HLS adaptive bitrate streaming, Cloudflare R2 storage, and async video processing.

---

## What is ByteStream?

ByteStream is a full-stack video streaming platform that handles the complete video lifecycle — upload, processing, storage, and playback. Videos are uploaded through a React frontend, processed into HLS segments using FFmpeg on a Spring Boot backend, stored on Cloudflare R2, and streamed directly to the browser using adaptive bitrate playback.

The server never streams video segments directly. R2 handles segment delivery, keeping the backend lightweight and scalable.

---

## Architecture

```
Client (React + HLS.js)
        │
        ▼
  Spring Boot API ──→ FFmpeg
        │                 │
        ▼                 ▼
  PostgreSQL        Cloudflare R2
  (Neon DB)         (.m3u8 + .ts segments)
```

The API coordinates **upload → processing → storage → streaming**.

---

## Tech Stack

### Frontend

| Technology           | Purpose                          |
| -------------------- | -------------------------------- |
| React 19             | UI framework                     |
| TypeScript           | Type safety                      |
| Vite                 | Build tool and dev server        |
| Tailwind CSS 4       | Styling                          |
| TanStack React Query | Server state management          |
| HLS.js               | Adaptive bitrate video playback  |
| Wouter               | Client-side routing              |
| Radix UI             | Accessible UI primitives         |
| Axios                | HTTP client with upload progress |

### Backend

| Technology      | Purpose                               |
| --------------- | ------------------------------------- |
| Spring Boot 4   | REST API framework                    |
| FFmpeg          | Video processing and HLS segmentation |
| Cloudflare R2   | Segment and manifest storage          |
| PostgreSQL      | Video metadata storage (Neon)         |
| AWS S3 SDK v2   | R2 client (S3-compatible)             |
| Bucket4j        | Rate limiting                         |
| Lombok          | Boilerplate reduction                 |

---

## Project Structure

```
bytestream/
├── frontend/
│   ├── src/
│   │   ├── components/       # UI components
│   │   │   ├── ui/           # Reusable primitives (button, input, toast)
│   │   │   ├── layout.tsx    # App shell with navigation
│   │   │   ├── video-card.tsx
│   │   │   ├── video-player.tsx
│   │   │   ├── streaming-debug-panel.tsx
│   │   │   ├── cursor-trail.tsx
│   │   │   └── mouse-spotlight.tsx
│   │   ├── pages/            # Route pages
│   │   │   ├── dashboard.tsx # Video library grid
│   │   │   ├── upload.tsx    # Drag-and-drop upload
│   │   │   ├── watch.tsx     # Video player + debug panel
│   │   │   ├── about.tsx     # Project info
│   │   │   └── not-found.tsx
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # API client and utilities
│   │   ├── App.tsx           # Router setup
│   │   ├── main.tsx          # Entry point
│   │   └── index.css         # Global styles
│   ├── public/               # Static assets
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
└── backend/
    └── src/main/java/com/bytestream/
        ├── config/
        │   ├── AsyncConfig
        │   ├── R2Config
        │   ├── RateLimitConfig
        │   └── WebConfig
        ├── controller/
        │   └── VideoController
        ├── service/
        │   ├── VideoService
        │   ├── VideoProcessingService
        │   └── StorageService
        ├── repository/
        │   └── VideoRepository
        ├── model/
        │   ├── Video
        │   └── VideoStatus
        ├── dto/
        │   ├── VideoResponse
        │   ├── VideoSummary
        │   ├── UploadResponse
        │   ├── ManifestResponse
        │   └── ErrorResponse
        ├── exception/
        │   └── GlobalExceptionHandler
        ├── util/
        │   └── FileValidator
        └── ByteStreamApplication
```

---

## Database Design

Single table — `videos`:

| Column            | Type      | Description                          |
| ----------------- | --------- | ------------------------------------ |
| id                | UUID      | Primary key                          |
| title             | VARCHAR   | Video title                          |
| description       | TEXT      | Video description                    |
| original_filename | VARCHAR   | Original uploaded filename           |
| duration_seconds  | BIGINT    | Duration in seconds                  |
| status            | VARCHAR   | UPLOADING, PROCESSING, READY, FAILED |
| s3_manifest_url   | VARCHAR   | R2 URL to .m3u8 manifest             |
| thumbnail_url     | VARCHAR   | R2 URL to thumbnail                  |
| created_at        | TIMESTAMP | Upload timestamp                     |
| updated_at        | TIMESTAMP | Last modified timestamp              |

Element collection — `video_processing_logs`:

| Column    | Type    | Description           |
| --------- | ------- | --------------------- |
| video_id  | UUID    | FK to videos.id       |
| log_entry | TEXT    | Processing event log  |
| log_order | INTEGER | Order in sequence     |

---

## API Endpoints

All endpoints are prefixed with `/api/v1/videos`.

### Upload Video

```
POST /api/v1/videos/upload
Content-Type: multipart/form-data
```

Form fields: `file` (required), `title` (required), `description` (optional).
Returns `202 Accepted`. Processing runs async in background.
Rate limited: 5 requests/minute per IP.

### List Videos

```
GET /api/v1/videos
```

Returns all videos (newest first) as `VideoSummary[]`.

### Get Video

```
GET /api/v1/videos/{id}
```

Returns full video metadata including processing logs.

### Get Streaming Manifest

```
GET /api/v1/videos/{id}/manifest
```

Returns the R2 manifest URL for HLS playback. Only works when status is `READY`.
Returns `409 Conflict` if video is still processing or failed.
Rate limited: 100 requests/minute per IP.

### Delete Video

```
DELETE /api/v1/videos/{id}
```

Removes the database entry and all R2 files. Returns `204 No Content`.

---

## Upload and Processing Flow

```
1. Client uploads video file via POST /api/v1/videos/upload
2. Backend validates file (extension, size, rate limit)
3. File saved temporarily to /tmp/bytestream/uploads/
4. Database record created with status = UPLOADING
5. Async processing triggered (@Async on dedicated thread pool)
6. FFmpeg converts video to HLS segments:
     ffmpeg -i video.mp4 \
       -c:v libx264 -c:a aac \
       -hls_time 4 \
       -hls_playlist_type vod \
       -hls_segment_filename segment_%03d.ts \
       playlist.m3u8
7. Thumbnail extracted at 5-second mark
8. Duration probed via ffprobe
9. Segments, manifest, and thumbnail uploaded to Cloudflare R2:
     r2://streambyte/videos/{videoId}/playlist.m3u8
     r2://streambyte/videos/{videoId}/segment_000.ts
     r2://streambyte/videos/{videoId}/thumbnail.jpg
10. Database updated: status = READY, manifest URL + thumbnail URL stored
11. Temp files cleaned up
```

---

## Streaming Flow

```
1. Frontend requests GET /api/v1/videos/{id}/manifest
2. Backend returns R2 public URL to the .m3u8 manifest
3. HLS.js fetches .m3u8 directly from R2
4. Player downloads .ts segments directly from R2
5. Server is NOT involved in segment delivery
```

This is how production streaming systems reduce server load.

---

## R2 Storage Layout

```
streambyte/                          (R2 bucket)
└── videos/
    └── {videoId}/
        ├── playlist.m3u8
        ├── segment_000.ts
        ├── segment_001.ts
        ├── segment_002.ts
        └── thumbnail.jpg
```

---

## Streaming Debug Panel

The watch page includes a real-time **Streaming Internals** panel that shows:

- **Segment Map** — color-coded bar showing each segment's state (not loaded / downloading / buffered / played)
- **Live Stats** — current segment, buffer health, bandwidth estimate, total downloaded
- **Buffer Window** — visual bar showing actual buffered ranges vs playhead
- **Event Log** — real-time log of every segment download with size, time, and speed

---

## Rate Limiting

Using Bucket4j (in-memory, per-IP token buckets):

| Endpoint  | Limit               |
| --------- | ------------------- |
| Upload    | 5 requests/minute   |
| Streaming | 100 requests/minute |

---

## File Upload Limits

- Max file size: 50MB (frontend) / 500MB (backend)
- Allowed formats: mp4, mkv, mov

---

## Frontend Routes

| Path         | Page                   |
| ------------ | ---------------------- |
| `/`          | Redirects to dashboard |
| `/dashboard` | Video library grid     |
| `/upload`    | Upload new video       |
| `/watch/:id` | Video player + debug   |
| `/about`     | Project info           |

---

## Key Engineering Decisions

**Server does not stream segments.** Segments are served directly from Cloudflare R2. The backend only handles upload, processing, and metadata.

**Processing is async.** The upload endpoint returns immediately with `202 Accepted`. FFmpeg processing runs on a dedicated thread pool (2 core, 4 max, queue of 20) so HTTP threads aren't blocked.

**Single database table.** One `videos` table plus an element collection for processing logs. No premature complexity.

**Separate manifest endpoint.** The manifest URL is fetched via a dedicated endpoint that enforces the video must be `READY`, keeping the concerns clean.

---

## Getting Started

### Prerequisites

- Java 21+
- Node.js 18+
- FFmpeg installed and on PATH
- Docker (for containerized backend)
- Cloudflare R2 bucket with public access enabled
- Neon PostgreSQL database (or any PostgreSQL)

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Runs on http://localhost:5173

### Backend (Docker)

```bash
cd backend
cp .env.example .env   # fill in your credentials
docker compose up --build
```

Runs on http://localhost:8080

### Backend (Local)

```bash
cd backend
./mvnw spring-boot:run
```

Requires `.env` or environment variables to be set.

---

## Environment Variables

### Frontend (`frontend/.env`)

```
VITE_API_BASE_URL=http://localhost:8080
```

### Backend (`backend/.env`)

```
# Database (Neon Postgres)
SPRING_DATASOURCE_URL=jdbc:postgresql://ep-xxxxx.aws.neon.tech/neondb?sslmode=require
SPRING_DATASOURCE_USERNAME=neondb_owner
SPRING_DATASOURCE_PASSWORD=your_password

# Cloudflare R2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY=your_access_key
R2_SECRET_KEY=your_secret_key
R2_BUCKET=your_bucket_name
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev

# CORS
APP_CORS_ALLOWED_ORIGINS=http://localhost:5173,https://your-frontend.vercel.app
```
