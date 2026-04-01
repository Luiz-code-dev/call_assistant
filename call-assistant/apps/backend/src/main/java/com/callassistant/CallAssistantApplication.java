package com.callassistant;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class CallAssistantApplication {

    public static void main(String[] args) {
        SpringApplication.run(CallAssistantApplication.class, args);
    }
}
