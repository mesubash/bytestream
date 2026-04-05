package com.bytestream.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Validates uploaded files before they touch the processing pipeline.
 *
 * Two checks:
 *  1. File extension must be in the allowed list (mp4, mkv, mov)
 *  2. File size must not exceed the configured maximum
 *
 * Keeping this in a dedicated util class means the service stays clean
 * and you can add more checks (MIME type sniffing, virus scan, etc.) here later.
 */
@Component
public class FileValidator {

    @Value("${app.upload.max-size-bytes}")
    private long maxSizeBytes;

    @Value("${app.upload.allowed-extensions}")
    private List<String> allowedExtensions;

    public void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty or missing.");
        }

        validateExtension(file.getOriginalFilename());
        validateSize(file.getSize());
    }

    private void validateExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            throw new IllegalArgumentException("File has no extension.");
        }

        String ext = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();

        if (!allowedExtensions.contains(ext)) {
            throw new IllegalArgumentException(
                    "Unsupported file type: ." + ext +
                            ". Allowed: " + allowedExtensions
            );
        }
    }

    private void validateSize(long sizeBytes) {
        if (sizeBytes > maxSizeBytes) {
            long maxMB = maxSizeBytes / (1024 * 1024);
            throw new IllegalArgumentException(
                    "File too large. Maximum allowed size is " + maxMB + " MB."
            );
        }
    }
}