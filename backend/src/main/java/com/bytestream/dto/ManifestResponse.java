package com.bytestream.dto;

import com.bytestream.model.Video;
import com.bytestream.model.VideoStatus;
import lombok.Builder;
import lombok.Data;
import java.util.UUID;

@Data
@Builder
public class ManifestResponse {
    private UUID videoId;
    private String manifestUrl;
    private VideoStatus status;

    public static ManifestResponse from(Video video) {
        return ManifestResponse.builder()
                .videoId(video.getId())
                .manifestUrl(video.getS3ManifestUrl())
                .status(video.getStatus())
                .build();
    }
}
