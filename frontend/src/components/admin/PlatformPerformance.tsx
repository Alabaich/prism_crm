import React from "react";
import { BarChart3 } from "lucide-react";

export const PlatformPerformance: React.FC<{ platformStats: any[]; totalLeads: number }> = ({ platformStats, totalLeads }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full">
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Platform Performance</h2>
        <p className="text-sm text-slate-500">Unique leads vs Total entries</p>
      </div>
      <BarChart3 className="w-5 h-5 text-slate-400" />
    </div>
    <div className="space-y-6">
      {platformStats.length === 0 ? (
        <div className="text-center text-slate-400 py-8 italic">No data available</div>
      ) : (
        platformStats.map((stat) => (
          <div key={stat.source} className="group">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-slate-700">{stat.source}</span>
              <div className="flex gap-4 text-xs">
                <span className="text-slate-500">Total: {stat.totalCount}</span>
                <span className="font-medium text-blue-600">Unique: {stat.uniqueCount}</span>
              </div>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden relative">
              <div className="absolute top-0 left-0 h-full bg-blue-500 rounded-full z-10 transition-all duration-500" style={{ width: `${totalLeads > 0 ? (stat.uniqueCount / totalLeads) * 100 : 0}%` }}></div>
              <div className="absolute top-0 left-0 h-full bg-blue-200 rounded-full z-0 transition-all duration-500" style={{ width: `${totalLeads > 0 ? (stat.totalCount / totalLeads) * 100 : 0}%` }}></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 text-right">{stat.efficiency}% of entries are unique</p>
          </div>
        ))
      )}
    </div>
  </div>
);