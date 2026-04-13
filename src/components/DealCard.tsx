"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { StayDeal } from "@/lib/types";
import { ColorTheme, getHeatTextColor } from "@/lib/colors";
import StayBreakdown from "./StayBreakdown";

interface DealCardProps {
  deal: StayDeal;
  rank: number;
  sectionColor: ColorTheme;
  minAvg: number;
  maxAvg: number;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function DealCard({ deal, rank, sectionColor, minAvg, maxAvg }: DealCardProps) {
  const [expanded, setExpanded] = useState(false);
  const priceColor = getHeatTextColor(deal.avgPerNight, minAvg, maxAvg);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.04 }}
      className="rounded-xl overflow-hidden"
      style={{
        background: expanded
          ? `linear-gradient(135deg, ${sectionColor.primary}08, transparent)`
          : `rgba(var(--oc), 0.03)`,
        border: `1px solid ${expanded ? sectionColor.primary + "20" : `rgba(var(--oc), 0.06)`}`,
        borderLeft: `3px solid ${sectionColor.primary}50`,
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <span
          className="text-xs font-mono w-5 flex-shrink-0 font-bold"
          style={{ color: rank === 0 ? sectionColor.light : "var(--color-text-dim)" }}
        >
          #{rank + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{formatDate(deal.checkIn)}</div>
          <div className="text-xs text-text-muted">
            {deal.nights}N &middot; {deal.isWeekend ? "Fri + Sat" : "Midweek"}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-lg font-bold font-mono" style={{ color: priceColor }}>
            ${deal.avgPerNight.toLocaleString()}
            <span className="text-[10px] font-normal text-text-muted">/nt</span>
          </div>
          <div className="text-[10px] font-mono text-text-dim">
            ${deal.totalCost.toLocaleString()} total
          </div>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronDown size={14} className="text-text-dim" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3">
              <StayBreakdown dailyRates={deal.dailyRates} total={deal.totalCost} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
