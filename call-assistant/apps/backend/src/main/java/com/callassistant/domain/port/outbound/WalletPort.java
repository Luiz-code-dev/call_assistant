package com.callassistant.domain.port.outbound;

import reactor.core.publisher.Mono;

public interface WalletPort {
    Mono<Void> deductCredits(String userId, int amount, String source, String description);
}
