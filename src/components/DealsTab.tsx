"use client";

import { HotelConfig, HotelRateData } from "@/lib/types";
import { DateFilter } from "@/lib/deals";
import HotelPanel from "./HotelPanel";

interface DealsTabProps {
  hawaiiHotels: HotelConfig[];
  caboHotels: HotelConfig[];
  rateData: Record<string, HotelRateData>;
  hawaiiHotelId: string;
  caboHotelId: string;
  onSelectHawaii: (id: string) => void;
  onSelectCabo: (id: string) => void;
  hawaiiFilter: DateFilter;
  caboFilter: DateFilter;
  onHawaiiFilterChange: (f: DateFilter) => void;
  onCaboFilterChange: (f: DateFilter) => void;
}

export default function DealsTab({
  hawaiiHotels, caboHotels, rateData,
  hawaiiHotelId, caboHotelId,
  onSelectHawaii, onSelectCabo,
  hawaiiFilter, caboFilter,
  onHawaiiFilterChange, onCaboFilterChange,
}: DealsTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <HotelPanel
        regionLabel="Hawaii"
        hotels={hawaiiHotels}
        rateData={rateData}
        selectedId={hawaiiHotelId}
        onSelectHotel={onSelectHawaii}
        filter={hawaiiFilter}
        onFilterChange={onHawaiiFilterChange}
      />
      <HotelPanel
        regionLabel="Cabo"
        hotels={caboHotels}
        rateData={rateData}
        selectedId={caboHotelId}
        onSelectHotel={onSelectCabo}
        filter={caboFilter}
        onFilterChange={onCaboFilterChange}
      />
    </div>
  );
}
