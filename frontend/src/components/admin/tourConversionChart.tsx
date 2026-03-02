import React from "react";
import { Percent } from "lucide-react";

export interface ConversionData {
  label: string;
  conversionRate: number; // Percentage (0-100)
  totalLeads: number;
  bookedTours: number;
}

interface TourConversionChartProps {
  data: ConversionData[];
}

export const TourConversionChart: React.FC<TourConversionChartProps> = ({ data }) => {
  // We determine the highest conversion rate to scale the bars properly.
  // We floor it at 20% so that if your highest conversion is only 2%, 
  // the bar doesn't falsely look like it's at 100% of the container.
  const maxVal = Math.max(...data.map(d => d.conversionRate), 20);
  
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm w-full">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Tour Conversion by Source</h2>
          <p className="text-sm text-slate-500 mt-1">Percentage of leads that successfully booked a tour</p>
        </div>
        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
          <Percent className="w-5 h-5" />
        </div>
      </div>
      
      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-slate-400 italic text-sm">
          Not enough data to display conversions.
        </div>
      ) : (
        <div className="h-48 w-full flex items-end gap-3 sm:gap-6 pt-8">
          {data.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end items-center group relative h-full">
              
              {/* Detailed Hover Tooltip */}
              <div className="absolute -top-14 bg-slate-800 text-white text-xs px-3 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-xl flex flex-col items-center">
                <span className="font-bold mb-0.5">{d.label}</span>
                <span className="text-slate-300 font-medium text-[10px] uppercase tracking-wider">
                  {d.bookedTours} tours / {d.totalLeads} leads
                </span>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
              </div>

              {/* Floating Percentage Label */}
              <span className="mb-2 text-xs font-extrabold text-indigo-600 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 duration-300">
                {d.conversionRate}%
              </span>

              {/* The Bar */}
              <div 
                className="w-full bg-indigo-100 group-hover:bg-indigo-500 rounded-t-lg transition-all duration-500 ease-out relative" 
                style={{ height: `${(d.conversionRate / maxVal) * 100}%` }}
              >
              </div>

              {/* X-Axis Platform Label */}
              <div className="mt-3 text-[10px] sm:text-xs text-slate-500 font-bold text-center truncate w-full px-1">
                {d.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};