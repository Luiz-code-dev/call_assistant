import type { WsClientCommand, WsServerEvent } from "@call-assistant/shared-types";

type EventCallback = (event: WsServerEvent) => void;

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private reconnectAttempts = 0;
  private shouldReconnect = false;
  private listeners: Set<EventCallback> = new Set();

  connect(sessionId: string): void {
    this.sessionId = sessionId;
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    this.openConnection();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.ws?.close();
    this.ws = null;
  }

  send(command: WsClientCommand): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(command));
    }
  }

  onEvent(callback: EventCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private openConnection(): void {
    if (!this.sessionId) return;

    const url = `ws://localhost:8080/ws/sessions/${this.sessionId}/stream`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(event.data) as WsServerEvent;
        this.listeners.forEach((cb) => cb(parsed));
      } catch {
        console.warn("[WebSocketClient] failed to parse message:", event.data);
      }
    };

    this.ws.onclose = () => {
      if (this.shouldReconnect && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        this.reconnectAttempts++;
        setTimeout(() => this.openConnection(), RECONNECT_DELAY_MS);
      }
    };

    this.ws.onerror = (err) => {
      console.error("[WebSocketClient] error:", err);
    };
  }
}

export const wsClient = new WebSocketClient();
