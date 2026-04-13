import { StayDeal, CalendarRow, StayInfo } from "./types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + "T12:00:00").getDay();
}

function getDayName(dateStr: string): string {
  return DAY_NAMES[getDayOfWeek(dateStr)];
}

export interface DateFilter {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  excludeRanges: { start: string; end: string; label?: string }[];
}

export function getDefaultFilter(monthsAhead: number = 6): DateFilter {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const end = new Date(today);
  end.setMonth(end.getMonth() + monthsAhead);
  return {
    startDate: today.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
    excludeRanges: [],
  };
}

function isDateExcluded(dateStr: string, excludeRanges: DateFilter["excludeRanges"]): boolean {
  for (const range of excludeRanges) {
    if (dateStr >= range.start && dateStr <= range.end) return true;
  }
  return false;
}

function isStayExcluded(checkIn: string, nights: number, excludeRanges: DateFilter["excludeRanges"]): boolean {
  for (let i = 0; i < nights; i++) {
    if (isDateExcluded(addDays(checkIn, i), excludeRanges)) return true;
  }
  return false;
}

export function stayIncludesWeekend(checkIn: string, nights: number): boolean {
  let hasFri = false;
  let hasSat = false;
  for (let i = 0; i < nights; i++) {
    const dow = getDayOfWeek(addDays(checkIn, i));
    if (dow === 5) hasFri = true;
    if (dow === 6) hasSat = true;
  }
  return hasFri && hasSat; // Must include both Friday AND Saturday night
}

export function computeStayDeals(
  rates: Record<string, number | null>,
  nights: number,
  filter: DateFilter
): StayDeal[] {
  const deals: StayDeal[] = [];
  const current = new Date(filter.startDate + "T12:00:00");
  const endDate = new Date(filter.endDate + "T12:00:00");

  while (current <= endDate) {
    const checkIn = current.toISOString().split("T")[0];

    // Skip if any night in the stay falls in an excluded range
    if (!isStayExcluded(checkIn, nights, filter.excludeRanges)) {
      const dailyRates: { date: string; rate: number }[] = [];
      let valid = true;
      let total = 0;

      for (let i = 0; i < nights; i++) {
        const d = addDays(checkIn, i);
        const rate = rates[d];
        if (rate == null) {
          valid = false;
          break;
        }
        dailyRates.push({ date: d, rate });
        total += rate;
      }

      if (valid && dailyRates.length === nights) {
        deals.push({
          checkIn,
          checkOut: addDays(checkIn, nights),
          nights,
          totalCost: total,
          avgPerNight: Math.round(total / nights),
          dailyRates,
          isWeekend: stayIncludesWeekend(checkIn, nights),
        });
      }
    }

    current.setDate(current.getDate() + 1);
  }

  deals.sort((a, b) => a.avgPerNight - b.avgPerNight);
  return deals;
}

export function getTopDeals(
  rates: Record<string, number | null>,
  nights: number,
  filter: DateFilter,
  count: number = 5
): StayDeal[] {
  return computeStayDeals(rates, nights, filter).slice(0, count);
}

export function getTopWeekendDeals(
  rates: Record<string, number | null>,
  nights: number,
  filter: DateFilter,
  count: number = 5
): StayDeal[] {
  return computeStayDeals(rates, nights, filter)
    .filter((d) => d.isWeekend)
    .slice(0, count);
}

function computeStayInfo(
  rates: Record<string, number | null>,
  checkIn: string,
  nights: number
): StayInfo {
  const dailyRates: { date: string; rate: number | null }[] = [];
  let total = 0;
  let allAvailable = true;

  for (let i = 0; i < nights; i++) {
    const d = addDays(checkIn, i);
    const rate = rates[d] ?? null;
    dailyRates.push({ date: d, rate });
    if (rate == null) {
      allAvailable = false;
    } else {
      total += rate;
    }
  }

  return {
    total: allAvailable ? total : null,
    avgPerNight: allAvailable ? Math.round(total / nights) : null,
    dailyRates,
  };
}

export function computeCalendarRows(
  rates: Record<string, number | null>,
  nightOptions: number[],
  filter: DateFilter
): CalendarRow[] {
  const rows: CalendarRow[] = [];
  const current = new Date(filter.startDate + "T12:00:00");
  const endDate = new Date(filter.endDate + "T12:00:00");

  while (current <= endDate) {
    const checkIn = current.toISOString().split("T")[0];
    const excluded = isDateExcluded(checkIn, filter.excludeRanges);

    if (!excluded) {
      const stays: Record<number, StayInfo> = {};
      for (const n of nightOptions) {
        stays[n] = computeStayInfo(rates, checkIn, n);
      }

      rows.push({
        checkIn,
        dayOfWeek: getDayName(checkIn),
        isWeekend: getDayOfWeek(checkIn) === 5 || getDayOfWeek(checkIn) === 6,
        stays,
      });
    }

    current.setDate(current.getDate() + 1);
  }

  return rows;
}

export function getColumnMinMax(
  rows: CalendarRow[],
  nights: number
): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const row of rows) {
    const avg = row.stays[nights]?.avgPerNight;
    if (avg != null) {
      if (avg < min) min = avg;
      if (avg > max) max = avg;
    }
  }
  if (min === Infinity) return { min: 0, max: 0 };
  return { min, max };
}
