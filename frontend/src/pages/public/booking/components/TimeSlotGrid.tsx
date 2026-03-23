import React from "react";
import { Clock } from "lucide-react";
import { format, isSaturday } from "date-fns";

const TIME_SLOTS = [
  "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00",
];

const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
};

interface Props {
  date: string;
  today: Date;
  currentHour: number;
  takenSlots: string[];
  selectedTime: string;
  isLoading: boolean;
  onSelect: (time: string) => void;
}

const TimeSlotGrid: React.FC<Props> = ({
  date,
  today,
  currentHour,
  takenSlots,
  selectedTime,
  isLoading,
  onSelect,
}) => {
  const isToday = date === format(today, "yyyy-MM-dd");
  const localDate = parseLocalDate(date);

  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 mb-2">
        <Clock className="inline w-4 h-4 mr-1 text-zinc-400" />
        Time
      </label>
      {isLoading ? (
        <div className="text-sm text-zinc-400 py-4">Loading available times...</div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {TIME_SLOTS.map((slot) => {
            const isTaken = takenSlots.includes(slot);
            const slotHour = parseInt(slot.split(":")[0], 10);
            const isPast = isToday && slotHour <= currentHour;
            const isSatEve = isSaturday(localDate) && slot === "16:00";
            const isDisabled = isTaken || isPast || isSatEve;
            const isSelected = selectedTime === slot;

            return (
              <button
                key={slot}
                type="button"
                disabled={isDisabled}
                onClick={() => onSelect(slot)}
                className={`py-2 rounded-lg text-sm font-medium transition-all ${
                  isSelected
                    ? "bg-zinc-900 text-white"
                    : isDisabled
                    ? "bg-zinc-100 text-zinc-300 cursor-not-allowed line-through"
                    : "bg-zinc-50 text-zinc-700 hover:bg-zinc-200 border border-zinc-200"
                }`}
              >
                {slot}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TimeSlotGrid;