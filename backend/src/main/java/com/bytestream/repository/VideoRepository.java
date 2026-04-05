package com.bytestream.repository;

import com.bytestream.model.Video;
import com.bytestream.model.VideoStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface VideoRepository extends JpaRepository<Video, UUID> {

    // All videos in a given status — useful for admin / monitoring views
    List<Video> findByStatusOrderByCreatedAtDesc(VideoStatus status);

    // All videos ordered newest-first (default listing)
    List<Video> findAllByOrderByCreatedAtDesc();

}