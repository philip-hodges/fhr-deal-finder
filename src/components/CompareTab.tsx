"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, X, MapPin } from "lucide-react";
import { HotelConfig, HotelRateData } from "@/lib/types";
import { computeStayDeals, getDefaultFilter, DateFilter } from "@/lib/deals";
import { getHotelColor, getSectionColor, getHotelPresets } from "@/lib/colors";
import StayBreakdown from "./StayBreakdown";

interface CompareTabProps {
  hawaiiHotels: HotelConfig[];
  caboHotels: HotelConfig[];
  rateData: Record<string, HotelRateData>;
}

interface HotelDeal {
  hotel: HotelConfig;
  bestAvgPerNight: number;
  bestTotal: number;
  bestCheckIn: string;
  monthAvg: number;
  discountPct: number; // negative = cheaper than avg
  dailyRates: { date: string; rate: number }[];
  nights: number;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function getMonthAvg(
  rates: Record<string, number | null>,
  year: number,
  month: number // 0-indexed
): number {
  let sum = 0;
  let count = 0;
  for (const [date, rate] of Object.entries(rates)) {
    if (rate == null) continue;
    const d = new Date(date + "T12:00:00");
    if (d.getFullYear() === year && d.getMonth() === month) {
      sum += rate;
      count++;
    }
  }
  return count > 0 ? Math.round(sum / count) : 0;
}

export default function CompareTab({ hawaiiHotels, caboHotels, rateData }: CompareTabProps) {
  const [region, setRegion] = useState<"Hawaii" | "Cabo">("Hawaii");
  const [nights, setNights] = useState(4);
  const [weekendOnly, setWeekendOnly] = useState(false);
  const [showCustomNights, setShowCustomNights] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [expandedHotel, setExpandedHotel] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"discount" | "price">("discount");

  // Month picker
  const now = new Date();
  const monthOptions: { label: string; year: number; month: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    monthOptions.push({
      label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(0);
  const selectedMonth = monthOptions[selectedMonthIdx];

  const hotels = region === "Hawaii" ? hawaiiHotels : caboHotels;
  const sectionColor = getSectionColor(nights);

  // Build a DateFilter for just the selected month
  const monthFilter: DateFilter = useMemo(() => {
    const start = new Date(selectedMonth.year, selectedMonth.month, 1);
    const end = new Date(selectedMonth.year, selectedMonth.month + 1, 0); // last day of month
    const f: DateFilter = {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
      excludeRanges: [],
    };
    return f;
  }, [selectedMonth]);

  // Compute deals for all hotels
  const hotelDeals: HotelDeal[] = useMemo(() => {
    const results: HotelDeal[] = [];

    for (const hotel of hotels) {
      const rates = rateData[hotel.id]?.rates || {};
      const monthAvg = getMonthAvg(rates, selectedMonth.year, selectedMonth.month);
      if (monthAvg === 0) continue; // no data for this month

      let deals = computeStayDeals(rates, nights, monthFilter);
      if (weekendOnly) deals = deals.filter((d) => d.isWeekend);
      if (deals.length === 0) continue;

      const best = deals[0]; // already sorted by avgPerNight
      const discountPct = ((best.avgPerNight - monthAvg) / monthAvg) * 100;

      results.push({
        hotel,
        bestAvgPerNight: best.avgPerNight,
        bestTotal: best.totalCost,
        bestCheckIn: best.checkIn,
        monthAvg,
        discountPct,
        dailyRates: best.dailyRates,
        nights,
      });
    }

    // Sort based on user preference
    if (sortBy === "discount") {
      results.sort((a, b) => a.discountPct - b.discountPct);
    } else {
      results.sort((a, b) => a.bestAvgPerNight - b.bestAvgPerNight);
    }
    return results;
  }, [hotels, rateData, nights, weekendOnly, monthFilter, selectedMonth, sortBy]);

  return (
    <div className="space-y-4">
      {/* Region selector */}
      <div className="flex items-center gap-2">
        <MapPin size={14} className="text-text-dim" />
        {(["Hawaii", "Cabo"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={{
              background: region === r ? `rgba(var(--oc), 0.08)` : `rgba(var(--oc), 0.03)`,
              border: `1px solid ${region === r ? `rgba(var(--oc), 0.15)` : `rgba(var(--oc), 0.06)`}`,
              color: region === r ? "var(--color-text)" : "var(--color-text-dim)",
            }}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="glass rounded-xl p-3 space-y-2.5">
        <p className="tracking-wider text-[9px] uppercase text-text-dim">Trip Parameters</p>

        {/* Month */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-muted w-14 flex-shrink-0">Month</span>
          <select
            value={selectedMonthIdx}
            onChange={(e) => setSelectedMonthIdx(parseInt(e.target.value))}
            className="px-2 py-1 rounded-lg text-xs font-medium cursor-pointer outline-none"
            style={{
              background: `rgba(var(--oc), 0.05)`,
              border: `1px solid rgba(var(--oc), 0.1)`,
              color: "var(--color-text)",
            }}
          >
            {monthOptions.map((m, i) => (
              <option key={i} value={i}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Nights */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-text-muted w-14 flex-shrink-0">Nights</span>
          {[3, 4, 5, 7].map((n) => (
            <button
              key={n}
              onClick={() => { setNights(n); setShowCustomNights(false); }}
              className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-medium transition-all"
              style={{
                background: nights === n ? `${getSectionColor(n).primary}20` : `rgba(var(--oc), 0.04)`,
                border: `1px solid ${nights === n ? getSectionColor(n).primary + "40" : `rgba(var(--oc), 0.08)`}`,
                color: nights === n ? getSectionColor(n).light : "var(--color-text-dim)",
              }}
            >
              {n}
            </button>
          ))}
          {![3, 4, 5, 7].includes(nights) && (
            <button className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-medium" style={{ background: `${sectionColor.primary}20`, border: `1px solid ${sectionColor.primary}40`, color: sectionColor.light }} onClick={() => setNights(4)}>
              {nights} <X size={7} className="inline ml-0.5" />
            </button>
          )}
          {showCustomNights ? (
            <div className="flex items-center gap-1">
              <input type="number" value={customInput} onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { const v = parseInt(customInput); if (v > 0 && v <= 30) { setNights(v); setShowCustomNights(false); setCustomInput(""); } } }}
                className="w-8 px-1 py-0.5 rounded text-[10px] font-mono border border-border text-text outline-none text-center" style={{ background: "var(--input-bg)" }} placeholder="#" autoFocus />
              <button onClick={() => { const v = parseInt(customInput); if (v > 0 && v <= 30) { setNights(v); setShowCustomNights(false); setCustomInput(""); } }} className="text-[9px]" style={{ color: sectionColor.light }}>OK</button>
              <button onClick={() => setShowCustomNights(false)} className="text-[9px] text-text-dim">X</button>
            </div>
          ) : (
            <button onClick={() => setShowCustomNights(true)} className="px-1.5 py-0.5 rounded text-[10px] font-mono text-text-dim" style={{ background: `rgba(var(--oc), 0.04)`, border: `1px solid rgba(var(--oc), 0.08)` }}>+</button>
          )}
        </div>

        {/* Weekend */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-text-muted w-14 flex-shrink-0">Weekend</span>
          <button
            onClick={() => setWeekendOnly(!weekendOnly)}
            className="px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all"
            style={{
              background: weekendOnly ? `${getSectionColor("weekend").primary}20` : `rgba(var(--oc), 0.04)`,
              border: `1px solid ${weekendOnly ? getSectionColor("weekend").primary + "40" : `rgba(var(--oc), 0.08)`}`,
              color: weekendOnly ? getSectionColor("weekend").light : "var(--color-text-dim)",
            }}
          >
            {weekendOnly ? "Must include Fri + Sat nights" : "Any days"}
          </button>
        </div>
      </div>

      {/* Results header + sort toggle */}
      <div className="flex items-center justify-between">
        <p className="tracking-wider text-[9px] uppercase text-text-dim">
          {region} — {selectedMonth.label} — {nights}N {weekendOnly ? "(Fri+Sat)" : ""} — {hotelDeals.length} hotels
        </p>
        <div className="flex items-center gap-1">
          {(["discount", "price"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className="px-2 py-0.5 rounded text-[9px] font-medium transition-all"
              style={{
                background: sortBy === s ? `rgba(var(--oc), 0.08)` : `rgba(var(--oc), 0.03)`,
                border: `1px solid ${sortBy === s ? `rgba(var(--oc), 0.15)` : `rgba(var(--oc), 0.06)`}`,
                color: sortBy === s ? "var(--color-text)" : "var(--color-text-dim)",
              }}
            >
              {s === "discount" ? "Best value" : "Lowest price"}
            </button>
          ))}
        </div>
      </div>

      {/* Hotel comparison cards */}
      {hotelDeals.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center text-text-dim text-sm">
          No available {nights}-night stays in {selectedMonth.label}
        </div>
      ) : (
        <div className="space-y-2">
          {hotelDeals.map((deal, i) => {
            const hotelColor = getHotelColor(deal.hotel.id);
            const isExpanded = expandedHotel === deal.hotel.id;
            const isGoodDeal = deal.discountPct <= -15;
            const isGreatDeal = deal.discountPct <= -25;
            const isBadDeal = deal.discountPct > 5;

            return (
              <motion.div
                key={deal.hotel.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl overflow-hidden cursor-pointer"
                style={{
                  background: isExpanded
                    ? `linear-gradient(135deg, ${hotelColor.primary}08, transparent)`
                    : `rgba(var(--oc), 0.03)`,
                  border: `1px solid ${isExpanded ? hotelColor.primary + "25" : `rgba(var(--oc), 0.06)`}`,
                  borderLeft: `3px solid ${hotelColor.primary}60`,
                }}
                onClick={() => setExpandedHotel(isExpanded ? null : deal.hotel.id)}
              >
                <div className="px-3 py-2.5 flex items-center gap-3">
                  {/* Rank */}
                  <span className="text-[10px] font-mono text-text-dim w-4 flex-shrink-0">
                    {i + 1}
                  </span>

                  {/* Hotel info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{deal.hotel.name}</div>
                    <div className="text-[10px] text-text-dim">
                      {deal.hotel.island ? `${deal.hotel.island} · ` : ""}
                      Check in {formatDate(deal.bestCheckIn)}
                    </div>
                  </div>

                  {/* Price + discount */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-base font-bold font-mono" style={{ color: hotelColor.light }}>
                      ${deal.bestAvgPerNight.toLocaleString()}
                      <span className="text-[9px] font-normal text-text-muted">/nt</span>
                    </div>
                    <div
                      className="text-[10px] font-mono font-semibold"
                      style={{
                        color: isGreatDeal ? "#059669" : isGoodDeal ? "#10b981" : isBadDeal ? "#dc2626" : "var(--color-text-dim)",
                      }}
                    >
                      {deal.discountPct <= 0 ? "" : "+"}{Math.round(deal.discountPct)}% vs {selectedMonth.label.split(" ")[0]} avg
                    </div>
                    <div className="text-[9px] text-text-dim font-mono">
                      avg ${deal.monthAvg.toLocaleString()}/nt
                    </div>
                  </div>

                  <ChevronDown
                    size={12}
                    className="flex-shrink-0 text-text-dim transition-transform"
                    style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}
                  />
                </div>

                {/* Expanded breakdown */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3">
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          <div className="text-center glass rounded-lg p-2">
                            <p className="text-sm font-bold font-mono" style={{ color: "#059669" }}>${deal.bestAvgPerNight.toLocaleString()}</p>
                            <p className="text-[8px] text-text-dim">Best /night</p>
                          </div>
                          <div className="text-center glass rounded-lg p-2">
                            <p className="text-sm font-bold font-mono text-text-muted">${deal.monthAvg.toLocaleString()}</p>
                            <p className="text-[8px] text-text-dim">{selectedMonth.label.split(" ")[0]} avg</p>
                          </div>
                          <div className="text-center glass rounded-lg p-2">
                            <p className="text-sm font-bold font-mono" style={{ color: "#059669" }}>${deal.bestTotal.toLocaleString()}</p>
                            <p className="text-[8px] text-text-dim">{nights}N total</p>
                          </div>
                        </div>
                        <StayBreakdown dailyRates={deal.dailyRates} total={deal.bestTotal} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
