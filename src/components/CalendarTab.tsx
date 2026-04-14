"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown } from "lucide-react";
import { HotelConfig, HotelRateData } from "@/lib/types";
import { computeCalendarRows, getColumnMinMax, DateFilter } from "@/lib/deals";
import { getHeatTextColor, getHotelColor, getHotelPresets } from "@/lib/colors";
import HotelDropdown from "./HotelDropdown";
import HeatCell from "./HeatCell";
import StayBreakdown from "./StayBreakdown";
import DateFilterControls from "./DateFilterControls";

interface CalendarTabProps {
  hotels: HotelConfig[];
  rateData: Record<string, HotelRateData>;
  selectedHotelId: string;
  onSelectHotel: (id: string) => void;
  filter: DateFilter;
  onFilterChange: (filter: DateFilter) => void;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface MonthSummary {
  label: string;
  key: string;
  avgs: Record<number, number | null>;
}

function computeMonthSummaries(
  rows: ReturnType<typeof computeCalendarRows>,
  nightOptions: number[]
): MonthSummary[] {
  const grouped: Record<string, { label: string; values: Record<number, number[]> }> = {};

  for (const row of rows) {
    const d = new Date(row.checkIn + "T12:00:00");
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short" });

    if (!grouped[key]) {
      grouped[key] = { label, values: {} };
      for (const n of nightOptions) grouped[key].values[n] = [];
    }

    for (const n of nightOptions) {
      const avg = row.stays[n]?.avgPerNight;
      if (avg != null) grouped[key].values[n].push(avg);
    }
  }

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { label, values }]) => {
      const avgs: Record<number, number | null> = {};
      for (const n of nightOptions) {
        const arr = values[n];
        avgs[n] = arr.length > 0 ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : null;
      }
      return { label, key, avgs };
    });
}

export default function CalendarTab({ hotels, rateData, selectedHotelId, onSelectHotel, filter, onFilterChange }: CalendarTabProps) {
  const [nightOptions, setNightOptions] = useState<number[]>([3, 4, 5]);
  const [customInput, setCustomInput] = useState("");
  const [showAddInput, setShowAddInput] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const hotelColor = getHotelColor(selectedHotelId);

  const rates = rateData[selectedHotelId]?.rates || {};

  const rows = useMemo(() => computeCalendarRows(rates, nightOptions, filter), [rates, nightOptions, filter]);

  const columnMinMax = useMemo(() => {
    const result: Record<number, { min: number; max: number }> = {};
    for (const n of nightOptions) {
      result[n] = getColumnMinMax(rows, n);
    }
    return result;
  }, [rows, nightOptions]);

  const monthSummaries = useMemo(() => computeMonthSummaries(rows, nightOptions), [rows, nightOptions]);

  // Global min per-night across all columns for cheapest glow
  const globalMin = useMemo(() => {
    let min = Infinity;
    for (const n of nightOptions) {
      const m = columnMinMax[n]?.min;
      if (m != null && m < min) min = m;
    }
    return min === Infinity ? 0 : min;
  }, [columnMinMax, nightOptions]);

  const addNightOption = () => {
    const n = parseInt(customInput);
    if (n > 0 && n <= 30 && !nightOptions.includes(n)) {
      setNightOptions([...nightOptions, n].sort((a, b) => a - b));
    }
    setCustomInput("");
    setShowAddInput(false);
  };

  const removeNightOption = (n: number) => {
    if (nightOptions.length > 1) {
      setNightOptions(nightOptions.filter((x) => x !== n));
    }
  };

  return (
    <div className="space-y-4">
      <HotelDropdown hotels={hotels} selectedId={selectedHotelId} onSelect={onSelectHotel} regionLabel={hotels[0]?.region || ""} />

      {/* Controls */}
      <DateFilterControls filter={filter} onChange={onFilterChange} presets={getHotelPresets(selectedHotelId)} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-text-dim uppercase tracking-wider">Nights</span>
          {nightOptions.map((n) => (
            <button
              key={n}
              onClick={() => removeNightOption(n)}
              className="group flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium glass-bright"
            >
              {n}N
              {nightOptions.length > 1 && (
                <X size={10} className="text-text-dim opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          ))}
          {showAddInput ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addNightOption()}
                className="w-12 px-2 py-1 rounded-lg text-xs font-mono bg-white/5 border border-border text-text outline-none focus:border-border-bright"
                placeholder="#"
                autoFocus
              />
              <button onClick={addNightOption} className="text-xs text-cheap">OK</button>
              <button onClick={() => setShowAddInput(false)} className="text-xs text-text-dim">Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddInput(true)}
              className="px-2 py-1 rounded-lg text-xs font-mono text-text-dim hover:text-text glass transition-colors"
            >
              +
            </button>
          )}
        </div>
      </div>

      {/* Month Summary Bar */}
      <div className="overflow-x-auto no-scrollbar">
        <div className="flex gap-2">
          {monthSummaries.map((month, i) => (
            <motion.div
              key={month.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass rounded-xl p-3 min-w-[90px] flex-shrink-0"
            >
              <p className="text-[10px] text-text-dim uppercase tracking-wider mb-1.5 font-semibold">{month.label}</p>
              {nightOptions.map((n) => {
                const avg = month.avgs[n];
                const mm = columnMinMax[n];
                return (
                  <div key={n} className="flex justify-between items-center gap-2">
                    <span className="text-[9px] text-text-dim">{n}N</span>
                    <span
                      className="text-[11px] font-mono font-medium"
                      style={{ color: avg != null && mm ? getHeatTextColor(avg, mm.min, mm.max) : "var(--na-text)" }}
                    >
                      {avg != null ? `$${avg.toLocaleString()}` : "\u2014"}
                    </span>
                  </div>
                );
              })}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl glass">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="sticky left-0 z-10 bg-bg px-3 py-2.5 text-left text-[10px] font-semibold text-text-dim uppercase tracking-wider whitespace-nowrap">
                Check-in
              </th>
              {nightOptions.map((n) => (
                <th key={n} className="px-3 py-2.5 text-center text-[10px] font-semibold text-text-dim uppercase tracking-wider whitespace-nowrap">
                  {n}-Night <span className="font-normal opacity-60">/nt</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              return (
                <tr
                  key={row.checkIn}
                  className="border-b border-border/30 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  style={{
                    borderLeft: row.isWeekend
                      ? `2px solid ${hotelColor.primary}50`
                      : "2px solid transparent",
                  }}
                  onClick={() => setExpandedRow(expandedRow === row.checkIn ? null : row.checkIn)}
                >
                  <td className="sticky left-0 z-10 bg-bg px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-text-dim w-7">{row.dayOfWeek}</span>
                      <span className="text-sm">{formatDateShort(row.checkIn)}</span>
                      {row.isWeekend && (
                        <span
                          className="text-[8px] px-1 py-0.5 rounded font-semibold"
                          style={{ background: `${hotelColor.primary}20`, color: hotelColor.light }}
                        >
                          WE
                        </span>
                      )}
                    </div>
                  </td>
                  {nightOptions.map((n) => {
                    const avg = row.stays[n]?.avgPerNight ?? null;
                    const mm = columnMinMax[n];
                    const isCheapest = avg != null && mm && avg <= mm.min * 1.02;
                    return (
                      <td key={n} className="px-2 py-1.5">
                        <HeatCell
                          avgPerNight={avg}
                          total={row.stays[n]?.total ?? null}
                          min={mm?.min ?? 0}
                          max={mm?.max ?? 0}
                          isCheapest={isCheapest}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Expanded row breakdown */}
      <AnimatePresence>
        {expandedRow && (
          <motion.div
            key={expandedRow}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-xl overflow-hidden"
          >
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">
                  Check-in: {formatDateShort(expandedRow)}
                </span>
                <button onClick={() => setExpandedRow(null)}>
                  <ChevronDown size={16} className="text-text-dim rotate-180" />
                </button>
              </div>
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${nightOptions.length}, 1fr)` }}>
                {nightOptions.map((n) => {
                  const stay = rows.find((r) => r.checkIn === expandedRow)?.stays[n];
                  if (!stay) return null;
                  return (
                    <div key={n} className="space-y-1">
                      <div className="text-xs font-semibold text-text-muted text-center">{n}-Night Stay</div>
                      <StayBreakdown dailyRates={stay.dailyRates} total={stay.total} />
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
