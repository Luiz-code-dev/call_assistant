package com.callassistant.domain.model;

import java.util.Arrays;

public record AudioChunk(
        byte[] data,
        long timestampMs,
        int sampleRate,
        int channels
) {
    public AudioChunk {
        if (data == null || data.length == 0) throw new IllegalArgumentException("Audio data must not be empty");
        if (sampleRate <= 0) throw new IllegalArgumentException("sampleRate must be positive");
        if (channels <= 0) throw new IllegalArgumentException("channels must be positive");
    }

    public int durationMs() {
        int bytesPerSample = 2;
        int totalSamples = data.length / (bytesPerSample * channels);
        return (int) ((totalSamples * 1000L) / sampleRate);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AudioChunk other)) return false;
        return timestampMs == other.timestampMs
                && sampleRate == other.sampleRate
                && channels == other.channels
                && Arrays.equals(data, other.data);
    }

    @Override
    public int hashCode() {
        int result = Arrays.hashCode(data);
        result = 31 * result + Long.hashCode(timestampMs);
        return result;
    }
}
