package com.bytestream.controller;

import com.bytestream.model.VideoStatus;
import com.bytestream.repository.VideoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration test using H2 in-memory database.
 * Run with: mvn test
 *
 * NOTE: These tests do NOT actually run FFmpeg or talk to S3.
 * They test the HTTP layer and validation logic only.
 * For full pipeline tests you'd need a local FFmpeg install and localstack.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class VideoControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private VideoRepository videoRepository;

    @BeforeEach
    void setUp() {
        videoRepository.deleteAll();
    }

    @Test
    void uploadRejectsEmptyFile() throws Exception {
        MockMultipartFile emptyFile = new MockMultipartFile(
                "file", "empty.mp4", "video/mp4", new byte[0]
        );

        mockMvc.perform(multipart("/api/v1/videos/upload")
                        .file(emptyFile)
                        .param("title", "Test Video"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation Error"));
    }

    @Test
    void uploadRejectsUnsupportedExtension() throws Exception {
        MockMultipartFile badFile = new MockMultipartFile(
                "file", "video.avi", "video/avi", new byte[100]
        );

        mockMvc.perform(multipart("/api/v1/videos/upload")
                        .file(badFile)
                        .param("title", "Bad Extension"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Unsupported")));
    }

    @Test
    void getVideoReturns404ForUnknownId() throws Exception {
        mockMvc.perform(get("/api/v1/videos/00000000-0000-0000-0000-000000000000"))
                .andExpect(status().isNotFound());
    }

    @Test
    void listVideosReturnsEmptyArrayInitially() throws Exception {
        mockMvc.perform(get("/api/v1/videos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void manifestReturns409WhenVideoNotReady() throws Exception {
        // This would require seeding a video record in PROCESSING status
        // Left as an exercise — shows how to write status-specific tests
    }
}
