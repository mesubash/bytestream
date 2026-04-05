# ByteStream

A learning-focused video streaming backend built with Spring Boot, FFmpeg, AWS S3, and HLS.

---

## What You Will Learn

- Video upload and multipart file handling
- Async processing with Spring `@Async` and thread pools
- FFmpeg for HLS segmentation and thumbnail extraction
- AWS S3 for cloud storage
- Token-bucket rate limiting with Bucket4j
- Clean layered architecture (Controller → Service → Repository)
- Processing lifecycle state machines (UPLOADING → PROCESSING → READY → FAILED)

---

## Prerequisites

| Tool        | Version     | Notes                                      |
|-------------|-------------|--------------------------------------------|
| Java        | 21+         | `java -version`                            |
| Maven       | 3.9+        | `mvn -version`                             |
| PostgreSQL  | 15+         | Running locally on port 5432               |
| FFmpeg      | 6+          | `ffmpeg -version` — must be on PATH        |
| AWS Account | —           | S3 bucket created, IAM credentials ready   |

---

## Project Setup

### 1. Clone and enter the project

```bash
git clone <your-repo-url>
cd bytestream
```

---

### 2. Create the PostgreSQL database

```sql
CREATE DATABASE bytestream;
```

Run this once. Hibernate will create the tables automatically on first boot
(`ddl-auto: update` in `application.yml`).

---

### 3. Create the S3 bucket

In AWS Console or CLI:

```bash
aws s3api create-bucket \
  --bucket bytestream-videos \
  --region us-east-1
```

Enable public read access on the bucket (required for HLS segments to be
fetched directly by the player without going through your server):

```bash
aws s3api put-bucket-acl \
  --bucket bytestream-videos \
  --acl public-read
```

If you prefer private buckets, swap the `PUBLIC_READ` ACL in `StorageService`
for pre-signed URLs. The architecture supports both.

---

### 4. Set environment variables

**Never put credentials in `application.yml`.** Set them in your shell:

```bash
# AWS
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key

# If your bucket is in a different region, override:
# export AWS_DEFAULT_REGION=ap-southeast-1
```

Add these to your `~/.bashrc` or `~/.zshrc` to persist them.

---

### 5. Verify FFmpeg is installed

```bash
ffmpeg -version
ffprobe -version
```

Both commands must work. `ffprobe` is used to extract video duration and
ships with FFmpeg by default.

**Install FFmpeg if missing:**

```bash
# Ubuntu / Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html and add to PATH
```

---

### 6. Review configuration

Open `src/main/resources/application.yml` and check:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/bytestream
    username: postgres       # change if your Postgres user is different
    password: postgres       # change to your Postgres password

aws:
  region: us-east-1          # change to your bucket's region
  s3:
    bucket-name: bytestream-videos   # change if you used a different name

ffmpeg:
  path: ffmpeg               # full path if ffmpeg is not on PATH
  tmp-dir: /tmp/bytestream/uploads
```

---

### 7. Run the application

```bash
mvn spring-boot:run
```

You should see:

```
Started ByteStreamApplication in X.XXX seconds
```

The API is now available at: `http://localhost:8080/api/v1/videos`

---

## API Reference

### Upload a Video

```
POST /api/v1/videos/upload
Content-Type: multipart/form-data
```

| Field         | Type   | Required | Description                   |
|---------------|--------|----------|-------------------------------|
| `file`        | file   | yes      | mp4, mkv, or mov only         |
| `title`       | string | yes      | Display title                 |
| `description` | string | no       | Optional description          |

**Example with curl:**

```bash
curl -X POST http://localhost:8080/api/v1/videos/upload \
  -F "file=@/path/to/your/video.mp4" \
  -F "title=My First Video" \
  -F "description=Testing ByteStream"
```

**Response (202 Accepted):**

```json
{
  "videoId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "My First Video",
  "status": "UPLOADING",
  "message": "Upload received. Processing started in the background."
}
```

---

### List All Videos

```
GET /api/v1/videos
```

```bash
curl http://localhost:8080/api/v1/videos
```

**Response (200 OK):**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "My First Video",
    "durationSeconds": 142,
    "status": "READY",
    "thumbnailUrl": "https://bytestream-videos.s3.us-east-1.amazonaws.com/videos/550e.../thumbnail.jpg",
    "createdAt": "2025-01-15T10:30:00"
  }
]
```

---

### Get Video Details

```
GET /api/v1/videos/{id}
```

```bash
curl http://localhost:8080/api/v1/videos/550e8400-e29b-41d4-a716-446655440000
```

**Response includes `processingLogs`** — this is your pipeline audit trail:

```json
{
  "id": "550e8400-...",
  "title": "My First Video",
  "status": "READY",
  "durationSeconds": 142,
  "processingLogs": [
    "2025-01-15T10:30:01 | File received: video.mp4 (45231 KB)",
    "2025-01-15T10:30:01 | Processing started.",
    "2025-01-15T10:30:45 | FFmpeg processing complete. Duration: 142s",
    "2025-01-15T10:30:45 | Uploading HLS output to S3...",
    "2025-01-15T10:30:52 | Upload to S3 complete. Ready to stream."
  ]
}
```

**Poll this endpoint** while a video is processing to watch the pipeline in real time.

---

### Get Streaming Manifest

```
GET /api/v1/videos/{id}/manifest
```

```bash
curl http://localhost:8080/api/v1/videos/550e8400-e29b-41d4-a716-446655440000/manifest
```

**Response (200 OK — only when status is READY):**

```json
{
  "videoId": "550e8400-...",
  "manifestUrl": "https://bytestream-videos.s3.us-east-1.amazonaws.com/videos/550e.../playlist.m3u8",
  "status": "READY"
}
```

Feed `manifestUrl` directly to an HLS player (hls.js, Video.js, or native Safari).

**Response (409 Conflict — if still processing):**

```json
{
  "status": 409,
  "error": "Not Ready",
  "message": "Video is not ready for streaming. Current status: PROCESSING"
}
```

---

### Delete a Video

```
DELETE /api/v1/videos/{id}
```

```bash
curl -X DELETE http://localhost:8080/api/v1/videos/550e8400-e29b-41d4-a716-446655440000
```

Deletes the database record **and** all S3 files for this video.

**Response: 204 No Content**

---

## Rate Limits

| Endpoint  | Limit              |
|-----------|--------------------|
| `/upload` | 5 requests/minute  |
| `/manifest` | 100 requests/minute |

Exceeding the limit returns **429 Too Many Requests**.

---

## Understanding the Processing Pipeline

When you upload a video, here is what happens:

```
1. POST /upload received
        │
        ▼
2. FileValidator checks extension + size
        │
        ▼
3. File saved to /tmp/bytestream/uploads/
        │
        ▼
4. Video DB record created (status = UPLOADING)
        │
        ▼
5. Upload endpoint returns 202 immediately ◄── client gets response here
        │
        ▼ (background thread — videoProcessingExecutor)
6. Status updated → PROCESSING
        │
        ▼
7. FFmpeg segments video into HLS (.m3u8 + .ts files)
        │
        ▼
8. FFmpeg extracts thumbnail (frame at 5s)
        │
        ▼
9. ffprobe extracts duration in seconds
        │
        ▼
10. All HLS files uploaded to S3
        │
        ▼
11. DB record updated → status = READY, manifestUrl saved
        │
        ▼
12. /tmp files cleaned up
```

If anything fails at steps 7–11, status becomes `FAILED` and the error
is recorded in `processingLogs`.

---

## S3 Storage Layout

```
bytestream-videos/
└── videos/
    └── {videoId}/
        ├── playlist.m3u8      ← HLS manifest
        ├── segment_000.ts     ← 4-second video chunk
        ├── segment_001.ts
        ├── segment_002.ts
        ├── ...
        └── thumbnail.jpg
```

---

## Running Tests

```bash
mvn test
```

Tests use H2 in-memory database (no Postgres needed) and do not make real
S3 or FFmpeg calls. They test HTTP layer, validation, and response structure.

---

## Common Errors

### `FFmpeg not found`
Make sure FFmpeg is installed and on your PATH. Test with `ffmpeg -version`.
If it's installed to a custom path, update `ffmpeg.path` in `application.yml`.

### `Access Denied` from S3
Check that your AWS credentials are set and that your IAM user has
`s3:PutObject`, `s3:DeleteObject`, and `s3:ListBucket` permissions on the bucket.

### `Connection refused` (PostgreSQL)
Make sure PostgreSQL is running: `pg_ctl status` or `sudo service postgresql status`.

### `Video stuck in PROCESSING`
Check application logs for FFmpeg errors. The async thread may have silently failed.
The `processingLogs` on the video record will show where it stopped.

---

## Project Structure

```
com.bytestream
├── config/
│   ├── S3Config.java             AWS S3 client bean
│   ├── AsyncConfig.java          Thread pool for @Async processing
│   └── RateLimitConfig.java      Bucket4j token buckets per IP
│
├── controller/
│   ├── VideoController.java      All HTTP endpoints
│   └── GlobalExceptionHandler.java  Consistent JSON error responses
│
├── service/
│   ├── VideoService.java         Upload orchestration + CRUD
│   ├── VideoProcessingService.java  FFmpeg commands + @Async
│   └── StorageService.java       S3 upload/delete/URL building
│
├── repository/
│   └── VideoRepository.java      Spring Data JPA queries
│
├── model/
│   ├── Video.java                Entity with processing log trail
│   └── VideoStatus.java          UPLOADING / PROCESSING / READY / FAILED
│
├── dto/
│   ├── UploadResponse.java
│   ├── VideoResponse.java
│   ├── VideoSummary.java
│   ├── ManifestResponse.java
│   └── ErrorResponse.java
│
└── util/
    └── FileValidator.java        Extension + size checks
```

---

## What to Build Next

Once this backend is running, natural next steps:

1. **Frontend** — Connect hls.js to the manifest URL and build a player
2. **Multiple resolutions** — Run FFmpeg at 480p and 720p for adaptive bitrate
3. **Progress endpoint** — `GET /videos/{id}/status` with Server-Sent Events
4. **Auth** — Add Spring Security with JWT so only owners can delete their videos
5. **Job queue** — Replace `@Async` with Redis + a worker for distributed processing