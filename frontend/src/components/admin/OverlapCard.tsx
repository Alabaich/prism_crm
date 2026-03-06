import React from "react";
import { Repeat, ArrowRight } from "lucide-react";

export const OverlapCard: React.FC<{ duplicatesCount: number; onClick: () => void }> = ({ duplicatesCount, onClick }) => (
  <div
    onClick={onClick}
    className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between cursor-pointer hover:border-amber-300 hover:shadow-md transition-all group"
  >
    <div>
      <p className="text-sm font-medium text-slate-500 mb-1 group-hover:text-amber-600 transition-colors">Cross-Platform Overlap</p>
      <h3 className="text-3xl font-bold text-slate-900">{duplicatesCount}</h3>
      <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
        Click to view details <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
      </p>
    </div>
    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-100 transition-colors">
      <Repeat className="w-6 h-6" />
    </div>
  </div>
);
