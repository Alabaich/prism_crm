import React from "react";
import { Calendar, ArrowRight, Loader2, Filter } from "lucide-react";
import type { DateRange } from "../types";

interface AnalyticsHeaderProps {
  dateRange: DateRange;
  setDateRange: React.Dispatch<React.SetStateAction<DateRange>>;
  loading: boolean;
}

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({ dateRange, setDateRange, loading }) => (
  <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6 border-b border-slate-200 pb-6 pt-4">
    <div>
      <h1 className="text-3xl font-bold text-slate-800">Analytics Dashboard</h1>
      <p className="text-slate-500 mt-1">Cross-platform performance & lead overlap analysis</p>
    </div>
    <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center px-3 py-2 border-r border-slate-100 hidden sm:flex">
        <Calendar className="w-4 h-4 text-slate-400 mr-2" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Range</span>
      </div>
      <div className="flex items-center gap-2 px-2">
        <div className="relative group">
          <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-semibold text-slate-400">From</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
            className="w-32 text-sm font-medium text-slate-700 bg-transparent border border-slate-200 rounded-lg px-2 py-1.5 outline-none"
          />
        </div>
        <ArrowRight className="w-4 h-4 text-slate-300" />
        <div className="relative group">
          <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-semibold text-slate-400">To</label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
            className="w-32 text-sm font-medium text-slate-700 bg-transparent border border-slate-200 rounded-lg px-2 py-1.5 outline-none"
          />
        </div>
      </div>
      <button className="p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition shadow-md" disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
      </button>
    </div>
  </div>
);