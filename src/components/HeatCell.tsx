"use client";

import { getHeatColor, getHeatTextColor } from "@/lib/colors";

interface HeatCellProps {
  avgPerNight: number | null;
  total: number | null;
  min: number;
  max: number;
  isCheapest?: boolean;
}

export default function HeatCell({ avgPerNight, total, min, max, isCheapest }: HeatCellProps) {
  if (avgPerNight == null || total == null) {
    return (
      <div
        className="px-2 py-1.5 rounded-lg text-center text-[10px] font-mono"
        style={{ background: "var(--na-bg)", color: "var(--na-text)" }}
      >
        N/A
      </div>
    );
  }

  return (
    <div
      className={`px-2 py-1.5 rounded-lg text-center ${isCheapest ? "cheap-glow" : ""}`}
      style={{ background: getHeatColor(avgPerNight, min, max) }}
    >
      <div
        className="text-sm font-mono font-bold"
        style={{ color: getHeatTextColor(avgPerNight, min, max) }}
      >
        ${avgPerNight.toLocaleString()}
        <span className="text-[8px] font-normal opacity-60">/nt</span>
      </div>
      <div className="text-[9px] font-mono text-text-dim opacity-70">
        ${total.toLocaleString()}
      </div>
    </div>
  );
}
