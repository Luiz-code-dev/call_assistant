use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(tag = "cmd", rename_all = "camelCase")]
pub enum InboundCommand {
    Start {
        #[serde(rename = "sampleRate")]
        sample_rate: u32,
        channels: u16,
    },
    Stop,
}

#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "lowercase")]
#[allow(dead_code)]
pub enum OutboundMessage {
    Chunk {
        data: String,
        ts: u64,
    },
    Vad {
        speaking: bool,
        ts: u64,
    },
    Error {
        message: String,
    },
}
