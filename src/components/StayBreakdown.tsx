"use client";

import { motion } from "framer-motion";

interface StayBreakdownProps {
  dailyRates: { date: string; rate: number | null }[];
  total?: number | null;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function StayBreakdown({ dailyRates, total }: StayBreakdownProps) {
  return (
    <div className="space-y-1 pt-2">
      {dailyRates.map((dr, i) => (
        <motion.div
          key={dr.date}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.03 }}
          className="flex items-center justify-between px-3 py-1.5 rounded-lg"
          style={{ background: `rgba(var(--oc), 0.02)` }}
        >
          <span className="text-xs text-text-muted">
            Night {i + 1}: {formatDate(dr.date)}
          </span>
          <span className="text-xs font-mono font-medium">
            {dr.rate != null ? `$${dr.rate.toLocaleString()}` : "N/A"}
          </span>
        </motion.div>
      ))}
      {total != null && (
        <div className="flex items-center justify-between px-3 py-2 mt-1 rounded-lg border-t border-border">
          <span className="text-xs font-semibold text-text-muted">Total</span>
          <span className="text-sm font-mono font-bold">${total.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}
