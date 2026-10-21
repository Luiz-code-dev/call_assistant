"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

const WALK_DURATION_MS = 7500;
const FIRST_DELAY_MS   = 12_000;
const MIN_INTERVAL_MS  = 40_000;
const MAX_INTERVAL_MS  = 70_000;

type AssetType = "gif" | "webp" | "lottie";

async function detectAsset(): Promise<{ type: AssetType; src: string } | null> {
  for (const [path, type] of [
    ["/speaky-run.gif",  "gif"],
    ["/speaky-run.webp", "webp"],
  ] as [string, AssetType][]) {
    const r = await fetch(path, { method: "HEAD" });
    if (r.ok) return { type, src: path };
  }
  const r = await fetch("/speaky-run.json");
  if (r.ok) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = await r.json();
    return { type: "lottie", src: JSON.stringify(data) };
  }
  return null;
}

export function SpeakyWalk() {
  const [active, setActive]       = useState(false);
  const [direction, setDirection] = useState<"right" | "left">("right");
  const [asset, setAsset]         = useState<{ type: AssetType; src: string } | null>(null);
  const activeRef   = useRef(false);
  const scheduleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect available animation asset once on mount
  useEffect(() => {
    detectAsset().then(setAsset).catch(() => {});
  }, []);

  const trigger = useCallback(() => {
    if (activeRef.current || !asset) return;
    activeRef.current = true;
    setDirection(Math.random() > 0.5 ? "right" : "left");
    setActive(true);
    setTimeout(() => {
      setActive(false);
      activeRef.current = false;
    }, WALK_DURATION_MS);
  }, [asset]);

  useEffect(() => {
    const schedule = (delay: number) => {
      scheduleRef.current = setTimeout(() => {
        trigger();
        schedule(MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS));
      }, delay);
    };

    schedule(FIRST_DELAY_MS);

    return () => {
      if (scheduleRef.current) clearTimeout(scheduleRef.current);
    };
  }, [trigger]);

  if (!active || !asset) return null;

  return (
    /* Outer: horizontal walk across the viewport */
    <div
      className={
        direction === "right"
          ? "animate-speaky-walk-right"
          : "animate-speaky-walk-left"
      }
      style={{
        position: "fixed",
        bottom: "6rem",
        zIndex: 45,
        pointerEvents: "none",
        width: 120,
        height: 120,
      }}
    >
      {/* Flip horizontally when walking left */}
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: direction === "left" ? "scaleX(-1)" : "none",
          filter: "drop-shadow(0 0 14px rgba(59,130,246,0.5)) drop-shadow(0 4px 8px rgba(0,0,0,0.35))",
        }}
      >
        {asset.type === "lottie" ? (
          <Lottie
            animationData={JSON.parse(asset.src)}
            loop
            autoplay
            style={{ width: "100%", height: "100%" }}
            rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={asset.src}
            alt=""
            width={120}
            height={120}
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "contain", userSelect: "none" }}
          />
        )}
      </div>
    </div>
  );
}
