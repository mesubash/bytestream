package com.bytestream.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory rate limiting using Bucket4j's token-bucket algorithm.
 *
 * How token buckets work:
 *   - Each client gets a bucket with N tokens.
 *   - Each request consumes one token.
 *   - Tokens refill at a fixed rate.
 *   - When the bucket is empty, requests are rejected (429).
 *
 * Keyed by IP address so each client has their own independent bucket.
 *
 * Limitation: in-memory means rate limits reset on server restart
 * and don't work across multiple instances. For a learning project
 * this is perfect. For prod you'd back the buckets with Redis.
 */
@Configuration
public class RateLimitConfig {

    @Value("${app.rate-limit.upload.capacity:5}")
    private int uploadCapacity;

    @Value("${app.rate-limit.upload.refill-minutes:1}")
    private int uploadRefillMinutes;

    @Value("${app.rate-limit.stream.capacity:100}")
    private int streamCapacity;

    @Value("${app.rate-limit.stream.refill-minutes:1}")
    private int streamRefillMinutes;

    // One bucket per IP per endpoint type
    private final Map<String, Bucket> uploadBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> streamBuckets  = new ConcurrentHashMap<>();

    public Bucket uploadBucketFor(String ipAddress) {
        return uploadBuckets.computeIfAbsent(ipAddress, k -> newBucket(uploadCapacity, uploadRefillMinutes));
    }

    public Bucket streamBucketFor(String ipAddress) {
        return streamBuckets.computeIfAbsent(ipAddress, k -> newBucket(streamCapacity, streamRefillMinutes));
    }

    private Bucket newBucket(int capacity, int refillMinutes) {
        Bandwidth limit = Bandwidth.classic(
                capacity,
                Refill.intervally(capacity, Duration.ofMinutes(refillMinutes))
        );
        return Bucket.builder().addLimit(limit).build();
    }
}
