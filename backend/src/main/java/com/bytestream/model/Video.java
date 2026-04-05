package com.bytestream.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "videos")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Video {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    // The original filename as uploaded — useful for display and debugging
    @Column(name = "original_filename")
    private String originalFilename;

    // Duration in seconds extracted by FFmpeg after processing
    @Column
    private Long durationSeconds;

    // Lifecycle status of this video
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VideoStatus status;

    // S3 URL to the .m3u8 HLS manifest — set after processing completes
    @Column(name = "s3_manifest_url")
    private String s3ManifestUrl;

    // S3 URL to the generated thumbnail
    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    // Processing event trail — stored as a JSON array in a TEXT column.
    // Simple but effective for debugging pipeline stages.
    @ElementCollection
    @CollectionTable(name = "video_processing_logs", joinColumns = @JoinColumn(name = "video_id"))
    @Column(name = "log_entry", columnDefinition = "TEXT")
    @OrderColumn(name = "log_order")
    @Builder.Default
    private List<String> processingLogs = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ── Convenience helpers ──────────────────────────────────────────────────

    public void addLog(String message) {
        this.processingLogs.add(LocalDateTime.now() + " | " + message);
    }

    public void markFailed(String reason) {
        this.status = VideoStatus.FAILED;
        addLog("FAILED: " + reason);
    }
}