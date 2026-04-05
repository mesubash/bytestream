package com.bytestream;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class ByteStreamApplication {

    public static void main(String[] args) {
        SpringApplication.run(ByteStreamApplication.class, args);
    }

}
