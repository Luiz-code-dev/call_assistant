"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export function SpeakyMascot() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [animationData, setAnimationData] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    fetch("/speaky-run.json")
      .then((r) => r.json())
      .then(setAnimationData)
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col items-center gap-1 select-none pointer-events-none">
      {/* Speech bubble */}
      <div className="relative rounded-2xl border border-violet-500/30 bg-violet-500/10 backdrop-blur px-3 py-2 text-center">
        <p className="text-[11px] font-bold text-violet-300 leading-snug">
          ✨ Speaky trouxe<br />novidades!
        </p>
        {/* Bubble tail */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-violet-500/30" />
      </div>

      {/* Mascot animation */}
      {animationData ? (
        <Lottie
          animationData={animationData}
          loop
          autoplay
          style={{ width: 110, height: 62 }}
        />
      ) : (
        <div className="w-[110px] h-[62px]" />
      )}
    </div>
  );
}
