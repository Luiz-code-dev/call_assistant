import type { SessionId } from "./session.js";
import type { CreateSessionRequest, CreateSessionResponse, StopSessionResponse } from "./session.js";

export interface IpcChannels {
  "ipc:session:create": {
    request: CreateSessionRequest;
    response: CreateSessionResponse;
  };
  "ipc:session:stop": {
    request: { sessionId: SessionId };
    response: StopSessionResponse;
  };
  "ipc:audio:start-capture": {
    request: { sessionId: SessionId; sampleRate: number };
    response: void;
  };
  "ipc:audio:stop-capture": {
    request: { sessionId: SessionId };
    response: void;
  };
  "ipc:tts:play": {
    request: { audioBase64: string; mimeType: string };
    response: void;
  };
  "ipc:settings:get": {
    request: { key: string };
    response: unknown;
  };
  "ipc:settings:set": {
    request: { key: string; value: unknown };
    response: void;
  };
}

export type IpcChannel = keyof IpcChannels;

export interface SidecarChunkMessage {
  readonly type: "chunk";
  readonly data: string;
  readonly ts: number;
}

export interface SidecarVadMessage {
  readonly type: "vad";
  readonly speaking: boolean;
  readonly ts: number;
}

export interface SidecarErrorMessage {
  readonly type: "error";
  readonly message: string;
}

export type SidecarOutboundMessage =
  | SidecarChunkMessage
  | SidecarVadMessage
  | SidecarErrorMessage;

export interface SidecarStartCommand {
  readonly cmd: "start";
  readonly sampleRate: number;
  readonly channels: number;
}

export interface SidecarStopCommand {
  readonly cmd: "stop";
}

export type SidecarInboundCommand = SidecarStartCommand | SidecarStopCommand;
