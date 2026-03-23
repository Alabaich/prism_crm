import React from "react";
import { Calendar as CalendarIcon } from "lucide-react";

interface DateOption {
  date: string;
  label: string;
  disabled: boolean;
  labelSuffix: string;
}

interface Props {
  availableDates: DateOption[];
  selected: string;
  onChange: (date: string) => void;
}

const DateSelector: React.FC<Props> = ({ availableDates, selected, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-zinc-700 mb-2">
      <CalendarIcon className="inline w-4 h-4 mr-1 text-zinc-400" />
      Date
    </label>
    <select
      name="date"
      value={selected}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-zinc-200 p-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
    >
      {availableDates.map((d) => (
        <option key={d.date} value={d.date} disabled={d.disabled}>
          {d.label}{d.labelSuffix}
        </option>
      ))}
    </select>
  </div>
);

export default DateSelector;