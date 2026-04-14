export interface HotelRateData {
  hotelId: string;
  hotelName: string;
  lastUpdated: string;
  rates: Record<string, number | null>; // "2026-04-13" => 1005 or null
}

export interface HotelConfig {
  id: string;
  name: string;
  maxfhrId: string;
  region: string;       // "Hawaii" | "Cabo"
  island: string | null; // "Maui", "Oahu", etc. or null for Cabo
}

export interface StayDeal {
  checkIn: string;
  checkOut: string;
  nights: number;
  totalCost: number;
  avgPerNight: number;
  dailyRates: { date: string; rate: number }[];
  isWeekend: boolean;
}

export interface CalendarRow {
  checkIn: string;
  dayOfWeek: string;
  isWeekend: boolean;
  stays: Record<number, StayInfo>;
}

export interface StayInfo {
  total: number | null;
  avgPerNight: number | null;
  dailyRates: { date: string; rate: number | null }[];
}
