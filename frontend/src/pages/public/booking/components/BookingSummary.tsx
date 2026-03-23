import React from "react";
import { MapPin, Clock, User } from "lucide-react";
import { format } from "date-fns";

const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
};

interface Props {
  building?: string;
  date: string;
  time: string;
  agentName?: string;
  showBuilding?: boolean;
}

const BookingSummary: React.FC<Props> = ({
  building,
  date,
  time,
  agentName,
  showBuilding = true,
}) => (
  <div className="bg-zinc-50 rounded-xl p-4 mb-6 border border-zinc-200 text-sm">
    {showBuilding && building && (
      <div className="flex items-center gap-2 text-zinc-600 mb-1">
        <MapPin className="w-4 h-4" /> {building}
      </div>
    )}
    <div className="flex items-center gap-2 text-zinc-600">
      <Clock className="w-4 h-4" />
      {format(parseLocalDate(date), "MMMM d, yyyy")} at {time}
    </div>
    {agentName && (
      <div className="flex items-center gap-2 text-zinc-600 mt-1">
        <User className="w-4 h-4" /> Meeting with {agentName}
      </div>
    )}
  </div>
);

export default BookingSummary;