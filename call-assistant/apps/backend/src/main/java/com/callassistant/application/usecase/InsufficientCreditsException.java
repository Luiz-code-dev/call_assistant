package com.callassistant.application.usecase;

public class InsufficientCreditsException extends RuntimeException {
    private final String userId;

    public InsufficientCreditsException(String userId) {
        super("Insufficient credits for user: " + userId);
        this.userId = userId;
    }

    public String getUserId() {
        return userId;
    }
}
