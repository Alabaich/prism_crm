import React from "react";
import { TrendingUp } from "lucide-react";

interface LeadsTrendChartProps {
  data: { label: string; value: number }[];
  totalValue: number;
  percentage: number;
}

export const LeadsTrendChart: React.FC<LeadsTrendChartProps> = ({ data, totalValue, percentage }) => {
  const maxVal = Math.max(...data.map(d => d.value), 10);
  
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm w-full mb-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Leads Acquisition Trend</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900">{totalValue}</span>
            <span className={`flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${percentage >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              <TrendingUp className="w-3 h-3 mr-1" /> {percentage}%
            </span>
          </div>
        </div>
      </div>
      <div className="h-48 w-full flex items-end gap-1 sm:gap-2 pt-4">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end items-center group relative h-full">
            <div className="absolute -top-8 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
              {d.label}: {d.value}
            </div>
            <div className="w-full bg-blue-100 hover:bg-blue-500 rounded-t-sm transition-all duration-300" style={{ height: `${(d.value / maxVal) * 100}%` }}></div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor(data.length/2)]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
};
