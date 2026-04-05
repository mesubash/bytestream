package com.bytestream.controller;

import com.bytestream.config.RateLimitConfig;
import com.bytestream.dto.*;
import com.bytestream.service.VideoService;
import io.github.bucket4j.Bucket;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * Main REST controller.
 *
 * All endpoints are under /api/v1/videos.
 * Rate limiting is applied per IP at the controller level via Bucket4j.
 *
 * Endpoints:
 *   POST   /videos/upload       - upload a video
 *   GET    /videos              - list all videos
 *   GET    /videos/{id}         - get video details + processing logs
 *   GET    /videos/{id}/manifest - get S3 manifest URL for streaming
 *   DELETE /videos/{id}         - delete video
 */
@RestController
@RequestMapping("/api/v1/videos")
@RequiredArgsConstructor
@Slf4j
public class VideoController {

    private final VideoService     videoService;
    private final RateLimitConfig  rateLimitConfig;

    // ── Upload ───────────────────────────────────────────────────────────────

    /**
     * Accepts a multipart upload.
     *
     * Form fields:
     *   file        - the video file
     *   title       - video title (required)
     *   description - optional description
     *
     * Returns 202 Accepted immediately. Processing happens async.
     */
    @PostMapping("/upload")
    public ResponseEntity<?> upload(
            @RequestParam("file")        MultipartFile file,
            @RequestParam("title")       String title,
            @RequestParam(value = "description", required = false, defaultValue = "") String description,
            HttpServletRequest request
    ) {
        // Rate limit check — 5 uploads per minute per IP
        String ip = getClientIp(request);
        Bucket bucket = rateLimitConfig.uploadBucketFor(ip);

        if (!bucket.tryConsume(1)) {
            log.warn("Upload rate limit hit for IP: {}", ip);
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(ErrorResponse.of(429, "Too Many Requests",
                            "Upload limit reached. Max 5 uploads per minute."));
        }

        try {
            UploadResponse response = videoService.upload(file, title, description);
            // 202 Accepted because processing isn't done yet
            return ResponseEntity.accepted().body(response);

        } catch (IllegalArgumentException e) {
            // Validation errors (bad extension, file too large, etc.)
            return ResponseEntity.badRequest()
                    .body(ErrorResponse.of(400, "Validation Error", e.getMessage()));

        } catch (IOException e) {
            log.error("Upload IO error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ErrorResponse.of(500, "Upload Failed", "Could not save file."));
        }
    }

    // ── List ─────────────────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<List<VideoSummary>> listVideos() {
        return ResponseEntity.ok(videoService.listVideos());
    }

    // ── Get Single Video ─────────────────────────────────────────────────────

    @GetMapping("/{id}")
    public ResponseEntity<?> getVideo(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(videoService.getVideo(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ErrorResponse.of(404, "Not Found", e.getMessage()));
        }
    }

    // ── Manifest ─────────────────────────────────────────────────────────────

    /**
     * Returns the S3 manifest URL so the frontend HLS player can start streaming.
     *
     * Rate limited — 100 requests per minute per IP.
     * In practice the frontend calls this once and then the player talks directly to S3.
     */
    @GetMapping("/{id}/manifest")
    public ResponseEntity<?> getManifest(
            @PathVariable UUID id,
            HttpServletRequest request
    ) {
        String ip = getClientIp(request);
        Bucket bucket = rateLimitConfig.streamBucketFor(ip);

        if (!bucket.tryConsume(1)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(ErrorResponse.of(429, "Too Many Requests",
                            "Streaming rate limit reached."));
        }

        try {
            return ResponseEntity.ok(videoService.getManifest(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ErrorResponse.of(404, "Not Found", e.getMessage()));
        } catch (IllegalStateException e) {
            // Video exists but isn't ready (still processing, or failed)
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ErrorResponse.of(409, "Not Ready", e.getMessage()));
        }
    }

    // ── Delete ───────────────────────────────────────────────────────────────

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteVideo(@PathVariable UUID id) {
        try {
            videoService.deleteVideo(id);
            return ResponseEntity.noContent().build();  // 204
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ErrorResponse.of(404, "Not Found", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ErrorResponse.of(500, "Delete Failed", e.getMessage()));
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Extracts the real client IP, respecting X-Forwarded-For from proxies/load balancers.
     */
    private String getClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}