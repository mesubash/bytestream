package com.bytestream.dto;
import com.bytestream.model.Video;
import com.bytestream.model.VideoStatus;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class VideoResponse {
    private UUID id;
    private String title;
    private String description;
    private String originalFilename;
    private Long durationSeconds;
    private VideoStatus status;
    private String thumbnailUrl;
    private List<String> processingLogs;
    private LocalDateTime createdAt;

    public static VideoResponse from(Video video) {
        return VideoResponse.builder()
                .id(video.getId())
                .title(video.getTitle())
                .description(video.getDescription())
                .originalFilename(video.getOriginalFilename())
                .durationSeconds(video.getDurationSeconds())
                .status(video.getStatus())
                .thumbnailUrl(video.getThumbnailUrl())
                .processingLogs(video.getProcessingLogs())
                .createdAt(video.getCreatedAt())
                .build();
    }
}

