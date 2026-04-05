# ByteStream

A modern video streaming platform with HLS adaptive bitrate streaming and async video processing.

---

## What is ByteStream?

ByteStream is a full-stack video streaming platform that handles the complete video lifecycle — upload, processing, storage, and playback. Videos are uploaded through a React frontend, processed into HLS segments using FFmpeg on a Spring Boot backend, stored on local disk (swappable to S3), and streamed to the browser using adaptive bitrate playback.

---

## Architecture

```
Client (React Frontend)
        │
        ▼
  Spring Boot API
        │
        ├── Video Upload Service
        │
        ├── FFmpeg Processing Service
        │
        ├── Storage Service (local filesystem)
        │
        └── Video Controller
                │
                ▼
        Local Storage (./bytestream-storage/)
          (.m3u8 + .ts segments)
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

| Technology    | Purpose                               |
| ------------- | ------------------------------------- |
| Spring Boot 4 | REST API framework                    |
| FFmpeg        | Video processing and HLS segmentation |
| PostgreSQL    | Video metadata storage                |
| Bucket4j      | Rate limiting                         |
| Lombok        | Boilerplate reduction                 |

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
│   │   │   ├── cursor-trail.tsx
│   │   │   └── mouse-spotlight.tsx
│   │   ├── pages/            # Route pages
│   │   │   ├── dashboard.tsx # Video library grid
│   │   │   ├── upload.tsx    # Drag-and-drop upload
│   │   │   ├── watch.tsx     # Video player page
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
| s3_manifest_url   | VARCHAR   | URL to .m3u8 manifest                |
| thumbnail_url     | VARCHAR   | URL to thumbnail                     |
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

Returns the manifest URL for HLS playback. Only works when status is `READY`.
Returns `409 Conflict` if video is still processing or failed.
Rate limited: 100 requests/minute per IP.

### Delete Video

```
DELETE /api/v1/videos/{id}
```

Removes the database entry and all stored files. Returns `204 No Content`.

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
9. Segments, manifest, and thumbnail copied to local storage:
     ./bytestream-storage/videos/{videoId}/playlist.m3u8
     ./bytestream-storage/videos/{videoId}/segment_000.ts
     ./bytestream-storage/videos/{videoId}/thumbnail.jpg
10. Database updated: status = READY, manifest URL + thumbnail URL stored
11. Temp files cleaned up
```

---

## Streaming Flow

```
1. Frontend requests GET /api/v1/videos/{id}/manifest
2. Backend returns manifest URL
3. HLS.js fetches .m3u8 from the storage URL
4. Player downloads .ts segments via Spring static resource handler
```

---

## Storage Layout

Files are stored locally and served via Spring's static resource handler at `/videos/files/**`.

```
./bytestream-storage/
└── videos/
    └── {videoId}/
        ├── playlist.m3u8
        ├── segment_000.ts
        ├── segment_001.ts
        ├── segment_002.ts
        └── thumbnail.jpg
```

The `StorageService` is designed as a single class to swap — replace it with an S3 implementation when ready for production.

---

## Rate Limiting

Using Bucket4j (in-memory, per-IP token buckets):

| Endpoint  | Limit               |
| --------- | ------------------- |
| Upload    | 5 requests/minute   |
| Streaming | 100 requests/minute |

---

## File Upload Limits

- Max file size: 500MB
- Allowed formats: mp4, mkv, mov

---

## Frontend Routes

| Path         | Page                   |
| ------------ | ---------------------- |
| `/`          | Redirects to dashboard |
| `/dashboard` | Video library grid     |
| `/upload`    | Upload new video       |
| `/watch/:id` | Video player           |

---

## Frontend Visual Effects

- Canvas-based cursor particle trail with teal glow
- Radial gradient mouse spotlight
- 3D perspective card tilt on hover with glare
- Animated dot grid background
- Dark theme with glassmorphism panels

---

## Key Engineering Decisions

**Processing is async.** The upload endpoint returns immediately with `202 Accepted`. FFmpeg processing runs on a dedicated thread pool (2 core, 4 max, queue of 20) so HTTP threads aren't blocked.

**Local storage, S3-ready.** Storage is on local disk behind a `StorageService` abstraction. Only that one class needs to change for S3 migration.

**Single database table.** One `videos` table plus an element collection for processing logs. No premature complexity.

**Separate manifest endpoint.** The manifest URL is fetched via a dedicated endpoint that enforces the video must be `READY`, keeping the concerns clean.

---

## Getting Started

### Prerequisites

- Java 21+
- Node.js 18+
- FFmpeg installed and on PATH
- PostgreSQL running

### Database Setup

```sql
CREATE DATABASE bytestream;
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Runs on http://localhost:5173

### Backend

```bash
cd backend
./mvnw spring-boot:run
```

Runs on http://localhost:8080

---

## Environment Variables

### Frontend (`frontend/.env`)

```
VITE_API_BASE_URL=http://localhost:8080
```

### Backend (`application.yml`)

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/bytestream
    username: postgres
    password: postgres

storage:
  local:
    base-dir: ./bytestream-storage
    base-url: http://localhost:8080/videos/files

ffmpeg:
  path: ffmpeg
  tmp-dir: /tmp/bytestream/uploads
```
