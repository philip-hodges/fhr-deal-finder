"use client";

import { useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { HotelConfig, HotelRateData } from "@/lib/types";
import { computeStayDeals, DateFilter } from "@/lib/deals";
import { getHotelColor, getSectionColor, getHotelPresets } from "@/lib/colors";
import HotelSelector from "./HotelSelector";
import DateFilterControls from "./DateFilterControls";

interface PriceChartProps {
  hotels: HotelConfig[];
  rateData: Record<string, HotelRateData>;
  selectedHotelId: string;
  onSelectHotel: (id: string) => void;
  filter: DateFilter;
  onFilterChange: (filter: DateFilter) => void;
}

interface ChartPoint {
  date: string;
  label: string;
  avgPerNight: number;
  total: number;
}

function formatShort(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMonth(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short" });
}

export default function PriceChart({ hotels, rateData, selectedHotelId, onSelectHotel, filter, onFilterChange }: PriceChartProps) {
  const [nights, setNights] = useState(3);
  const [showCustom, setShowCustom] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const hotelColor = getHotelColor(selectedHotelId);
  const rates = rateData[selectedHotelId]?.rates || {};

  const points: ChartPoint[] = useMemo(() => {
    const deals = computeStayDeals(rates, nights, filter);
    // Sort chronologically for the chart (computeStayDeals sorts by price)
    const sorted = [...deals].sort((a, b) => a.checkIn.localeCompare(b.checkIn));
    return sorted.map((d) => ({
      date: d.checkIn,
      label: formatShort(d.checkIn),
      avgPerNight: d.avgPerNight,
      total: d.totalCost,
    }));
  }, [rates, nights, filter]);

  // Chart dimensions
  const W = 1200;
  const H = 320;
  const PAD = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const { minY, maxY, path, areaPath, yTicks, monthMarkers } = useMemo(() => {
    if (points.length === 0) return { minY: 0, maxY: 1000, path: "", areaPath: "", yTicks: [], monthMarkers: [] };

    const vals = points.map((p) => p.avgPerNight).sort((a, b) => a - b);
    let minV = vals[0];
    // Cap at 95th percentile to avoid outlier spikes crushing the chart
    let maxV = vals[Math.floor(vals.length * 0.95)] || vals[vals.length - 1];
    const range = maxV - minV || 100;
    minV = Math.max(0, minV - range * 0.08);
    maxV = maxV + range * 0.15;

    const xScale = (i: number) => PAD.left + (i / (points.length - 1)) * chartW;
    const yScale = (v: number) => {
      const clamped = Math.min(v, maxV); // clamp outliers to top edge
      return PAD.top + chartH - ((clamped - minV) / (maxV - minV)) * chartH;
    };

    // Line path
    const pathParts = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(i).toFixed(1)} ${yScale(p.avgPerNight).toFixed(1)}`);
    const linePath = pathParts.join(" ");

    // Area path (fill under line)
    const area = linePath + ` L ${xScale(points.length - 1).toFixed(1)} ${(PAD.top + chartH).toFixed(1)} L ${xScale(0).toFixed(1)} ${(PAD.top + chartH).toFixed(1)} Z`;

    // Y-axis ticks (5 ticks)
    const tickCount = 5;
    const ticks = Array.from({ length: tickCount }, (_, i) => {
      const v = minV + (i / (tickCount - 1)) * (maxV - minV);
      return { value: Math.round(v), y: yScale(v) };
    });

    // Month markers on X axis — only show first of each month
    const markers: { label: string; x: number }[] = [];
    let lastMonth = "";
    points.forEach((p, i) => {
      const d = new Date(p.date + "T12:00:00");
      const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
      if (monthKey !== lastMonth) {
        markers.push({ label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), x: xScale(i) });
        lastMonth = monthKey;
      }
    });

    return { minY: minV, maxY: maxV, path: linePath, areaPath: area, yTicks: ticks, monthMarkers: markers };
  }, [points, chartW, chartH]);

  const getPointX = (i: number) => PAD.left + (i / Math.max(points.length - 1, 1)) * chartW;
  const getPointY = (v: number) => {
    const clamped = Math.min(v, maxY);
    return PAD.top + chartH - ((clamped - minY) / (maxY - minY || 1)) * chartH;
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * W;
    const relX = mouseX - PAD.left;
    const idx = Math.round((relX / chartW) * (points.length - 1));
    setHoveredIdx(Math.max(0, Math.min(points.length - 1, idx)));
  };

  const sectionColor = getSectionColor(nights);

  return (
    <div className="space-y-4">
      <HotelSelector hotels={hotels} selectedId={selectedHotelId} onSelect={onSelectHotel} />

      {/* Stay length selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-text-dim uppercase tracking-wider">Stay length</span>
        <div className="flex items-center gap-1">
          {[3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => { setNights(n); setShowCustom(false); }}
              className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all"
              style={{
                background: nights === n ? `${sectionColor.primary}20` : `rgba(var(--oc), 0.04)`,
                border: `1px solid ${nights === n ? sectionColor.primary + "40" : `rgba(var(--oc), 0.08)`}`,
                color: nights === n ? sectionColor.light : "var(--color-text-dim)",
              }}
            >
              {n}N
            </button>
          ))}
          {![3, 4, 5].includes(nights) && (
            <button
              className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium"
              style={{
                background: `${sectionColor.primary}20`,
                border: `1px solid ${sectionColor.primary}40`,
                color: sectionColor.light,
              }}
              onClick={() => setNights(3)}
            >
              {nights}N <X size={8} className="inline ml-0.5" />
            </button>
          )}
          {showCustom ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const n = parseInt(customInput);
                    if (n > 0 && n <= 30) { setNights(n); setShowCustom(false); setCustomInput(""); }
                  }
                }}
                className="w-10 px-1.5 py-1 rounded-lg text-[10px] font-mono border border-border text-text outline-none focus:border-border-bright text-center"
                style={{ background: "var(--input-bg)" }}
                placeholder="#"
                autoFocus
              />
              <button
                onClick={() => {
                  const n = parseInt(customInput);
                  if (n > 0 && n <= 30) { setNights(n); setShowCustom(false); setCustomInput(""); }
                }}
                className="text-[10px]"
                style={{ color: sectionColor.light }}
              >OK</button>
              <button onClick={() => setShowCustom(false)} className="text-[10px] text-text-dim">Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setShowCustom(true)}
              className="px-2 py-1 rounded-lg text-xs font-mono text-text-dim hover:text-text-muted transition-colors"
              style={{ background: `rgba(var(--oc), 0.04)`, border: `1px solid rgba(var(--oc), 0.08)` }}
            >
              +
            </button>
          )}
        </div>
      </div>

      <DateFilterControls filter={filter} onChange={onFilterChange} presets={getHotelPresets(selectedHotelId)} />

      {/* Chart */}
      {points.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center text-text-dim text-sm">
          No available {nights}-night stays in this date range
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-3 overflow-x-auto"
        >
          {/* Tooltip */}
          {hoveredIdx !== null && points[hoveredIdx] && (
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs text-text-muted">{points[hoveredIdx].label}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono font-bold" style={{ color: hotelColor.light }}>
                  ${points[hoveredIdx].avgPerNight.toLocaleString()}/nt
                </span>
                <span className="text-[10px] font-mono text-text-dim">
                  ${points[hoveredIdx].total.toLocaleString()} total
                </span>
              </div>
            </div>
          )}

          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            style={{ minWidth: 400 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {/* Grid lines */}
            {yTicks.map((tick) => (
              <g key={tick.value}>
                <line
                  x1={PAD.left} x2={W - PAD.right}
                  y1={tick.y} y2={tick.y}
                  stroke={`rgba(var(--oc), 0.06)`}
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 8} y={tick.y + 4}
                  textAnchor="end"
                  fill="var(--color-text-dim)"
                  fontSize={11}
                  fontFamily="ui-monospace, monospace"
                >
                  ${tick.value.toLocaleString()}
                </text>
              </g>
            ))}

            {/* Month markers */}
            {monthMarkers.map((m, i) => (
              <g key={i}>
                <line
                  x1={m.x} x2={m.x}
                  y1={PAD.top} y2={PAD.top + chartH}
                  stroke={`rgba(var(--oc), 0.04)`}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <text
                  x={m.x} y={H - 8}
                  textAnchor="middle"
                  fill="var(--color-text-dim)"
                  fontSize={11}
                  fontFamily="ui-monospace, monospace"
                >
                  {m.label}
                </text>
              </g>
            ))}

            {/* Area fill */}
            <path
              d={areaPath}
              fill={`${hotelColor.primary}15`}
            />

            {/* Line */}
            <motion.path
              d={path}
              fill="none"
              stroke={hotelColor.primary}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />

            {/* Hover crosshair + dot */}
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
                  cy={getPointY(points[hoveredIdx].avgPerNight)}
                  r={5}
                  fill={hotelColor.primary}
                  stroke="var(--color-bg)"
                  strokeWidth={2}
                />
              </g>
            )}
          </svg>
        </motion.div>
      )}

      {/* Summary stats */}
      {points.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Lowest", value: Math.min(...points.map((p) => p.avgPerNight)), color: "#059669" },
            { label: "Average", value: Math.round(points.reduce((s, p) => s + p.avgPerNight, 0) / points.length), color: "var(--color-text-muted)" },
            { label: "Highest", value: Math.max(...points.map((p) => p.avgPerNight)), color: "#dc2626" },
          ].map((stat) => (
            <div key={stat.label} className="glass rounded-xl p-3 text-center">
              <p className="text-lg font-bold font-mono" style={{ color: stat.color }}>
                ${stat.value.toLocaleString()}
              </p>
              <p className="text-[10px] text-text-dim">{stat.label} /night</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
