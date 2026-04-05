package com.bytestream.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.Delete;
import software.amazon.awssdk.services.s3.model.DeleteObjectsRequest;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ObjectIdentifier;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

/**
 * Stores HLS segments, manifests, and thumbnails in Cloudflare R2.
 *
 * R2 is S3-compatible, so we use the standard AWS S3 SDK.
 *
 * Storage layout in R2:
 *
 *   bytestream-bucket/
 *       videos/{videoId}/
 *           playlist.m3u8
 *           segment_000.ts
 *           segment_001.ts
 *           thumbnail.jpg
 *
 * Files are served publicly at:
 *   {R2_PUBLIC_URL}/videos/{videoId}/playlist.m3u8
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StorageService {

    private final S3Client s3Client;

    @Value("${r2.bucket}")
    private String bucket;

    @Value("${r2.public-url}")
    private String publicUrl;

    /**
     * Uploads all HLS output files to R2.
     * Returns the public URL of the manifest (playlist.m3u8).
     */
    public String uploadHlsOutput(UUID videoId, Path hlsDirectory) throws IOException {
        log.info("Uploading HLS output for video {} to R2", videoId);

        try (var files = Files.list(hlsDirectory)) {
            for (Path file : files.toList()) {
                String key = buildKey(videoId, file.getFileName().toString());
                String contentType = guessContentType(file.getFileName().toString());

                s3Client.putObject(
                        PutObjectRequest.builder()
                                .bucket(bucket)
                                .key(key)
                                .contentType(contentType)
                                .build(),
                        RequestBody.fromFile(file)
                );
                log.debug("Uploaded {} to R2: {}", file.getFileName(), key);
            }
        }

        String manifestUrl = buildPublicUrl(videoId, "playlist.m3u8");
        log.info("HLS output stored for video {}. Manifest URL: {}", videoId, manifestUrl);
        return manifestUrl;
    }

    /**
     * Uploads the thumbnail to R2.
     * Returns the public URL.
     */
    public String uploadThumbnail(UUID videoId, Path thumbnailPath) throws IOException {
        String key = buildKey(videoId, "thumbnail.jpg");

        s3Client.putObject(
                PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .contentType("image/jpeg")
                        .build(),
                RequestBody.fromFile(thumbnailPath)
        );

        String url = buildPublicUrl(videoId, "thumbnail.jpg");
        log.info("Thumbnail stored for video {}: {}", videoId, url);
        return url;
    }

    /**
     * Deletes all R2 objects for a video.
     * Called when DELETE /videos/{id} is hit.
     */
    public void deleteVideoFiles(UUID videoId) throws IOException {
        String prefix = "videos/" + videoId + "/";

        var listResponse = s3Client.listObjectsV2(
                ListObjectsV2Request.builder()
                        .bucket(bucket)
                        .prefix(prefix)
                        .build()
        );

        var keys = listResponse.contents().stream()
                .map(obj -> ObjectIdentifier.builder().key(obj.key()).build())
                .toList();

        if (keys.isEmpty()) {
            log.warn("No R2 objects found for video {}. Skipping delete.", videoId);
            return;
        }

        s3Client.deleteObjects(
                DeleteObjectsRequest.builder()
                        .bucket(bucket)
                        .delete(Delete.builder().objects(keys).build())
                        .build()
        );

        log.info("Deleted {} R2 objects for video {}", keys.size(), videoId);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private String buildKey(UUID videoId, String filename) {
        return "videos/" + videoId + "/" + filename;
    }

    private String buildPublicUrl(UUID videoId, String filename) {
        return publicUrl + "/videos/" + videoId + "/" + filename;
    }

    private String guessContentType(String filename) {
        if (filename.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
        if (filename.endsWith(".ts")) return "video/mp2t";
        if (filename.endsWith(".jpg")) return "image/jpeg";
        return "application/octet-stream";
    }
}
