"use client";

import { useEffect, useState, useRef, useCallback } from "react";

const WALK_DURATION_MS = 7500;
const FIRST_DELAY_MS   = 12_000;
const MIN_INTERVAL_MS  = 40_000;
const MAX_INTERVAL_MS  = 70_000;

export function SpeakyWalk() {
  const [active, setActive]       = useState(false);
  const [direction, setDirection] = useState<"right" | "left">("right");
  const activeRef = useRef(false);
  const scheduleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    setDirection(Math.random() > 0.5 ? "right" : "left");
    setActive(true);
    setTimeout(() => {
      setActive(false);
      activeRef.current = false;
    }, WALK_DURATION_MS);
  }, []);

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

  if (!active) return null;

  const handleError = () => setActive(false);

  return (
    /* Outer: horizontal walk */
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
        width: 96,
        height: 96,
      }}
    >
      {/* Middle: flip when walking left */}
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: direction === "left" ? "scaleX(-1)" : "none",
        }}
      >
        {/* Inner: bobbing walk cycle */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/speaky.png"
          alt=""
          width={96}
          height={96}
          draggable={false}
          onError={handleError}
          className="animate-speaky-bob"
          style={{
            objectFit: "contain",
            userSelect: "none",
            filter:
              "drop-shadow(0 0 14px rgba(59,130,246,0.55)) drop-shadow(0 4px 8px rgba(0,0,0,0.4))",
          }}
        />
      </div>
    </div>
  );
}
