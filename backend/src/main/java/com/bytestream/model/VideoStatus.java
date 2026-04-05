package com.bytestream.model;

public enum VideoStatus {

    /**
     * File is being received from the client.
     */
    UPLOADING,

    /**
     * File received. FFmpeg processing is running in the background.
     */
    PROCESSING,

    /**
     * Processing done. Segments are in S3. Ready to stream.
     */
    READY,

    /**
     * Something went wrong. Check processingLogs for details.
     */
    FAILED
}