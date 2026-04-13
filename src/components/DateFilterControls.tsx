"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarRange, X, Plus, ChevronDown, Zap } from "lucide-react";
import { DateFilter } from "@/lib/deals";
import { PresetExclusion } from "@/lib/colors";

interface DateFilterControlsProps {
  filter: DateFilter;
  onChange: (filter: DateFilter) => void;
  presets?: PresetExclusion[];
}

function formatShort(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function presetToRanges(preset: PresetExclusion, startDate: string, endDate: string): DateFilter["excludeRanges"] {
  const ranges: DateFilter["excludeRanges"] = [];
  const startYear = new Date(startDate + "T12:00:00").getFullYear();
  const endYear = new Date(endDate + "T12:00:00").getFullYear();
  for (let y = startYear; y <= endYear; y++) {
    const s = `${y}-${String(preset.startMonth).padStart(2, "0")}-${String(preset.startDay).padStart(2, "0")}`;
    const e = `${y}-${String(preset.endMonth).padStart(2, "0")}-${String(preset.endDay).padStart(2, "0")}`;
    // Only include if it overlaps with filter range
    if (e >= startDate && s <= endDate) {
      ranges.push({ start: s > startDate ? s : startDate, end: e < endDate ? e : endDate, label: preset.label });
    }
  }
  return ranges;
}

function isPresetActive(preset: PresetExclusion, filter: DateFilter): boolean {
  return filter.excludeRanges.some((r) => r.label === preset.label);
}

export default function DateFilterControls({ filter, onChange, presets = [] }: DateFilterControlsProps) {
  const [showExclusions, setShowExclusions] = useState(filter.excludeRanges.length > 0);
  const [newExStart, setNewExStart] = useState("");
  const [newExEnd, setNewExEnd] = useState("");
  const [newExLabel, setNewExLabel] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const addExclusion = () => {
    if (!newExStart || !newExEnd || newExStart > newExEnd) return;
    onChange({
      ...filter,
      excludeRanges: [
        ...filter.excludeRanges,
        { start: newExStart, end: newExEnd, label: newExLabel || undefined },
      ],
    });
    setNewExStart("");
    setNewExEnd("");
    setNewExLabel("");
    setShowAddForm(false);
  };

  const removeExclusion = (index: number) => {
    onChange({
      ...filter,
      excludeRanges: filter.excludeRanges.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-2">
      {/* Date range row */}
      <div className="flex flex-wrap items-center gap-2">
        <CalendarRange size={12} className="text-text-dim flex-shrink-0" />
        <input
          type="date"
          value={filter.startDate}
          onChange={(e) => onChange({ ...filter, startDate: e.target.value })}
          className="px-2 py-1 rounded-lg text-xs font-mono bg-white/5 border border-border text-text outline-none focus:border-border-bright"
        />
        <span className="text-[10px] text-text-dim">to</span>
        <input
          type="date"
          value={filter.endDate}
          onChange={(e) => onChange({ ...filter, endDate: e.target.value })}
          className="px-2 py-1 rounded-lg text-xs font-mono bg-white/5 border border-border text-text outline-none focus:border-border-bright"
        />
      </div>

      {/* Preset quick toggles */}
      {presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => {
            const active = isPresetActive(preset, filter);
            return (
              <button
                key={preset.label}
                onClick={() => {
                  if (active) {
                    // Remove all ranges with this label
                    onChange({
                      ...filter,
                      excludeRanges: filter.excludeRanges.filter((r) => r.label !== preset.label),
                    });
                  } else {
                    // Add the preset ranges
                    const newRanges = presetToRanges(preset, filter.startDate, filter.endDate);
                    onChange({
                      ...filter,
                      excludeRanges: [...filter.excludeRanges, ...newRanges],
                    });
                  }
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                style={{
                  background: active ? "rgba(239,68,68,0.15)" : `rgba(var(--oc), 0.04)`,
                  border: `1px solid ${active ? "rgba(239,68,68,0.3)" : `rgba(var(--oc), 0.08)`}`,
                  color: active ? "#f87171" : "var(--color-text-muted)",
                }}
              >
                <Zap size={10} />
                Exclude {preset.label}
                {active && <X size={10} />}
              </button>
            );
          })}
        </div>
      )}

      {/* Exclusion toggle + list */}
      <div>
        <button
          onClick={() => setShowExclusions(!showExclusions)}
          className="flex items-center gap-1.5 text-[10px] text-text-dim hover:text-text-muted transition-colors uppercase tracking-wider"
        >
          <motion.div animate={{ rotate: showExclusions ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={10} />
          </motion.div>
          Exclude dates
          {filter.excludeRanges.length > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
              {filter.excludeRanges.length}
            </span>
          )}
        </button>

        <AnimatePresence>
          {showExclusions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-2 space-y-1.5">
                {/* Existing exclusions */}
                {filter.excludeRanges.map((ex, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs"
                    style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)" }}
                  >
                    <span className="text-text-muted font-mono flex-1">
                      {formatShort(ex.start)} — {formatShort(ex.end)}
                      {ex.label && <span className="text-text-dim ml-1.5">({ex.label})</span>}
                    </span>
                    <button onClick={() => removeExclusion(i)} className="text-text-dim hover:text-expensive transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                ))}

                {/* Add new exclusion */}
                {showAddForm ? (
                  <div className="glass rounded-lg p-2.5 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="date"
                        value={newExStart}
                        onChange={(e) => setNewExStart(e.target.value)}
                        className="px-2 py-1 rounded text-[11px] font-mono bg-white/5 border border-border text-text outline-none focus:border-border-bright"
                      />
                      <span className="text-[10px] text-text-dim">to</span>
                      <input
                        type="date"
                        value={newExEnd}
                        onChange={(e) => setNewExEnd(e.target.value)}
                        className="px-2 py-1 rounded text-[11px] font-mono bg-white/5 border border-border text-text outline-none focus:border-border-bright"
                      />
                    </div>
                    <input
                      type="text"
                      value={newExLabel}
                      onChange={(e) => setNewExLabel(e.target.value)}
                      placeholder="Label (e.g. Hurricane season)"
                      className="w-full px-2 py-1 rounded text-[11px] bg-white/5 border border-border text-text outline-none focus:border-border-bright placeholder:text-text-dim"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={addExclusion}
                        disabled={!newExStart || !newExEnd}
                        className="text-[10px] font-medium px-2.5 py-1 rounded-lg disabled:opacity-30 transition-colors"
                        style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}
                      >
                        Add exclusion
                      </button>
                      <button onClick={() => setShowAddForm(false)} className="text-[10px] text-text-dim">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-1 text-[10px] text-text-dim hover:text-text-muted transition-colors px-2 py-1"
                  >
                    <Plus size={10} />
                    Add exclusion range
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
