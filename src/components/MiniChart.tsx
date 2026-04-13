"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { computeStayDeals, DateFilter } from "@/lib/deals";
import { getHotelColor, getSectionColor } from "@/lib/colors";

interface MiniChartProps {
  rates: Record<string, number | null>;
  hotelId: string;
  filter: DateFilter;
  fixedNights?: number; // if set, hides the night selector
}

function formatShort(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function MiniChart({ rates, hotelId, filter, fixedNights }: MiniChartProps) {
  const [internalNights, setNights] = useState(3);
  const nights = fixedNights ?? internalNights;
  const [showCustom, setShowCustom] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const hotelColor = getHotelColor(hotelId);
  const sectionColor = getSectionColor(nights);

  const points = useMemo(() => {
    const deals = computeStayDeals(rates, nights, filter);
    return [...deals]
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
      .map((d) => ({ date: d.checkIn, avg: d.avgPerNight, total: d.totalCost }));
  }, [rates, nights, filter]);

  const W = 600;
  const H = 120;
  const PAD = { top: 8, right: 8, bottom: 4, left: 8 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const { path, areaPath, minV, maxV, lowest, highest, avg } = useMemo(() => {
    if (points.length === 0) return { path: "", areaPath: "", minV: 0, maxV: 0, lowest: null, highest: null, avg: 0 };

    const vals = points.map((p) => p.avg).sort((a, b) => a - b);
    let mn = vals[0];
    let mx = vals[Math.floor(vals.length * 0.95)] || vals[vals.length - 1];
    const range = mx - mn || 100;
    mn = Math.max(0, mn - range * 0.05);
    mx = mx + range * 0.1;

    const xScale = (i: number) => PAD.left + (i / Math.max(points.length - 1, 1)) * chartW;
    const yScale = (v: number) => PAD.top + chartH - ((Math.min(v, mx) - mn) / (mx - mn)) * chartH;

    const parts = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(i).toFixed(1)} ${yScale(p.avg).toFixed(1)}`);
    const linePath = parts.join(" ");
    const area = linePath + ` L ${xScale(points.length - 1).toFixed(1)} ${(PAD.top + chartH).toFixed(1)} L ${xScale(0).toFixed(1)} ${(PAD.top + chartH).toFixed(1)} Z`;

    const allVals = points.map((p) => p.avg);
    const lo = points.reduce((best, p) => (p.avg < best.avg ? p : best), points[0]);
    const hi = points.reduce((best, p) => (p.avg > best.avg ? p : best), points[0]);
    const average = Math.round(allVals.reduce((s, v) => s + v, 0) / allVals.length);

    return { path: linePath, areaPath: area, minV: mn, maxV: mx, lowest: lo, highest: hi, avg: average };
  }, [points, chartW, chartH]);

  const getPointX = (i: number) => PAD.left + (i / Math.max(points.length - 1, 1)) * chartW;
  const getPointY = (v: number) => {
    const clamped = Math.min(v, maxV);
    return PAD.top + chartH - ((clamped - minV) / (maxV - minV || 1)) * chartH;
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * W;
    const relX = mouseX - PAD.left;
    const idx = Math.round((relX / chartW) * (points.length - 1));
    setHoveredIdx(Math.max(0, Math.min(points.length - 1, idx)));
  };

  if (points.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="glass rounded-2xl overflow-hidden"
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-1.5">
          <p className="tracking-wider text-[10px] uppercase text-text-dim mr-1">
            {fixedNights ? `${nights}N Trend` : "Trend"}
          </p>
          {!fixedNights && (<>  {/* Only show selector when not fixed */}
          {[3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => { setNights(n); setShowCustom(false); }}
              className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold transition-all"
              style={{
                background: nights === n ? `${sectionColor.primary}20` : `rgba(var(--oc), 0.03)`,
                border: `1px solid ${nights === n ? sectionColor.primary + "40" : `rgba(var(--oc), 0.06)`}`,
                color: nights === n ? sectionColor.light : "var(--color-text-dim)",
              }}
            >
              {n}N
            </button>
          ))}
          {![3, 4, 5].includes(nights) ? (
            <button
              className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold"
              style={{
                background: `${sectionColor.primary}20`,
                border: `1px solid ${sectionColor.primary}40`,
                color: sectionColor.light,
              }}
              onClick={() => setNights(3)}
            >
              {nights}N <X size={7} className="inline ml-0.5" />
            </button>
          ) : showCustom ? (
            <div className="flex items-center gap-0.5">
              <input
                type="number"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const v = parseInt(customInput);
                    if (v > 0 && v <= 30) { setNights(v); setShowCustom(false); setCustomInput(""); }
                  }
                }}
                className="w-8 px-1 py-0.5 rounded text-[9px] font-mono border border-border text-text outline-none text-center"
                style={{ background: "var(--input-bg)" }}
                placeholder="#"
                autoFocus
              />
              <button onClick={() => {
                const v = parseInt(customInput);
                if (v > 0 && v <= 30) { setNights(v); setShowCustom(false); setCustomInput(""); }
              }} className="text-[9px]" style={{ color: sectionColor.light }}>OK</button>
              <button onClick={() => setShowCustom(false)} className="text-[9px] text-text-dim">X</button>
            </div>
          ) : (
            <button
              onClick={() => setShowCustom(true)}
              className="px-1.5 py-0.5 rounded text-[9px] font-mono text-text-dim"
              style={{ background: `rgba(var(--oc), 0.03)`, border: `1px solid rgba(var(--oc), 0.06)` }}
            >+</button>
          )}
          </>
          )}
        </div>
        {hoveredIdx !== null && points[hoveredIdx] ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-muted">{formatShort(points[hoveredIdx].date)}</span>
            <span className="text-xs font-mono font-bold" style={{ color: hotelColor.light }}>
              ${points[hoveredIdx].avg.toLocaleString()}/nt
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono" style={{ color: "#059669" }}>
              Low ${lowest?.avg.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-text-muted">
              Avg ${avg.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono" style={{ color: "#dc2626" }}>
              High ${highest?.avg.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Sparkline */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIdx(null)}
        style={{ cursor: "crosshair" }}
      >
        <path d={areaPath} fill={`${hotelColor.primary}12`} />
        <motion.path
          d={path}
          fill="none"
          stroke={hotelColor.primary}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        {hoveredIdx !== null && points[hoveredIdx] && (
          <g>
            <line
              x1={getPointX(hoveredIdx)} x2={getPointX(hoveredIdx)}
              y1={PAD.top} y2={PAD.top + chartH}
              stroke={`rgba(var(--oc), 0.15)`}
              strokeWidth={1}
            />
            <circle
              cx={getPointX(hoveredIdx)}
              cy={getPointY(points[hoveredIdx].avg)}
              r={4}
              fill={hotelColor.primary}
              stroke="var(--color-bg)"
              strokeWidth={2}
            />
          </g>
        )}
      </svg>
    </motion.div>
  );
}
