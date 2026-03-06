import React from "react";
import { Users } from "lucide-react";

export const UniquePeopleCard: React.FC<{ uniquePeople: number }> = ({ uniquePeople }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500 mb-1">Unique People</p>
      <h3 className="text-3xl font-bold text-slate-900">{uniquePeople}</h3>
      <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
        <Users className="w-3 h-3" /> Based on unique email
      </p>
    </div>
    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
      <Users className="w-6 h-6" />
    </div>
  </div>
);