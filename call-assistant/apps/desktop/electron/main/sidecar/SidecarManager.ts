import { ChildProcess, spawn } from "child_process";
import { join } from "path";
import { app } from "electron";
import type {
  SidecarInboundCommand,
  SidecarOutboundMessage,
} from "@call-assistant/shared-types";

type ChunkCallback = (msg: SidecarOutboundMessage) => void;

export class SidecarManager {
  private process: ChildProcess | null = null;
  private buffer = "";
  private onMessage: ChunkCallback | null = null;

  start(onMessage: ChunkCallback): void {
    if (this.process) return;

    this.onMessage = onMessage;
    const sidecarPath = this.resolveSidecarPath();

    this.process = spawn(sidecarPath, [], { stdio: ["pipe", "pipe", "pipe"] });

    this.process.stdout?.setEncoding("utf-8");
    this.process.stdout?.on("data", (data: string) => this.handleData(data));

    this.process.stderr?.setEncoding("utf-8");
    this.process.stderr?.on("data", (err: string) => {
      console.error("[SidecarManager] stderr:", err);
    });

    this.process.on("exit", (code) => {
      console.warn("[SidecarManager] exited with code", code);
      this.process = null;
    });
  }

  send(command: SidecarInboundCommand): void {
    if (!this.process?.stdin) return;
    this.process.stdin.write(JSON.stringify(command) + "\n");
  }

  stop(): void {
    if (!this.process) return;
    this.send({ cmd: "stop" });
    this.process.kill();
    this.process = null;
  }

  private handleData(data: string): void {
    this.buffer += data;
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const msg = JSON.parse(trimmed) as SidecarOutboundMessage;
        if (msg.type === "error") {
          console.error("[SidecarManager] sidecar error:", (msg as { type: "error"; message: string }).message);
        }
        this.onMessage?.(msg);
      } catch {
        console.warn("[SidecarManager] failed to parse line:", trimmed);
      }
    }
  }

  private resolveSidecarPath(): string {
    const ext = process.platform === "win32" ? ".exe" : "";
    const binary = `audio-engine${ext}`;
    return app.isPackaged
      ? join(process.resourcesPath, "sidecar", binary)
      : join(__dirname, "../../../../services/audio-engine/target/release", binary);
  }
}

export const sidecarManager = new SidecarManager();
