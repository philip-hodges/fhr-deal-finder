"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingDown, Calendar, BarChart3, Settings, RefreshCw } from "lucide-react";
import { HotelConfig, HotelRateData } from "@/lib/types";
import { DateFilter, getDefaultFilter } from "@/lib/deals";
import DealsTab from "@/components/DealsTab";
import CalendarTab from "@/components/CalendarTab";
import PriceChart from "@/components/PriceChart";
import SettingsTab from "@/components/SettingsTab";
import ThemeToggle from "@/components/ThemeToggle";
import HotelPanel from "@/components/HotelPanel";

const tabs = [
  { id: "deals", label: "Deals", icon: TrendingDown },
  { id: "chart", label: "Chart", icon: BarChart3 },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("deals");
  const [hotels, setHotels] = useState<HotelConfig[]>([]);
  const [rateData, setRateData] = useState<Record<string, HotelRateData>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Two-panel state
  const [hawaiiHotelId, setHawaiiHotelId] = useState("14336");
  const [caboHotelId, setCaboHotelId] = useState("415858");
  const [hawaiiFilter, setHawaiiFilter] = useState<DateFilter>(getDefaultFilter(6));
  const [caboFilter, setCaboFilter] = useState<DateFilter>(getDefaultFilter(6));

  const initializedRef = useRef(false);

  const hawaiiHotels = useMemo(() => hotels.filter((h) => h.region === "Hawaii"), [hotels]);
  const caboHotels = useMemo(() => hotels.filter((h) => h.region === "Cabo"), [hotels]);

  async function fetchData() {
    try {
      const hotelsRes = await fetch("/api/hotels");
      const hotelsList: HotelConfig[] = await hotelsRes.json();
      setHotels(hotelsList);

      if (!initializedRef.current && hotelsList.length > 0) {
        const firstHawaii = hotelsList.find((h) => h.region === "Hawaii");
        const firstCabo = hotelsList.find((h) => h.region === "Cabo");
        if (firstHawaii) setHawaiiHotelId(firstHawaii.id);
        if (firstCabo) setCaboHotelId(firstCabo.id);
        initializedRef.current = true;
      }

      const ratesMap: Record<string, HotelRateData> = {};
      await Promise.all(
        hotelsList.map(async (hotel) => {
          try {
            const res = await fetch(`/api/rates/${hotel.id}`);
            if (res.ok) {
              ratesMap[hotel.id] = await res.json();
            }
          } catch { /* not yet scraped */ }
        })
      );
      setRateData(ratesMap);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  const lastUpdated = Object.values(rateData).reduce<string | null>((latest, rd) => {
    if (!latest || rd.lastUpdated > latest) return rd.lastUpdated;
    return latest;
  }, null);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-text-muted">Loading hotel data...</p>
        </div>
      </div>
    );
  }

  const hasData = Object.keys(rateData).length > 0;

  // Shared props for two-panel tabs
  const panelProps = {
    hawaiiHotels, caboHotels, rateData,
    hawaiiHotelId, caboHotelId,
    onSelectHawaii: setHawaiiHotelId,
    onSelectCabo: setCaboHotelId,
    hawaiiFilter, caboFilter,
    onHawaiiFilterChange: setHawaiiFilter,
    onCaboFilterChange: setCaboFilter,
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="px-4 pt-4 pb-2 safe-top flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold gradient-text">FHR Deal Finder</h1>
          <p className="text-xs text-text-dim">Hawaii & Cabo — Fine Hotels & Resorts</p>
        </div>
        <ThemeToggle />
      </header>

      {/* Last updated bar */}
      {lastUpdated && (
        <div className="px-4 pb-2 flex items-center justify-between">
          <p className="text-[10px] text-text-dim">
            Data last updated: {new Date(lastUpdated).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
          </p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors"
            style={{ background: `rgba(var(--oc), 0.04)`, color: "var(--color-text-muted)" }}
          >
            <RefreshCw size={10} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 pb-24">
        {!hasData && activeTab !== "settings" ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <p className="text-sm text-text-muted text-center">No rate data yet. Run the scraper first:</p>
            <code className="text-xs text-accent glass px-3 py-2 rounded-lg">npm run scrape</code>
            <button
              onClick={() => setActiveTab("settings")}
              className="text-xs px-4 py-2 rounded-lg font-medium"
              style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}
            >
              Go to Settings
            </button>
          </div>
        ) : (
          <div>
            {activeTab === "deals" && <DealsTab {...panelProps} />}
            {activeTab === "chart" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PriceChart
                  hotels={hawaiiHotels}
                  rateData={rateData}
                  selectedHotelId={hawaiiHotelId}
                  onSelectHotel={setHawaiiHotelId}
                  filter={hawaiiFilter}
                  onFilterChange={setHawaiiFilter}
                />
                <PriceChart
                  hotels={caboHotels}
                  rateData={rateData}
                  selectedHotelId={caboHotelId}
                  onSelectHotel={setCaboHotelId}
                  filter={caboFilter}
                  onFilterChange={setCaboFilter}
                />
              </div>
            )}
            {activeTab === "calendar" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CalendarTab
                  hotels={hawaiiHotels}
                  rateData={rateData}
                  selectedHotelId={hawaiiHotelId}
                  onSelectHotel={setHawaiiHotelId}
                  filter={hawaiiFilter}
                  onFilterChange={setHawaiiFilter}
                />
                <CalendarTab
                  hotels={caboHotels}
                  rateData={rateData}
                  selectedHotelId={caboHotelId}
                  onSelectHotel={setCaboHotelId}
                  filter={caboFilter}
                  onFilterChange={setCaboFilter}
                />
              </div>
            )}
            {activeTab === "settings" && (
              <SettingsTab hotels={hotels} rateData={rateData} onRefresh={fetchData} />
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 glass-bright safe-bottom z-50">
        <div className="flex items-center justify-around px-4 py-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="relative flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors"
            >
              {activeTab === id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: `rgba(var(--oc), 0.06)` }}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <Icon size={18} className="relative z-10" style={{ color: activeTab === id ? "var(--color-text)" : "var(--color-text-dim)" }} />
              <span className="relative z-10 text-[10px] font-medium" style={{ color: activeTab === id ? "var(--color-text)" : "var(--color-text-dim)" }}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
