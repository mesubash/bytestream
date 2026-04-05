package com.bytestream.dto;

import com.bytestream.model.Video;
import com.bytestream.model.VideoStatus;
import lombok.Builder;
import lombok.Data;
import java.util.UUID;

@Data
@Builder
public class UploadResponse {
    private UUID videoId;
    private String title;
    private VideoStatus status;
    private String message;

    public static UploadResponse from(Video video) {
        return UploadResponse.builder()
                .videoId(video.getId())
                .title(video.getTitle())
                .status(video.getStatus())
                .message("Upload received. Processing started in the background.")
                .build();
    }
}
