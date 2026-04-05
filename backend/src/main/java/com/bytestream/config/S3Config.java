package com.bytestream.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/**
 * Wires up the AWS SDK S3 client.
 *
 * Credentials are resolved by DefaultCredentialsProvider — meaning they come
 * from environment variables (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY),
 * ~/.aws/credentials, or an IAM role if running on EC2/ECS.
 *
 * Never hardcode credentials in config files. DefaultCredentialsProvider
 * handles all the right sources in the right priority order.
 */
@Configuration
public class S3Config {

    @Value("${aws.region}")
    private String region;

    @Bean
    public S3Client s3Client() {
        return S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();
    }

    /**
     * S3Presigner is used to generate pre-signed URLs for thumbnails or
     * private segment access if you later move away from public buckets.
     */
    @Bean
    public S3Presigner s3Presigner() {
        return S3Presigner.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();
    }
}