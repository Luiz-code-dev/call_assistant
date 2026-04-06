package com.callassistant.infrastructure.adapter.outbound.wallet;

import com.callassistant.domain.port.outbound.WalletPort;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.Map;

@Slf4j
@Component
public class WalletHttpAdapter implements WalletPort {

    private final WebClient webClient;
    private final String internalSecret;

    public WalletHttpAdapter(
            @Value("${callassistant.wallet.web-app-url}") String webAppUrl,
            @Value("${callassistant.wallet.internal-secret}") String internalSecret) {
        this.webClient = WebClient.builder().baseUrl(webAppUrl).build();
        this.internalSecret = internalSecret;
    }

    @Override
    public Mono<Void> deductCredits(String userId, int amount, String source, String description) {
        if (userId == null || userId.isBlank()) {
            log.warn("deductCredits called with null/blank userId — skipping");
            return Mono.empty();
        }
        return webClient.post()
                .uri("/api/wallet/use")
                .header("x-internal-secret", internalSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(Map.of(
                        "userId", userId,
                        "amount", amount,
                        "source", source,
                        "description", description
                ))
                .retrieve()
                .onStatus(status -> status.value() == 402, response ->
                        response.bodyToMono(String.class)
                                .doOnNext(body -> log.warn("Insufficient credits for userId={}: {}", userId, body))
                                .then(Mono.empty()))
                .onStatus(status -> !status.is2xxSuccessful() && status.value() != 402, response ->
                        response.bodyToMono(String.class)
                                .doOnNext(body -> log.error("Wallet deduct error for userId={}: {} — {}", userId, response.statusCode(), body))
                                .then(Mono.error(new RuntimeException("Wallet API error: " + response.statusCode()))))
                .bodyToMono(Void.class)
                .doOnSuccess(v -> log.debug("Deducted {} credit(s) for userId={}", amount, userId))
                .onErrorResume(e -> {
                    log.error("Failed to deduct credits for userId={}: {}", userId, e.getMessage());
                    return Mono.empty();
                });
    }
}
