"use client";

import { ChevronDown } from "lucide-react";
import { HotelConfig } from "@/lib/types";
import { getHotelColor } from "@/lib/colors";

interface HotelDropdownProps {
  hotels: HotelConfig[];
  selectedId: string;
  onSelect: (id: string) => void;
  regionLabel: string;
}

export default function HotelDropdown({ hotels, selectedId, onSelect, regionLabel }: HotelDropdownProps) {
  const hotelColor = getHotelColor(selectedId);
  const selected = hotels.find((h) => h.id === selectedId);

  // Group by island if hotels have islands
  const islands = Array.from(new Set(hotels.map((h) => h.island).filter(Boolean))) as string[];
  const hasIslands = islands.length > 1;

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] uppercase tracking-wider text-text-dim">{regionLabel}</span>
      </div>
      <div className="relative">
        <select
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          className="w-full appearance-none pl-3 pr-8 py-2 rounded-xl text-sm font-medium cursor-pointer outline-none transition-all"
          style={{
            background: `linear-gradient(135deg, ${hotelColor.primary}12, ${hotelColor.primary}06)`,
            border: `1px solid ${hotelColor.primary}30`,
            color: "var(--color-text)",
          }}
        >
          {hasIslands ? (
            islands.map((island) => (
              <optgroup key={island} label={island}>
                {hotels
                  .filter((h) => h.island === island)
                  .map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
              </optgroup>
            ))
          ) : (
            hotels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))
          )}
        </select>
        <ChevronDown
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: hotelColor.light }}
        />
      </div>
    </div>
  );
}
