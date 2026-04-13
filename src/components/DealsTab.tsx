"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import { HotelConfig, HotelRateData, StayDeal } from "@/lib/types";
import { computeStayDeals, DateFilter } from "@/lib/deals";
import { getHotelColor, getSectionColor, getHotelPresets, ColorTheme } from "@/lib/colors";
import HotelSelector from "./HotelSelector";
import DealCard from "./DealCard";
import MiniChart from "./MiniChart";
import DateFilterControls from "./DateFilterControls";

interface DealsTabProps {
  hotels: HotelConfig[];
  rateData: Record<string, HotelRateData>;
  selectedHotelId: string;
  onSelectHotel: (id: string) => void;
  filter: DateFilter;
  onFilterChange: (filter: DateFilter) => void;
}

export default function DealsTab({ hotels, rateData, selectedHotelId, onSelectHotel, filter, onFilterChange }: DealsTabProps) {
  const [nights, setNights] = useState(4);
  const [weekendOnly, setWeekendOnly] = useState(false);
  const [showCustomNights, setShowCustomNights] = useState(false);
  const [customNightsInput, setCustomNightsInput] = useState("");

  const rates = rateData[selectedHotelId]?.rates || {};
  const hotelColor = getHotelColor(selectedHotelId);
  const hotelName = hotels.find((h) => h.id === selectedHotelId)?.name || "";
  const sectionColor = getSectionColor(nights);
  const lastUpdated = rateData[selectedHotelId]?.lastUpdated;

  const allDeals = useMemo(() => {
    const deals = computeStayDeals(rates, nights, filter);
    return weekendOnly ? deals.filter((d) => d.isWeekend) : deals;
  }, [rates, nights, filter, weekendOnly]);

  const topDeals = allDeals.slice(0, 10);
  const bestDeal = topDeals[0];
  const avgPrice = allDeals.length > 0 ? Math.round(allDeals.reduce((s, d) => s + d.avgPerNight, 0) / allDeals.length) : null;

  return (
    <div className="space-y-4">
      <HotelSelector hotels={hotels} selectedId={selectedHotelId} onSelect={onSelectHotel} />

      {/* Hotel name */}
      <h2
        className="text-xl font-bold"
        style={{
          background: `linear-gradient(135deg, ${hotelColor.light}, ${hotelColor.primary})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        {hotelName}
      </h2>

      {/* === FILTERS === */}
      <div className="glass-bright rounded-2xl p-4 space-y-3">
        <p className="tracking-wider text-[10px] uppercase text-text-dim">Search Filters</p>

        {/* Row 1: Stay length */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-text-muted w-16 flex-shrink-0">Nights</span>
          <div className="flex items-center gap-1">
            {[3, 4, 5, 7].map((n) => (
              <button
                key={n}
                onClick={() => { setNights(n); setShowCustomNights(false); }}
                className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all"
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
              <button
                className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium"
                style={{
                  background: `${sectionColor.primary}20`,
                  border: `1px solid ${sectionColor.primary}40`,
                  color: sectionColor.light,
                }}
                onClick={() => setNights(4)}
              >
                {nights} <X size={8} className="inline ml-0.5" />
              </button>
            )}
            {showCustomNights ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={customNightsInput}
                  onChange={(e) => setCustomNightsInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const v = parseInt(customNightsInput);
                      if (v > 0 && v <= 30) { setNights(v); setShowCustomNights(false); setCustomNightsInput(""); }
                    }
                  }}
                  className="w-10 px-1.5 py-1 rounded-lg text-xs font-mono border border-border text-text outline-none focus:border-border-bright text-center"
                  style={{ background: "var(--input-bg)" }}
                  placeholder="#"
                  autoFocus
                />
                <button onClick={() => {
                  const v = parseInt(customNightsInput);
                  if (v > 0 && v <= 30) { setNights(v); setShowCustomNights(false); setCustomNightsInput(""); }
                }} className="text-[10px]" style={{ color: sectionColor.light }}>OK</button>
                <button onClick={() => setShowCustomNights(false)} className="text-[10px] text-text-dim">Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => setShowCustomNights(true)}
                className="px-2 py-1 rounded-lg text-xs font-mono text-text-dim hover:text-text-muted transition-colors"
                style={{ background: `rgba(var(--oc), 0.04)`, border: `1px solid rgba(var(--oc), 0.08)` }}
              >+</button>
            )}
          </div>
        </div>

        {/* Row 2: Date range */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-text-muted w-16 flex-shrink-0">Dates</span>
          <DateFilterControls filter={filter} onChange={onFilterChange} presets={getHotelPresets(selectedHotelId)} />
        </div>

        {/* Row 3: Weekend only toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted w-16 flex-shrink-0">Weekend</span>
          <button
            onClick={() => setWeekendOnly(!weekendOnly)}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
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

      {/* === SUMMARY === */}
      <div className="glass-bright rounded-2xl p-4 gradient-border">
        <div className="flex items-center justify-between mb-3">
          <p className="tracking-wider text-[10px] uppercase text-text-dim">
            {nights}-Night Summary {weekendOnly ? "(incl. Fri + Sat)" : ""}
          </p>
          {lastUpdated && (
            <span className="text-[9px] text-text-dim">
              Updated {new Date(lastUpdated).toLocaleDateString()}
            </span>
          )}
        </div>

        {allDeals.length === 0 ? (
          <p className="text-sm text-text-dim text-center py-4">No available stays found</p>
        ) : (
          <>
            {/* Key stats row */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                <p className="text-2xl font-bold font-mono" style={{ color: "#059669" }}>
                  ${bestDeal?.avgPerNight.toLocaleString()}
                </p>
                <p className="text-[10px] text-text-dim">Best /night</p>
                {bestDeal && (
                  <p className="text-[9px] text-text-dim font-mono opacity-50">
                    {new Date(bestDeal.checkIn + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                )}
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-center">
                <p className="text-2xl font-bold font-mono text-text-muted">
                  ${avgPrice?.toLocaleString() ?? "\u2014"}
                </p>
                <p className="text-[10px] text-text-dim">Avg /night</p>
                <p className="text-[9px] text-text-dim font-mono opacity-50">{allDeals.length} options</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-center">
                <p className="text-2xl font-bold font-mono" style={{ color: "#059669" }}>
                  ${bestDeal?.totalCost.toLocaleString()}
                </p>
                <p className="text-[10px] text-text-dim">Best total</p>
                <p className="text-[9px] text-text-dim font-mono opacity-50">{nights} nights</p>
              </motion.div>
            </div>

            {/* Mini chart */}
            <MiniChart rates={rates} hotelId={selectedHotelId} filter={filter} fixedNights={nights} />
          </>
        )}
      </div>

      {/* === TOP DEALS === */}
      {topDeals.length > 0 && (
        <div className="space-y-2">
          <p className="tracking-wider text-[10px] uppercase text-text-dim">
            Top {topDeals.length} Cheapest {nights}-Night Stays {weekendOnly ? "(incl. Fri + Sat)" : ""}
          </p>
          {topDeals.map((deal, i) => (
            <DealCard
              key={deal.checkIn}
              deal={deal}
              rank={i}
              sectionColor={sectionColor}
              minAvg={topDeals[0].avgPerNight}
              maxAvg={topDeals[topDeals.length - 1].avgPerNight}
            />
          ))}
        </div>
      )}
    </div>
  );
}
