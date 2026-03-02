import React from "react";
import { PieChart as PieIcon } from "lucide-react";

export const OverlapSummary: React.FC<{ overlapStats: any[] }> = ({ overlapStats }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-12">
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Source Overlap Summary</h2>
        <p className="text-sm text-slate-500">Where are the same people applying?</p>
      </div>
      <PieIcon className="w-5 h-5 text-slate-400" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {overlapStats.length === 0 ? (
        <div className="col-span-2 h-20 flex items-center justify-center text-slate-400 text-sm italic">
          No overlaps found in this date range.
        </div>
      ) : (
        overlapStats.map((item, index) => (
          <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-blue-600">{item.pair.split(" & ")[0]?.charAt(0)}</div>
                <div className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-indigo-600">{item.pair.split(" & ")[1]?.charAt(0)}</div>
              </div>
              <span className="text-sm font-medium text-slate-700">{item.pair}</span>
            </div>
            <div className="text-right">
              <span className="block text-lg font-bold text-slate-800">{item.count}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wide">Shared Leads</span>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);
