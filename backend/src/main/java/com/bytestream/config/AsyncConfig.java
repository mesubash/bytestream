package com.bytestream.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Configures the thread pool used by @Async methods.
 *
 * Why a dedicated pool?
 *   FFmpeg processing is CPU-bound and can run for many seconds.
 *   If you use the default Spring task executor, you risk blocking threads
 *   that should be handling HTTP requests.
 *
 * Settings here are conservative for a learning/local environment.
 * On a real server you'd tune core/max pool size based on CPU core count.
 */
@Configuration
public class AsyncConfig implements AsyncConfigurer {

    @Bean(name = "videoProcessingExecutor")
    public Executor videoProcessingExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();

        // Threads always alive waiting for jobs
        executor.setCorePoolSize(2);

        // Maximum threads when queue fills up
        executor.setMaxPoolSize(4);

        // Jobs queue while all threads are busy
        executor.setQueueCapacity(20);

        executor.setThreadNamePrefix("video-processor-");

        // Don't silently drop tasks on shutdown — finish what's running
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);

        executor.initialize();
        return executor;
    }

    @Override
    public Executor getAsyncExecutor() {
        return videoProcessingExecutor();
    }
}