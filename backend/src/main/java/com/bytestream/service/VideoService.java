package com.bytestream.service;

import com.bytestream.dto.*;
import com.bytestream.model.Video;
import com.bytestream.model.VideoStatus;
import com.bytestream.repository.VideoRepository;
import com.bytestream.util.FileValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

/**
 * Central orchestrator for all video operations.
 *
 * Responsibilities:
 *   - Validate and save the uploaded file to /tmp
 *   - Create the DB record
 *   - Hand off to VideoProcessingService (async)
 *   - Update DB after processing completes
 *   - Serve metadata and manifest URLs
 *   - Handle deletion (DB + S3)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VideoService {

    private final VideoRepository       videoRepository;
    private final VideoProcessingService processingService;
    private final StorageService        storageService;
    private final FileValidator         fileValidator;

    @Value("${ffmpeg.tmp-dir:/tmp/bytestream/uploads}")
    private String tmpDir;

    // ── Upload ───────────────────────────────────────────────────────────────

    /**
     * Handles the full upload flow:
     *   1. Validate file
     *   2. Save to /tmp
     *   3. Create DB record (status = UPLOADING)
     *   4. Trigger async processing
     *   5. Return immediately with video ID and UPLOADING status
     */
    @Transactional
    public UploadResponse upload(MultipartFile file, String title, String description) throws IOException {
        // Validate before doing anything else
        fileValidator.validate(file);

        // Save raw file to /tmp
        Path uploadedFilePath = saveTempFile(file);
        log.info("File saved to temp: {}", uploadedFilePath);

        // Create video record in DB
        Video video = Video.builder()
                .title(title)
                .description(description)
                .originalFilename(file.getOriginalFilename())
                .status(VideoStatus.UPLOADING)
                .build();

        video.addLog("File received: " + file.getOriginalFilename() + " (" + file.getSize() / 1024 + " KB)");
        video = videoRepository.save(video);

        log.info("Video record created: {}", video.getId());

        // Kick off async processing — this returns immediately
        triggerProcessing(video.getId(), uploadedFilePath);

        return UploadResponse.from(video);
    }

    // ── List / Get ───────────────────────────────────────────────────────────

    public List<VideoSummary> listVideos() {
        return videoRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(VideoSummary::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public VideoResponse getVideo(UUID id) {
        Video video = findOrThrow(id);
        return VideoResponse.from(video);
    }

    // ── Manifest ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ManifestResponse getManifest(UUID id) {
        Video video = findOrThrow(id);

        if (video.getStatus() != VideoStatus.READY) {
            throw new IllegalStateException(
                    "Video is not ready for streaming. Current status: " + video.getStatus()
            );
        }

        return ManifestResponse.from(video);
    }

    // ── Delete ───────────────────────────────────────────────────────────────

    @Transactional
    public void deleteVideo(UUID id) {
        Video video = findOrThrow(id);

        // Delete S3 files first — if this fails we keep the DB record
        // so you can retry or investigate. Don't delete DB record on S3 failure.
        try {
            storageService.deleteVideoFiles(id);
        } catch (Exception e) {
            log.error("Failed to delete S3 files for video {}: {}", id, e.getMessage());
            throw new RuntimeException("Could not delete video files from storage. DB record preserved.");
        }

        videoRepository.delete(video);
        log.info("Video {} deleted.", id);
    }

    // ── Async Processing Chain ───────────────────────────────────────────────

    /**
     * This method runs asynchronously on the video-processor thread pool.
     *
     * Steps:
     *   1. Update status → PROCESSING
     *   2. Run FFmpeg (HLS + thumbnail)
     *   3. Upload results to S3
     *   4. Update status → READY (or FAILED)
     *   5. Clean up /tmp files
     */
    private void triggerProcessing(UUID videoId, Path uploadedFilePath) {
        Path hlsOutputDir = Paths.get(tmpDir, videoId.toString(), "hls");

        processingService.processVideo(uploadedFilePath, hlsOutputDir, videoId)
                .thenAccept(result -> {
                    try {
                        if (result.success()) {
                            handleProcessingSuccess(videoId, result, uploadedFilePath);
                        } else {
                            handleProcessingFailure(videoId, result.errorMessage(), uploadedFilePath);
                        }
                    } catch (Exception e) {
                        log.error("[{}] Unexpected error in processing callback: {}", videoId, e.getMessage(), e);
                        handleProcessingFailure(videoId, "Unexpected error: " + e.getMessage(), uploadedFilePath);
                    }
                })
                .exceptionally(ex -> {
                    log.error("[{}] Async processing threw exception: {}", videoId, ex.getMessage(), ex);
                    handleProcessingFailure(videoId, "Async error: " + ex.getMessage(), uploadedFilePath);
                    return null;
                });

        // Update status to PROCESSING right away so the client sees progress
        updateStatus(videoId, VideoStatus.PROCESSING, "Processing started.");
    }

    private void handleProcessingSuccess(
            UUID videoId,
            VideoProcessingService.ProcessingResult result,
            Path uploadedFilePath
    ) {
        Video video = findOrThrow(videoId);
        video.addLog("FFmpeg processing complete. Duration: " + result.durationSeconds() + "s");

        try {
            // Upload HLS segments + manifest to S3
            video.addLog("Uploading HLS output to S3...");
            String manifestUrl = storageService.uploadHlsOutput(videoId, result.hlsOutputDir());

            // Upload thumbnail
            String thumbnailUrl = storageService.uploadThumbnail(videoId, result.thumbnailPath());

            // Update the record
            video.setS3ManifestUrl(manifestUrl);
            video.setThumbnailUrl(thumbnailUrl);
            video.setDurationSeconds(result.durationSeconds());
            video.setStatus(VideoStatus.READY);
            video.addLog("Upload to S3 complete. Ready to stream.");

            videoRepository.save(video);
            log.info("[{}] Video is READY. Manifest: {}", videoId, manifestUrl);

        } catch (Exception e) {
            log.error("[{}] S3 upload failed: {}", videoId, e.getMessage(), e);
            video.markFailed("S3 upload failed: " + e.getMessage());
            videoRepository.save(video);
        } finally {
            cleanupTempFiles(uploadedFilePath, result.hlsOutputDir());
        }
    }

    private void handleProcessingFailure(UUID videoId, String errorMessage, Path uploadedFilePath) {
        Video video = findOrThrow(videoId);
        video.markFailed(errorMessage);
        videoRepository.save(video);
        cleanupTempFiles(uploadedFilePath, null);
        log.error("[{}] Processing failed: {}", videoId, errorMessage);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Path saveTempFile(MultipartFile file) throws IOException {
        Path uploadDir = Paths.get(tmpDir);
        Files.createDirectories(uploadDir);

        String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path destination = uploadDir.resolve(filename);
        file.transferTo(destination);
        return destination;
    }

    @Transactional
    protected void updateStatus(UUID videoId, VideoStatus status, String logMessage) {
        Video video = findOrThrow(videoId);
        video.setStatus(status);
        video.addLog(logMessage);
        videoRepository.save(video);
    }

    private Video findOrThrow(UUID id) {
        return videoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Video not found: " + id));
    }

    private void cleanupTempFiles(Path uploadedFile, Path hlsDir) {
        try {
            if (uploadedFile != null) Files.deleteIfExists(uploadedFile);
            if (hlsDir != null) {
                Files.walk(hlsDir)
                        .sorted(java.util.Comparator.reverseOrder())
                        .forEach(p -> {
                            try { Files.deleteIfExists(p); } catch (IOException ignored) {}
                        });
            }
            log.debug("Temp files cleaned up.");
        } catch (IOException e) {
            log.warn("Could not clean up temp files: {}", e.getMessage());
        }
    }
}
