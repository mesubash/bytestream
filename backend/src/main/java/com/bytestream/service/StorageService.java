package com.bytestream.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

/**
 * Handles all S3 operations.
 *
 * Responsibilities:
 *   - Upload individual files (segments, manifests, thumbnails)
 *   - Upload an entire directory of HLS output
 *   - Build the public S3 URL for a given key
 *   - Delete all files for a video (cleanup)
 *
 * S3 layout:
 *   videos/{videoId}/playlist.m3u8
 *   videos/{videoId}/segment_000.ts
 *   videos/{videoId}/segment_001.ts
 *   ...
 *   videos/{videoId}/thumbnail.jpg
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StorageService {

    private final S3Client s3Client;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Value("${aws.region}")
    private String region;

    /**
     * Uploads all files in the given directory to S3 under videos/{videoId}/.
     * Returns the public URL of the HLS manifest (playlist.m3u8).
     */
    public String uploadHlsOutput(UUID videoId, Path hlsDirectory) throws IOException {
        log.info("Uploading HLS output for video {} from {}", videoId, hlsDirectory);

        List<Path> files;
        try (var stream = Files.list(hlsDirectory)) {
            files = stream.toList();
        }

        for (Path file : files) {
            String s3Key = "videos/" + videoId + "/" + file.getFileName().toString();
            uploadFile(file, s3Key, contentTypeFor(file.getFileName().toString()));
            log.debug("Uploaded {} -> s3://{}/{}", file.getFileName(), bucketName, s3Key);
        }

        String manifestKey = "videos/" + videoId + "/playlist.m3u8";
        String manifestUrl = buildPublicUrl(manifestKey);
        log.info("HLS upload complete for video {}. Manifest: {}", videoId, manifestUrl);
        return manifestUrl;
    }

    /**
     * Uploads a single thumbnail file.
     */
    public String uploadThumbnail(UUID videoId, Path thumbnailPath) throws IOException {
        String s3Key = "videos/" + videoId + "/thumbnail.jpg";
        uploadFile(thumbnailPath, s3Key, "image/jpeg");
        return buildPublicUrl(s3Key);
    }

    /**
     * Deletes all S3 objects under videos/{videoId}/.
     * Called when a video is deleted via the API.
     */
    public void deleteVideoFiles(UUID videoId) {
        String prefix = "videos/" + videoId + "/";
        log.info("Deleting S3 objects with prefix: {}", prefix);

        // List all objects under this video's prefix
        ListObjectsV2Request listRequest = ListObjectsV2Request.builder()
                .bucket(bucketName)
                .prefix(prefix)
                .build();

        ListObjectsV2Response listResponse = s3Client.listObjectsV2(listRequest);

        if (listResponse.contents().isEmpty()) {
            log.warn("No S3 objects found for prefix: {}", prefix);
            return;
        }

        // Build delete request for all found objects
        List<ObjectIdentifier> objectsToDelete = listResponse.contents().stream()
                .map(obj -> ObjectIdentifier.builder().key(obj.key()).build())
                .toList();

        DeleteObjectsRequest deleteRequest = DeleteObjectsRequest.builder()
                .bucket(bucketName)
                .delete(Delete.builder().objects(objectsToDelete).build())
                .build();

        s3Client.deleteObjects(deleteRequest);
        log.info("Deleted {} S3 objects for video {}", objectsToDelete.size(), videoId);
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private void uploadFile(Path localPath, String s3Key, String contentType) throws IOException {
        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(s3Key)
                .contentType(contentType)
                // Make objects publicly readable so the HLS player can fetch segments directly.
                // For private content you'd remove this and use pre-signed URLs instead.
                .acl(ObjectCannedACL.PUBLIC_READ)
                .build();

        s3Client.putObject(request, RequestBody.fromFile(localPath));
    }

    private String buildPublicUrl(String s3Key) {
        return "https://" + bucketName + ".s3." + region + ".amazonaws.com/" + s3Key;
    }

    private String contentTypeFor(String filename) {
        if (filename.endsWith(".m3u8")) return "application/x-mpegURL";
        if (filename.endsWith(".ts"))   return "video/MP2T";
        if (filename.endsWith(".jpg"))  return "image/jpeg";
        return "application/octet-stream";
    }
}