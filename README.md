# ByteStream

A modern video streaming platform with HLS adaptive bitrate streaming, cloud storage, and async video processing.

---

## What is ByteStream?

ByteStream is a full-stack video streaming platform that handles the complete video lifecycle — upload, processing, storage, and playback. Videos are uploaded through a React frontend, processed into HLS segments using FFmpeg on a Spring Boot backend, stored in AWS S3, and streamed directly to the browser using adaptive bitrate playback.

The server never streams video segments directly. S3 handles segment delivery, keeping the backend lightweight and scalable.

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
        ├── S3 Storage Service
        │
        └── Streaming Controller
                │
                ▼
             AWS S3
      (.m3u8 + .ts segments)
```

The API coordinates **upload → processing → storage → streaming**.

---

## Tech Stack

### Frontend

| Technology          | Purpose                          |
| ------------------- | -------------------------------- |
| React 19            | UI framework                     |
| TypeScript          | Type safety                      |
| Vite                | Build tool and dev server        |
| Tailwind CSS 4      | Styling                          |
| TanStack React Query| Server state management          |
| HLS.js              | Adaptive bitrate video playback  |
| Wouter              | Client-side routing              |
| Radix UI            | Accessible UI primitives         |
| Axios               | HTTP client with upload progress |

### Backend

| Technology    | Purpose                        |
| ------------- | ------------------------------ |
| Spring Boot   | REST API framework             |
| FFmpeg        | Video processing and HLS segmentation |
| AWS S3        | Segment and manifest storage   |
| PostgreSQL    | Video metadata storage         |
| Bucket4j      | Rate limiting                  |

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
    └── com.bytestream
        ├── config/
        │   ├── S3Config
        │   └── RateLimitConfig
        ├── controller/
        │   ├── VideoController
        │   └── StreamingController
        ├── service/
        │   ├── VideoService
        │   ├── VideoProcessingService
        │   ├── StreamingService
        │   └── StorageService
        ├── repository/
        │   └── VideoRepository
        ├── model/
        │   └── Video
        ├── dto/
        │   ├── VideoResponse
        │   └── UploadResponse
        ├── util/
        │   └── FileValidator
        └── ByteStreamApplication
```

---

## Database Design

Single table — `videos`:

| Column           | Type      | Description                    |
| ---------------- | --------- | ------------------------------ |
| id               | UUID      | Primary key                    |
| title            | VARCHAR   | Video title                    |
| description      | TEXT      | Video description              |
| duration         | INTEGER   | Duration in seconds            |
| status           | ENUM      | UPLOADING, PROCESSING, READY, FAILED |
| s3_manifest_url  | VARCHAR   | S3 URL to .m3u8 manifest       |
| thumbnail_url    | VARCHAR   | S3 URL to thumbnail            |
| created_at       | TIMESTAMP | Upload timestamp               |

---

## API Endpoints

### Upload Video

```
POST /videos/upload
Content-Type: multipart/form-data
```

Accepts video file, validates format and size, triggers async processing.

### List Videos

```
GET /videos
```

Returns all videos with id, title, thumbnail, duration, and status.

### Get Video

```
GET /videos/{id}
```

Returns full video metadata.

### Get Streaming Manifest

```
GET /videos/{id}/manifest
```

Returns the S3 manifest URL. The player fetches segments directly from S3.

### Delete Video

```
DELETE /videos/{id}
```

Removes the database entry and all S3 files.

---

## Upload and Processing Flow

```
1. Client uploads video file via POST /videos/upload
2. Backend validates file (format, size, rate limit)
3. File saved temporarily to /tmp/uploads/
4. Database record created with status = UPLOADING
5. Async processing triggered (@Async)
6. FFmpeg converts video to HLS segments:
     ffmpeg -i video.mp4 \
       -hls_time 4 \
       -hls_playlist_type vod \
       -hls_segment_filename segment_%03d.ts \
       playlist.m3u8
7. Segments and manifest uploaded to S3:
     s3://bytestream/videos/{videoId}/playlist.m3u8
     s3://bytestream/videos/{videoId}/segment_001.ts
     s3://bytestream/videos/{videoId}/segment_002.ts
8. Database updated: status = READY, manifest URL stored
9. Temp files cleaned up
```

---

## Streaming Flow

```
1. Frontend requests GET /videos/{id}/manifest
2. Backend returns S3 manifest URL
3. HLS.js fetches .m3u8 from S3
4. Player downloads .ts segments directly from S3
5. Server is NOT involved in segment delivery
```

This is how production streaming systems reduce server load.

---

## S3 Storage Layout

```
bytestream-bucket/
└── videos/
    └── {videoId}/
        ├── playlist.m3u8
        ├── segment_001.ts
        ├── segment_002.ts
        └── segment_003.ts
```

---

## Rate Limiting

Using Bucket4j:

| Endpoint         | Limit              |
| ---------------- | ------------------ |
| Upload           | 5 requests/minute  |
| Streaming        | 100 requests/minute|

## File Upload Limits

- Max file size: 500MB
- Allowed formats: mp4, mkv, mov

---

## Frontend Routes

| Path          | Page            |
| ------------- | --------------- |
| `/`           | Redirects to dashboard |
| `/dashboard`  | Video library grid     |
| `/upload`     | Upload new video       |
| `/watch/:id`  | Video player           |

---

## Frontend Visual Effects

- Canvas-based cursor particle trail with teal glow
- Radial gradient mouse spotlight
- 3D perspective card tilt on hover with glare
- Animated dot grid background
- Dark theme with glassmorphism panels

---

## Key Engineering Decisions

**Server does not stream segments.** Segments are served directly from S3 for better scalability. The backend only handles upload, processing, and metadata management.

**Processing is async.** The upload endpoint returns immediately. FFmpeg processing runs in the background so the client isn't blocked.

**Single database table.** One `videos` table is all that's needed. No premature complexity.

---

## Getting Started

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on http://localhost:5173

### Backend

```bash
cd backend
./mvnw spring-boot:run
```

Requires:
- Java 21+
- FFmpeg installed locally
- PostgreSQL running
- AWS S3 bucket configured

---

## Environment Variables (Backend)

```
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/bytestream
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=password
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=bytestream-bucket
AWS_REGION=us-east-1
```
