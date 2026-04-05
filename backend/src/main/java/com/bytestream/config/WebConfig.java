package com.bytestream.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

/**
 * Serves the local storage directory as static files over HTTP.
 *
 * This is what makes the HLS player able to fetch segments directly
 * from your server — the same pattern as S3, just local.
 *
 * URL pattern:
 *   GET /videos/files/**
 *
 * Maps to:
 *   ./bytestream-storage/** on disk
 *
 * Example:
 *   http://localhost:8080/videos/files/videos/{id}/playlist.m3u8
 *   → ./bytestream-storage/videos/{id}/playlist.m3u8
 *
 * When you switch to S3 later, delete this class entirely.
 * The manifest URLs in the DB already point to S3 — nothing else changes.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${storage.local.base-dir}")
    private String baseDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Resolve to absolute path so Spring can find it regardless of
        // where the app is launched from
        String absolutePath = Paths.get(baseDir).toAbsolutePath().toString();

        registry
                .addResourceHandler("/videos/files/**")
                .addResourceLocations("file:" + absolutePath + "/");
    }
}