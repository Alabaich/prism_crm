import React from "react";
import { Layers } from "lucide-react";

export const TotalTouchpointsCard: React.FC<{ totalLeads: number }> = ({ totalLeads }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500 mb-1">Total Touchpoints</p>
      <h3 className="text-3xl font-bold text-slate-900">{totalLeads}</h3>
      <p className="text-xs text-slate-400 mt-2">Raw entries from all sources</p>
    </div>
    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
      <Layers className="w-6 h-6" />
    </div>
  </div>
);