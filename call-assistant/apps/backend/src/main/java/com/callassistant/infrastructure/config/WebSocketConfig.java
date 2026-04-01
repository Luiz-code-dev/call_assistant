package com.callassistant.infrastructure.config;

import com.callassistant.infrastructure.adapter.inbound.websocket.AudioWebSocketHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.HandlerMapping;
import org.springframework.web.reactive.handler.SimpleUrlHandlerMapping;
import org.springframework.web.reactive.socket.server.support.WebSocketHandlerAdapter;

import java.util.Map;

@Configuration
public class WebSocketConfig {

    @Bean
    public HandlerMapping webSocketHandlerMapping(AudioWebSocketHandler handler) {
        var map = Map.of("/ws/sessions/*/stream", (org.springframework.web.reactive.socket.WebSocketHandler) handler);
        var mapping = new SimpleUrlHandlerMapping(map, -1);
        return mapping;
    }

    @Bean
    public WebSocketHandlerAdapter webSocketHandlerAdapter() {
        return new WebSocketHandlerAdapter();
    }
}
