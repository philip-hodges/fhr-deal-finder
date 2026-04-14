"use client";

import { motion } from "framer-motion";
import { Hotel, ExternalLink, GitBranch, Clock } from "lucide-react";
import { HotelConfig, HotelRateData } from "@/lib/types";
import { getHotelColor } from "@/lib/colors";

interface SettingsTabProps {
  hotels: HotelConfig[];
  rateData: Record<string, HotelRateData>;
  onRefresh: () => void;
}

export default function SettingsTab({ hotels, rateData }: SettingsTabProps) {
  return (
    <div className="space-y-6">
      {/* Hotels */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Hotels Being Tracked</h3>
        <div className="space-y-2">
          {hotels.map((hotel, i) => {
            const data = rateData[hotel.id];
            const dateCount = data ? Object.keys(data.rates).length : 0;
            const priceCount = data ? Object.values(data.rates).filter((v) => v != null).length : 0;
            const hotelColor = getHotelColor(hotel.id);

            return (
              <motion.div
                key={hotel.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-xl px-4 py-3 flex items-center gap-3"
                style={{ borderLeft: `3px solid ${hotelColor.primary}50` }}
              >
                <Hotel size={16} style={{ color: hotelColor.primary }} className="flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{hotel.name}</div>
                  <div className="text-[11px] text-text-dim">
                    MaxFHR ID: {hotel.maxfhrId}
                    {data && (
                      <span>
                        {" "}&middot; {priceCount}/{dateCount} dates with prices
                      </span>
                    )}
                  </div>
                  {data && (
                    <div className="text-[10px] text-text-dim flex items-center gap-1 mt-0.5">
                      <Clock size={9} />
                      Updated {new Date(data.lastUpdated).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                    </div>
                  )}
                </div>
                <a
                  href={`https://www.maxfhr.com/hotel/${hotel.maxfhrId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg text-text-dim hover:text-text-muted transition-colors"
                  style={{ background: `rgba(var(--oc), 0.04)` }}
                >
                  <ExternalLink size={14} />
                </a>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* How to add hotels */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Add a Hotel</h3>
        <div className="glass rounded-xl px-4 py-4 space-y-3">
          <p className="text-xs text-text-muted leading-relaxed">
            To add a new hotel, find it on MaxFHR and note the ID from the URL
            (e.g. <code className="text-text-dim">maxfhr.com/hotel/<strong>14336</strong></code>).
            Then:
          </p>
          <ol className="text-xs text-text-muted space-y-2 list-decimal list-inside">
            <li>
              Edit <code className="text-text-dim">data/hotels.json</code> — add a line like:<br />
              <code className="text-[10px] text-text-dim font-mono block mt-1 px-2 py-1 rounded"
                style={{ background: `rgba(var(--oc), 0.04)` }}
              >
                {`{ "id": "12345", "name": "Hotel Name", "maxfhrId": "12345" }`}
              </code>
            </li>
            <li>Run <code className="text-text-dim">npm run scrape</code> to fetch the rate data</li>
            <li>Commit and push — Vercel auto-deploys</li>
          </ol>
          <a
            href="https://www.maxfhr.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818cf8" }}
          >
            <ExternalLink size={12} />
            Browse MaxFHR Hotels
          </a>
        </div>
      </div>

      {/* Data update info */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Data Updates</h3>
        <div className="glass rounded-xl px-4 py-4 space-y-3">
          <p className="text-xs text-text-muted leading-relaxed">
            Rates are scraped automatically from MaxFHR.com every day at 6am UTC
            via GitHub Actions. When new data is committed, Vercel auto-redeploys the site.
          </p>
          <p className="text-xs text-text-muted leading-relaxed">
            You can also trigger a manual scrape from the GitHub Actions page or by running
            <code className="text-text-dim"> npm run scrape</code> locally.
          </p>
          <a
            href="https://github.com/philip-hodges/fhr-deal-finder/actions"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}
          >
            <GitBranch size={12} />
            View GitHub Actions
          </a>
        </div>
      </div>
    </div>
  );
}
