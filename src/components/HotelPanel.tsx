"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { HotelConfig, HotelRateData } from "@/lib/types";
import { computeStayDeals, DateFilter } from "@/lib/deals";
import { getHotelColor, getSectionColor, getHotelPresets } from "@/lib/colors";
import HotelDropdown from "./HotelDropdown";
import DealCard from "./DealCard";
import MiniChart from "./MiniChart";
import DateFilterControls from "./DateFilterControls";

interface HotelPanelProps {
  regionLabel: string;
  hotels: HotelConfig[];
  rateData: Record<string, HotelRateData>;
  selectedId: string;
  onSelectHotel: (id: string) => void;
  filter: DateFilter;
  onFilterChange: (filter: DateFilter) => void;
}

export default function HotelPanel({
  regionLabel, hotels, rateData, selectedId, onSelectHotel, filter, onFilterChange,
}: HotelPanelProps) {
  const [nights, setNights] = useState(4);
  const [weekendOnly, setWeekendOnly] = useState(false);
  const [showCustomNights, setShowCustomNights] = useState(false);
  const [customNightsInput, setCustomNightsInput] = useState("");

  const rates = rateData[selectedId]?.rates || {};
  const hotelColor = getHotelColor(selectedId);
  const hotelName = hotels.find((h) => h.id === selectedId)?.name || "";
  const sectionColor = getSectionColor(nights);
  const lastUpdated = rateData[selectedId]?.lastUpdated;

  const allDeals = useMemo(() => {
    const deals = computeStayDeals(rates, nights, filter);
    return weekendOnly ? deals.filter((d) => d.isWeekend) : deals;
  }, [rates, nights, filter, weekendOnly]);

  const topDeals = allDeals.slice(0, 5);
  const bestDeal = topDeals[0];
  const avgPrice = allDeals.length > 0
    ? Math.round(allDeals.reduce((s, d) => s + d.avgPerNight, 0) / allDeals.length)
    : null;

  return (
    <div className="space-y-3">
      {/* Hotel dropdown */}
      <HotelDropdown
        hotels={hotels}
        selectedId={selectedId}
        onSelect={onSelectHotel}
        regionLabel={regionLabel}
      />

      {/* Hotel name gradient */}
      <h2
        className="text-lg font-bold truncate"
        style={{
          background: `linear-gradient(135deg, ${hotelColor.light}, ${hotelColor.primary})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        {hotelName}
      </h2>

      {/* Filters */}
      <div className="glass rounded-xl p-3 space-y-2.5">
        <p className="tracking-wider text-[9px] uppercase text-text-dim">Filters</p>

        {/* Nights */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-text-muted w-12 flex-shrink-0">Nights</span>
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
            <button
              className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-medium"
              style={{ background: `${sectionColor.primary}20`, border: `1px solid ${sectionColor.primary}40`, color: sectionColor.light }}
              onClick={() => setNights(4)}
            >
              {nights} <X size={7} className="inline ml-0.5" />
            </button>
          )}
          {showCustomNights ? (
            <div className="flex items-center gap-1">
              <input
                type="number" value={customNightsInput}
                onChange={(e) => setCustomNightsInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { const v = parseInt(customNightsInput); if (v > 0 && v <= 30) { setNights(v); setShowCustomNights(false); setCustomNightsInput(""); } } }}
                className="w-8 px-1 py-0.5 rounded text-[10px] font-mono border border-border text-text outline-none text-center"
                style={{ background: "var(--input-bg)" }}
                placeholder="#" autoFocus
              />
              <button onClick={() => { const v = parseInt(customNightsInput); if (v > 0 && v <= 30) { setNights(v); setShowCustomNights(false); setCustomNightsInput(""); } }} className="text-[9px]" style={{ color: sectionColor.light }}>OK</button>
              <button onClick={() => setShowCustomNights(false)} className="text-[9px] text-text-dim">X</button>
            </div>
          ) : (
            <button onClick={() => setShowCustomNights(true)} className="px-1.5 py-0.5 rounded text-[10px] font-mono text-text-dim" style={{ background: `rgba(var(--oc), 0.04)`, border: `1px solid rgba(var(--oc), 0.08)` }}>+</button>
          )}
        </div>

        {/* Dates + exclusions */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-text-muted w-12 flex-shrink-0">Dates</span>
          <DateFilterControls filter={filter} onChange={onFilterChange} presets={getHotelPresets(selectedId)} />
        </div>

        {/* Weekend */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-text-muted w-12 flex-shrink-0">Weekend</span>
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

      {/* Summary */}
      <div className="glass-bright rounded-xl p-3 gradient-border">
        <div className="flex items-center justify-between mb-2">
          <p className="tracking-wider text-[9px] uppercase text-text-dim">
            {nights}N Summary {weekendOnly ? "(Fri+Sat)" : ""}
          </p>
          {lastUpdated && (
            <span className="text-[8px] text-text-dim">
              {new Date(lastUpdated).toLocaleDateString()}
            </span>
          )}
        </div>

        {allDeals.length === 0 ? (
          <p className="text-xs text-text-dim text-center py-3">No stays found</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                <p className="text-xl font-bold font-mono" style={{ color: "#059669" }}>
                  ${bestDeal?.avgPerNight.toLocaleString()}
                </p>
                <p className="text-[9px] text-text-dim">Best /nt</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-center">
                <p className="text-xl font-bold font-mono text-text-muted">
                  ${avgPrice?.toLocaleString() ?? "\u2014"}
                </p>
                <p className="text-[9px] text-text-dim">Avg /nt</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-center">
                <p className="text-xl font-bold font-mono" style={{ color: "#059669" }}>
                  ${bestDeal?.totalCost.toLocaleString()}
                </p>
                <p className="text-[9px] text-text-dim">Best total</p>
              </motion.div>
            </div>
            <MiniChart rates={rates} hotelId={selectedId} filter={filter} fixedNights={nights} />
          </>
        )}
      </div>

      {/* Top deals */}
      {topDeals.length > 0 && (
        <div className="space-y-1.5">
          <p className="tracking-wider text-[9px] uppercase text-text-dim">
            Top {topDeals.length} Cheapest
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
