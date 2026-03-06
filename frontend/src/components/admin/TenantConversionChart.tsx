import React from "react";

export interface TenantConversionData {
  label: string;
  conversionRate: number; // Percentage (0-100)
  totalTours: number;
  convertedTenants: number;
}

interface TenantConversionChartProps {
  data: TenantConversionData[];
}

export const TenantConversionChart: React.FC<TenantConversionChartProps> = ({ data }) => {
  // Floor at 20% so small conversions don't look massive
  const maxVal = Math.max(...(data || []).map(d => d.conversionRate), 20);
  
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm w-full">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Tenant Conversion by Source</h2>
          <p className="text-sm text-slate-500 mt-1">Percentage of tours that resulted in a lease</p>
        </div>
      </div>
      
      {!data || data.length === 0 ? (
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
                  {d.convertedTenants} tenants / {d.totalTours} tours
                </span>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
              </div>

              {/* Floating Percentage Label */}
              <span className="mb-2 text-xs font-extrabold text-purple-600 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 duration-300">
                {d.conversionRate}%
              </span>

              {/* The Bar - Styled in Purple to match the Convert Button */}
              <div 
                className="w-full bg-purple-100 group-hover:bg-purple-500 rounded-t-lg transition-all duration-500 ease-out relative" 
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