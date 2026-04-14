// Hotel color theming
export interface ColorTheme {
  primary: string;
  light: string;
}

const HOTEL_COLORS: Record<string, ColorTheme> = {
  "14336": { primary: "#f59e0b", light: "#fbbf24" },   // Four Seasons Wailea — amber
  "415858": { primary: "#6366f1", light: "#818cf8" },   // One&Only Palmilla — indigo
};

const FALLBACK_COLORS: ColorTheme[] = [
  { primary: "#06b6d4", light: "#22d3ee" },  // cyan
  { primary: "#ec4899", light: "#f472b6" },  // pink
  { primary: "#10b981", light: "#34d399" },  // green
  { primary: "#f97316", light: "#fb923c" },  // orange
];

export function getHotelColor(hotelId: string): ColorTheme {
  if (HOTEL_COLORS[hotelId]) return HOTEL_COLORS[hotelId];
  const idx = hotelId.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % FALLBACK_COLORS.length;
  return FALLBACK_COLORS[idx];
}

export const SECTION_COLORS: Record<string, ColorTheme> = {
  "3": { primary: "#6366f1", light: "#818cf8" },     // indigo
  "4": { primary: "#06b6d4", light: "#22d3ee" },     // cyan
  "5": { primary: "#f59e0b", light: "#fbbf24" },     // amber
  weekend: { primary: "#ec4899", light: "#f472b6" }, // pink
};

export function getSectionColor(key: string | number): ColorTheme {
  return SECTION_COLORS[String(key)] || { primary: "#71717a", light: "#a1a1aa" };
}

// Preset exclusion ranges per hotel (month-day based, applied to each year in range)
export interface PresetExclusion {
  label: string;
  startMonth: number; // 1-12
  startDay: number;
  endMonth: number;   // 1-12
  endDay: number;
}

const CABO_HURRICANE_PRESET: PresetExclusion = {
  label: "Hurricane season", startMonth: 6, startDay: 1, endMonth: 10, endDay: 31,
};

const CABO_IDS = [
  "415858", "874700", "16118058", "41895", "21136644", "2256238",
  "21565893", "33899743", "35813119", "15407425", "53084454",
];

const HOTEL_PRESETS: Record<string, PresetExclusion[]> = Object.fromEntries(
  CABO_IDS.map((id) => [id, [CABO_HURRICANE_PRESET]])
);

export function getHotelPresets(hotelId: string): PresetExclusion[] {
  return HOTEL_PRESETS[hotelId] || [];
}

// Heat map coloring
export function getHeatColor(value: number, min: number, max: number): string {
  const isLight = typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "light";
  const boost = isLight ? 0.08 : 0; // more opaque on light backgrounds
  if (max === min) return `rgba(16, 185, 129, ${(0.12 + boost).toFixed(2)})`;
  const ratio = (value - min) / (max - min);

  if (ratio <= 0.33) {
    return `rgba(16, 185, 129, ${(0.1 + boost + ratio * 0.3).toFixed(2)})`;
  } else if (ratio <= 0.66) {
    const lr = (ratio - 0.33) / 0.33;
    return `rgba(245, 158, 11, ${(0.1 + boost + lr * 0.25).toFixed(2)})`;
  } else {
    const lr = (ratio - 0.66) / 0.34;
    return `rgba(239, 68, 68, ${(0.1 + boost + lr * 0.3).toFixed(2)})`;
  }
}

export function getHeatTextColor(value: number, min: number, max: number): string {
  // Check if we're in light mode by reading CSS variable
  const isLight = typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "light";
  if (max === min) return isLight ? "#059669" : "#34d399";
  const ratio = (value - min) / (max - min);
  if (ratio <= 0.33) return isLight ? "#059669" : "#34d399";  // green (darker for light)
  if (ratio <= 0.66) return isLight ? "#d97706" : "#fbbf24";  // amber (darker for light)
  return isLight ? "#dc2626" : "#f87171";                      // red (darker for light)
}
