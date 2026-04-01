# ADR-003 — Rust Audio Capture Sidecar

**Status:** Accepted  
**Date:** 2026-03-31

## Context

Low-latency audio capture and Voice Activity Detection (VAD) require direct access to OS audio APIs (WASAPI on Windows, CoreAudio on macOS). The JVM does not provide reliable access to these APIs without native bindings, and the Electron renderer sandbox prevents direct audio device access. A dedicated native process is the cleanest boundary.

## Decision

Implement a **Rust sidecar** (`services/audio-engine`) spawned as a child process by Electron's main process:

- Communication: **newline-delimited JSON over stdio** (stdin for commands, stdout for events)
- Commands: `start { sampleRate, channels }`, `stop`
- Events: `chunk { data: base64, ts }`, `vad { speaking, ts }`, `error { message }`
- Platform capture: WASAPI on Windows via `windows-rs`, CoreAudio on macOS via `coreaudio-rs`
- Built with `cargo build --release`, bundled into Electron's `resources/sidecar/` directory

## Consequences

- **Positive:** Zero JVM overhead for audio capture; deterministic latency.
- **Positive:** Process isolation — sidecar crash does not kill Electron.
- **Positive:** VAD runs in the same process, no extra IPC round-trip.
- **Negative:** Requires Rust toolchain in the dev environment.
- **Negative:** Cross-compilation needed for macOS builds on CI.
- **Trade-off:** stdio JSON is slightly less efficient than shared memory, but sufficient for 16kHz mono audio at 100ms chunks (~3.2KB/chunk).
