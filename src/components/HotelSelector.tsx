"use client";

import { motion } from "framer-motion";
import { HotelConfig } from "@/lib/types";
import { getHotelColor } from "@/lib/colors";

interface HotelSelectorProps {
  hotels: HotelConfig[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function HotelSelector({ hotels, selectedId, onSelect }: HotelSelectorProps) {
  const activeColor = getHotelColor(selectedId);

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
      {hotels.map((hotel) => {
        const isActive = selectedId === hotel.id;
        const color = getHotelColor(hotel.id);
        return (
          <button
            key={hotel.id}
            onClick={() => onSelect(hotel.id)}
            className="relative flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ color: isActive ? color.light : "var(--color-text-muted)" }}
          >
            {isActive && (
              <motion.div
                layoutId="hotelIndicator"
                className="absolute inset-0 rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${activeColor.primary}20, ${activeColor.primary}08)`,
                  border: `1px solid ${activeColor.primary}30`,
                }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10">{hotel.name}</span>
          </button>
        );
      })}
    </div>
  );
}
