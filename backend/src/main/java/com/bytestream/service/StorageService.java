package com.bytestream.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.util.Comparator;
import java.util.UUID;

/**
 * Local filesystem replacement for S3-based StorageService.
 *
 * Instead of uploading to S3, HLS segments and thumbnails are copied
 * into a local directory that Spring Boot serves as static files.
 *
 * Storage layout (mirrors S3 layout exactly — easy to swap back to S3 later):
 *
 *   ./bytestream-storage/
 *       videos/
 *           {videoId}/
 *               playlist.m3u8
 *               segment_000.ts
 *               segment_001.ts
 *               thumbnail.jpg
 *
 * Files are served at:
 *   http://localhost:8080/videos/files/videos/{videoId}/playlist.m3u8
 *
 * The URL structure is intentionally identical to what S3 would serve.
 * When you're ready to switch to S3 later, only this class changes.
 */
@Service
@Slf4j
public class StorageService {

    @Value("${storage.local.base-dir}")
    private String baseDir;

    @Value("${storage.local.base-url}")
    private String baseUrl;

    /**
     * Copies all HLS output files into local storage.
     * Returns the public URL of the manifest (playlist.m3u8).
     */
    public String uploadHlsOutput(UUID videoId, Path hlsDirectory) throws IOException {
        Path destination = resolveVideoDir(videoId);
        Files.createDirectories(destination);

        log.info("Copying HLS output for video {} to {}", videoId, destination);

        try (var files = Files.list(hlsDirectory)) {
            for (Path file : files.toList()) {
                Path target = destination.resolve(file.getFileName());
                Files.copy(file, target, StandardCopyOption.REPLACE_EXISTING);
                log.debug("Copied {} to {}", file.getFileName(), target);
            }
        }

        String manifestUrl = buildUrl(videoId, "playlist.m3u8");
        log.info("HLS output stored for video {}. Manifest URL: {}", videoId, manifestUrl);
        return manifestUrl;
    }

    /**
     * Copies the thumbnail into local storage.
     * Returns the public URL.
     */
    public String uploadThumbnail(UUID videoId, Path thumbnailPath) throws IOException {
        Path destination = resolveVideoDir(videoId);
        Files.createDirectories(destination);

        Path target = destination.resolve("thumbnail.jpg");
        Files.copy(thumbnailPath, target, StandardCopyOption.REPLACE_EXISTING);

        String url = buildUrl(videoId, "thumbnail.jpg");
        log.info("Thumbnail stored for video {}: {}", videoId, url);
        return url;
    }

    /**
     * Deletes the entire directory for a video.
     * Called when DELETE /videos/{id} is hit.
     */
    public void deleteVideoFiles(UUID videoId) throws IOException {
        Path videoDir = resolveVideoDir(videoId);

        if (!Files.exists(videoDir)) {
            log.warn("No local storage directory found for video {}. Skipping delete.", videoId);
            return;
        }

        // Walk and delete deepest files first, then the directory itself
        Files.walk(videoDir)
                .sorted(Comparator.reverseOrder())
                .forEach(path -> {
                    try {
                        Files.deleteIfExists(path);
                    } catch (IOException e) {
                        log.warn("Could not delete {}: {}", path, e.getMessage());
                    }
                });

        log.info("Deleted local storage for video {}", videoId);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Path resolveVideoDir(UUID videoId) {
        return Paths.get(baseDir, "videos", videoId.toString());
    }

    private String buildUrl(UUID videoId, String filename) {
        // baseUrl = http://localhost:8080/videos/files
        // Result  = http://localhost:8080/videos/files/videos/{videoId}/playlist.m3u8
        return baseUrl + "/videos/" + videoId + "/" + filename;
    }
}