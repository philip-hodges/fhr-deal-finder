"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2, Plus, RefreshCw, Hotel } from "lucide-react";
import { HotelConfig, HotelRateData } from "@/lib/types";

interface SettingsTabProps {
  hotels: HotelConfig[];
  rateData: Record<string, HotelRateData>;
  onRefresh: () => void;
}

export default function SettingsTab({ hotels, rateData, onRefresh }: SettingsTabProps) {
  const [newName, setNewName] = useState("");
  const [newId, setNewId] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState<string | null>(null);

  const addHotel = async () => {
    if (!newName.trim() || !newId.trim()) return;
    await fetch("/api/hotels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: newId, name: newName, maxfhrId: newId }),
    });
    setNewName("");
    setNewId("");
    onRefresh();
  };

  const removeHotel = async (id: string) => {
    await fetch("/api/hotels", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    onRefresh();
  };

  const triggerScrape = async () => {
    setScraping(true);
    setScrapeStatus("Scraping started... This may take a few minutes.");
    try {
      await fetch("/api/scrape", { method: "POST" });
      setScrapeStatus("Scrape running in background. Refresh page when done.");
    } catch {
      setScrapeStatus("Failed to start scrape.");
    }
    setScraping(false);
  };

  return (
    <div className="space-y-6">
      {/* Hotels */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Hotels</h3>
        <div className="space-y-2">
          {hotels.map((hotel, i) => {
            const data = rateData[hotel.id];
            const dateCount = data ? Object.keys(data.rates).length : 0;
            const priceCount = data ? Object.values(data.rates).filter((v) => v != null).length : 0;

            return (
              <motion.div
                key={hotel.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-xl px-4 py-3 flex items-center gap-3"
              >
                <Hotel size={16} className="text-text-dim flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{hotel.name}</div>
                  <div className="text-xs text-text-dim">
                    MaxFHR ID: {hotel.maxfhrId}
                    {data && (
                      <span>
                        {" "}&middot; {priceCount}/{dateCount} dates with prices
                        {" "}&middot; Updated {new Date(data.lastUpdated).toLocaleDateString()}
                      </span>
                    )}
                    {!data && <span> &middot; Not yet scraped</span>}
                  </div>
                </div>
                <button
                  onClick={() => removeHotel(hotel.id)}
                  className="p-2 rounded-lg hover:bg-white/5 text-text-dim hover:text-expensive transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Add Hotel */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Add Hotel</h3>
        <div className="glass rounded-xl px-4 py-3 space-y-3">
          <div>
            <label className="text-xs text-text-muted block mb-1">Hotel Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm bg-white/5 border border-border text-text outline-none focus:border-border-bright"
              placeholder="e.g. Ritz-Carlton Kapalua"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-1">MaxFHR Hotel ID</label>
            <input
              type="text"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm bg-white/5 border border-border text-text outline-none focus:border-border-bright"
              placeholder="e.g. 14336"
            />
            <p className="text-xs text-text-dim mt-1">Find the ID in the MaxFHR hotel page URL: maxfhr.com/hotel/[ID]</p>
          </div>
          <button
            onClick={addHotel}
            disabled={!newName.trim() || !newId.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-30"
            style={{ background: "rgba(99, 102, 241, 0.2)", color: "#818cf8" }}
          >
            <Plus size={14} />
            Add Hotel
          </button>
        </div>
      </div>

      {/* Scrape */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Data</h3>
        <div className="glass rounded-xl px-4 py-3 space-y-3">
          <p className="text-xs text-text-muted">
            Run the scraper to fetch the latest nightly rates from MaxFHR.com.
            You can also run it from the terminal: <code className="text-text-dim">npm run scrape</code>
          </p>
          <button
            onClick={triggerScrape}
            disabled={scraping}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{ background: "rgba(16, 185, 129, 0.2)", color: "#34d399" }}
          >
            <RefreshCw size={14} className={scraping ? "animate-spin" : ""} />
            {scraping ? "Starting..." : "Run Scraper"}
          </button>
          {scrapeStatus && <p className="text-xs text-text-muted">{scrapeStatus}</p>}
        </div>
      </div>
    </div>
  );
}
