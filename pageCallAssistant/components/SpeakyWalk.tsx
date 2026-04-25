"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

const WALK_DURATION_MS = 7500;
const FIRST_DELAY_MS   = 12_000;
const MIN_INTERVAL_MS  = 40_000;
const MAX_INTERVAL_MS  = 70_000;

export function SpeakyWalk() {
  const [active, setActive]           = useState(false);
  const [direction, setDirection]     = useState<"right" | "left">("right");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [lottieSrc, setLottieSrc]     = useState<Record<string, any> | null>(null);
  const activeRef   = useRef(false);
  const scheduleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load Lottie JSON once — silently skip if not found
  useEffect(() => {
    fetch("/speaky-run.json")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setLottieSrc(data))
      .catch(() => { /* animation file not added yet — stay hidden */ });
  }, []);

  const trigger = useCallback(() => {
    if (activeRef.current || !lottieSrc) return;
    activeRef.current = true;
    setDirection(Math.random() > 0.5 ? "right" : "left");
    setActive(true);
    setTimeout(() => {
      setActive(false);
      activeRef.current = false;
    }, WALK_DURATION_MS);
  }, [lottieSrc]);

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

  if (!active || !lottieSrc) return null;

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
        <Lottie
          animationData={lottieSrc}
          loop
          autoplay
          style={{ width: "100%", height: "100%" }}
          rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
        />
      </div>
    </div>
  );
}
