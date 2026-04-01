mod protocol;

use std::io::{self, BufRead, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};

use base64::Engine as _;
use base64::engine::general_purpose::STANDARD as BASE64;
use protocol::{InboundCommand, OutboundMessage};

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn emit(msg: &OutboundMessage) {
    if let Ok(json) = serde_json::to_string(msg) {
        let stdout = io::stdout();
        let mut lock = stdout.lock();
        let _ = writeln!(lock, "{}", json);
    }
}

fn main() {
    let running = Arc::new(AtomicBool::new(false));
    let stdin = io::stdin();

    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => break,
        };

        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        match serde_json::from_str::<InboundCommand>(trimmed) {
            Ok(InboundCommand::Start { sample_rate, channels }) => {
                if running.load(Ordering::SeqCst) {
                    continue;
                }
                running.store(true, Ordering::SeqCst);

                let running_clone = Arc::clone(&running);
                let sample_rate_usize = sample_rate as usize;
                let channels_usize = channels as usize;

                thread::spawn(move || {
                    capture_loop(running_clone, sample_rate_usize, channels_usize);
                });
            }
            Ok(InboundCommand::Stop) => {
                running.store(false, Ordering::SeqCst);
                break;
            }
            Err(e) => {
                emit(&OutboundMessage::Error {
                    message: format!("Failed to parse command: {}", e),
                });
            }
        }
    }
}

fn capture_loop(running: Arc<AtomicBool>, sample_rate: usize, channels: usize) {
    let chunk_duration_ms: u64 = 100;
    let samples_per_chunk = (sample_rate * channels) * (chunk_duration_ms as usize) / 1000;
    let bytes_per_chunk = samples_per_chunk * 2; // 16-bit PCM

    #[cfg(target_os = "windows")]
    {
        windows_capture(running, bytes_per_chunk, chunk_duration_ms);
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        stub_capture(running, bytes_per_chunk, chunk_duration_ms);
    }
}

fn stub_capture(running: Arc<AtomicBool>, bytes_per_chunk: usize, chunk_ms: u64) {
    use std::time::Duration;

    while running.load(Ordering::SeqCst) {
        let silence = vec![0u8; bytes_per_chunk];
        let encoded = BASE64.encode(&silence);

        emit(&OutboundMessage::Chunk {
            data: encoded,
            ts: now_ms(),
        });

        emit(&OutboundMessage::Vad {
            speaking: false,
            ts: now_ms(),
        });

        thread::sleep(Duration::from_millis(chunk_ms));
    }
}

#[cfg(target_os = "windows")]
fn windows_capture(running: Arc<AtomicBool>, bytes_per_chunk: usize, chunk_ms: u64) {
    match windows_capture_inner(running.clone(), chunk_ms) {
        Ok(()) => {}
        Err(e) => {
            let msg = format!("WASAPI failed ({:?}) — falling back to silence", e);
            eprintln!("[audio-engine] {}", msg);
            emit(&OutboundMessage::Error { message: msg });
            stub_capture(running, bytes_per_chunk, chunk_ms);
        }
    }
}

#[cfg(target_os = "windows")]
fn windows_capture_inner(
    running: Arc<AtomicBool>,
    chunk_ms: u64,
) -> windows::core::Result<()> {
    use std::time::Duration;
    use windows::Win32::Media::Audio::{
        eConsole, eRender, IAudioCaptureClient, IAudioClient, IMMDeviceEnumerator,
        MMDeviceEnumerator, AUDCLNT_SHAREMODE_SHARED, AUDCLNT_STREAMFLAGS_LOOPBACK,
        WAVEFORMATEXTENSIBLE,
    };
    use windows::core::GUID;
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CoTaskMemFree, CoUninitialize, CLSCTX_ALL,
        COINIT_MULTITHREADED,
    };

    // {00000003-0000-0010-8000-00AA00389B71}
    const KSDATAFORMAT_SUBTYPE_IEEE_FLOAT: GUID = GUID::from_values(
        0x0000_0003,
        0x0000,
        0x0010,
        [0x80, 0x00, 0x00, 0xAA, 0x00, 0x38, 0x9B, 0x71],
    );
    const TARGET_RATE: u32 = 16_000;
    const WAVE_FORMAT_EXTENSIBLE_TAG: u16 = 0xFFFE;
    const WAVE_FORMAT_IEEE_FLOAT_TAG: u16 = 3;

    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);

        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)?;
        let device = enumerator.GetDefaultAudioEndpoint(eRender, eConsole)?;
        let audio_client: IAudioClient = device.Activate(CLSCTX_ALL, None)?;

        let pwfx = audio_client.GetMixFormat()?;
        let wfx = &*pwfx;

        let native_rate = wfx.nSamplesPerSec;
        let native_channels = wfx.nChannels as usize;

        let is_float = if wfx.wFormatTag == WAVE_FORMAT_EXTENSIBLE_TAG {
            let wfext = pwfx as *const WAVEFORMATEXTENSIBLE;
            let sub_format = core::ptr::read_unaligned(core::ptr::addr_of!((*wfext).SubFormat));
            sub_format == KSDATAFORMAT_SUBTYPE_IEEE_FLOAT
        } else {
            wfx.wFormatTag == WAVE_FORMAT_IEEE_FLOAT_TAG
        };

        audio_client.Initialize(
            AUDCLNT_SHAREMODE_SHARED,
            AUDCLNT_STREAMFLAGS_LOOPBACK,
            0,
            0,
            pwfx,
            None,
        )?;

        CoTaskMemFree(Some(pwfx as *const _ as *const core::ffi::c_void));

        let capture_client: IAudioCaptureClient = audio_client.GetService()?;
        audio_client.Start()?;

        let target_samples_per_chunk = (TARGET_RATE as u64 * chunk_ms / 1000) as usize;
        let ratio = native_rate as f64 / TARGET_RATE as f64;

        let mut mono_buf: Vec<f32> = Vec::new();
        let mut resampled: Vec<i16> = Vec::new();
        let mut src_pos: f64 = 0.0;

        while running.load(Ordering::SeqCst) {
            thread::sleep(Duration::from_millis(10));

            loop {
                let next_packet = match capture_client.GetNextPacketSize() {
                    Ok(n) => n,
                    Err(_) => break,
                };
                if next_packet == 0 {
                    break;
                }

                let mut p_data: *mut u8 = core::ptr::null_mut();
                let mut num_frames: u32 = 0;
                let mut flags: u32 = 0;

                if capture_client
                    .GetBuffer(&mut p_data, &mut num_frames, &mut flags, None, None)
                    .is_err()
                {
                    break;
                }

                let n = num_frames as usize;
                let is_silent = (flags & 0x2) != 0; // AUDCLNT_BUFFERFLAGS_SILENT

                if n > 0 {
                    if is_silent || !is_float {
                        for _ in 0..n {
                            mono_buf.push(0.0f32);
                        }
                    } else {
                        let samples = core::slice::from_raw_parts(
                            p_data as *const f32,
                            n * native_channels,
                        );
                        for frame in 0..n {
                            let mut sum = 0.0f32;
                            for ch in 0..native_channels {
                                sum += samples[frame * native_channels + ch];
                            }
                            mono_buf.push(sum / native_channels as f32);
                        }
                    }
                }

                let _ = capture_client.ReleaseBuffer(num_frames);

                // Resample: point-sample decimation
                while src_pos < mono_buf.len() as f64 {
                    let idx = src_pos as usize;
                    let s = mono_buf[idx];
                    resampled.push((s.clamp(-1.0, 1.0) * 32767.0) as i16);
                    src_pos += ratio;
                }

                let consumed = (src_pos as usize).min(mono_buf.len());
                mono_buf.drain(..consumed);
                src_pos -= consumed as f64;
                if src_pos < 0.0 {
                    src_pos = 0.0;
                }

                // Emit complete 100ms chunks
                while resampled.len() >= target_samples_per_chunk {
                    let bytes: Vec<u8> = resampled[..target_samples_per_chunk]
                        .iter()
                        .flat_map(|s| s.to_le_bytes())
                        .collect();
                    emit(&OutboundMessage::Chunk {
                        data: BASE64.encode(&bytes),
                        ts: now_ms(),
                    });
                    resampled.drain(..target_samples_per_chunk);
                }
            }
        }

        audio_client.Stop()?;
        CoUninitialize();
    }

    Ok(())
}
