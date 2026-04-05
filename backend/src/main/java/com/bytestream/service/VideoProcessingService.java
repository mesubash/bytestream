package com.bytestream.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

/**
 * Runs FFmpeg to convert uploaded video files into HLS format.
 *
 * What this does:
 *   1. Segments the video into .ts chunks (default: 4 seconds each)
 *   2. Generates a playlist.m3u8 manifest
 *   3. Extracts a thumbnail from the first few seconds
 *   4. Probes the video to extract duration
 *
 * The @Async annotation on processVideo means it runs on the
 * videoProcessingExecutor thread pool (see AsyncConfig), not the HTTP thread.
 * This is why the upload endpoint can return immediately while processing continues.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VideoProcessingService {

    @Value("${ffmpeg.path:ffmpeg}")
    private String ffmpegPath;

    /**
     * Main processing entry point.
     *
     * @param inputFile   path to the uploaded video in /tmp
     * @param outputDir   directory where HLS files will be written
     * @param videoId     used for logging only
     * @return            CompletableFuture so callers can chain or monitor
     */
    @Async("videoProcessingExecutor")
    public CompletableFuture<ProcessingResult> processVideo(
            Path inputFile,
            Path outputDir,
            UUID videoId
    ) {
        log.info("[{}] Starting FFmpeg processing. Input: {}", videoId, inputFile);

        try {
            Files.createDirectories(outputDir);

            // Step 1: Segment into HLS
            runHlsSegmentation(inputFile, outputDir, videoId);

            // Step 2: Extract thumbnail from ~5 seconds in
            Path thumbnailPath = extractThumbnail(inputFile, outputDir, videoId);

            // Step 3: Probe duration
            long durationSeconds = probeDuration(inputFile, videoId);

            log.info("[{}] FFmpeg processing complete. Duration: {}s", videoId, durationSeconds);

            return CompletableFuture.completedFuture(
                    new ProcessingResult(outputDir, thumbnailPath, durationSeconds, true, null)
            );

        } catch (Exception e) {
            log.error("[{}] FFmpeg processing failed: {}", videoId, e.getMessage(), e);
            return CompletableFuture.completedFuture(
                    new ProcessingResult(null, null, 0, false, e.getMessage())
            );
        }
    }

    // ── FFmpeg Commands ──────────────────────────────────────────────────────

    /**
     * Segments the video into HLS format.
     *
     * FFmpeg flags explained:
     *   -i                      : input file
     *   -c:v libx264            : re-encode video with H.264
     *   -c:a aac                : re-encode audio with AAC
     *   -hls_time 4             : each segment is ~4 seconds
     *   -hls_playlist_type vod  : VOD playlist (all segments listed upfront)
     *   -hls_segment_filename   : segment naming pattern
     */
    private void runHlsSegmentation(Path inputFile, Path outputDir, UUID videoId) throws IOException, InterruptedException {
        Path manifestPath = outputDir.resolve("playlist.m3u8");
        Path segmentPattern = outputDir.resolve("segment_%03d.ts");

        String[] command = {
                ffmpegPath,
                "-i", inputFile.toString(),
                "-c:v", "libx264",
                "-c:a", "aac",
                "-hls_time", "4",
                "-hls_playlist_type", "vod",
                "-hls_segment_filename", segmentPattern.toString(),
                manifestPath.toString()
        };

        runCommand(command, videoId, "HLS segmentation");
    }

    /**
     * Grabs a single frame at the 5-second mark as a JPEG thumbnail.
     *
     * -ss 5        : seek to 5 seconds
     * -vframes 1   : extract exactly 1 frame
     * -q:v 2       : JPEG quality (2 = high quality, 31 = low)
     */
    private Path extractThumbnail(Path inputFile, Path outputDir, UUID videoId) throws IOException, InterruptedException {
        Path thumbnailPath = outputDir.resolve("thumbnail.jpg");

        String[] command = {
                ffmpegPath,
                "-i", inputFile.toString(),
                "-ss", "00:00:05",
                "-vframes", "1",
                "-q:v", "2",
                thumbnailPath.toString()
        };

        runCommand(command, videoId, "Thumbnail extraction");
        return thumbnailPath;
    }

    /**
     * Uses ffprobe to extract the duration of the input video.
     *
     * ffprobe outputs duration in seconds as a decimal. We parse and round it.
     */
    private long probeDuration(Path inputFile, UUID videoId) {
        // Replace ffmpeg path with ffprobe (they're always installed together)
        String ffprobePath = ffmpegPath.replace("ffmpeg", "ffprobe");

        String[] command = {
                ffprobePath,
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                inputFile.toString()
        };

        try {
            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(true);
            Process process = pb.start();

            String output = new BufferedReader(new InputStreamReader(process.getInputStream()))
                    .lines()
                    .findFirst()
                    .orElse("0");

            process.waitFor();
            return Math.round(Double.parseDouble(output.trim()));

        } catch (Exception e) {
            log.warn("[{}] Could not probe duration: {}", videoId, e.getMessage());
            return 0;
        }
    }

    // ── Shared command runner ────────────────────────────────────────────────

    private void runCommand(String[] command, UUID videoId, String stepName)
            throws IOException, InterruptedException {

        log.info("[{}] Running {}: {}", videoId, stepName, String.join(" ", command));

        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true);   // merge stderr into stdout so we get all output
        Process process = pb.start();

        // Stream FFmpeg output to our logs so you can watch processing in real time
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                log.debug("[{}][ffmpeg] {}", videoId, line);
            }
        }

        int exitCode = process.waitFor();
        if (exitCode != 0) {
            throw new RuntimeException(stepName + " failed with exit code " + exitCode);
        }

        log.info("[{}] {} completed successfully.", videoId, stepName);
    }

    // ── Result type ──────────────────────────────────────────────────────────

    /**
     * Carries the result of an async processing job back to VideoService.
     */
    public record ProcessingResult(
            Path hlsOutputDir,
            Path thumbnailPath,
            long durationSeconds,
            boolean success,
            String errorMessage
    ) {}
}
