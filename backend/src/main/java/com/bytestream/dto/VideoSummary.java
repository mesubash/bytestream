package com.bytestream.dto;

import com.bytestream.model.Video;
import com.bytestream.model.VideoStatus;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class VideoSummary {
    private UUID id;
    private String title;
    private Long durationSeconds;
    private VideoStatus status;
    private String thumbnailUrl;
    private LocalDateTime createdAt;

    public static VideoSummary from(Video video) {
        return VideoSummary.builder()
                .id(video.getId())
                .title(video.getTitle())
                .durationSeconds(video.getDurationSeconds())
                .status(video.getStatus())
                .thumbnailUrl(video.getThumbnailUrl())
                .createdAt(video.getCreatedAt())
                .build();
    }
}
