import React from "react";
import { X, Repeat, Tag } from "lucide-react";
import type { OverlapGroup } from "../types";

interface OverlapModalProps {
  isOpen: boolean;
  onClose: () => void;
  overlappingGroups: OverlapGroup[];
}

export const OverlapModal: React.FC<OverlapModalProps> = ({ isOpen, onClose, overlappingGroups }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Duplicate Details</h2>
            <p className="text-sm text-slate-500 mt-1">Found {overlappingGroups.length} unique emails originating from multiple sources.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white hover:shadow-sm rounded-xl transition">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-8 overflow-y-auto custom-scrollbar space-y-6 bg-slate-50/20">
          {overlappingGroups.length === 0 ? (
            <div className="text-center py-12 text-slate-400 italic">No duplicates found in this timeframe.</div>
          ) : (
            overlappingGroups.map((group) => (
              <div key={group.email} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-50 rounded-lg"><Repeat className="w-4 h-4 text-amber-600" /></div>
                  <h3 className="font-bold text-slate-800 truncate">{group.email}</h3>
                </div>
                <div className="space-y-2">
                  {group.leads.map((lead) => (
                    <div key={lead.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm">
                      <div className="flex items-center gap-2 sm:w-24 shrink-0">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">ID</span>
                        <span className="font-mono font-medium text-slate-700">#{lead.id}</span>
                      </div>
                      <div className="flex-1 flex items-center gap-2 shrink-0">
                        <Tag className="w-4 h-4 text-blue-400" />
                        <span className="font-bold text-blue-700">{lead.source}</span>
                      </div>
                      <div className="flex-1 text-slate-600 font-medium truncate">{lead.phone || 'No phone provided'}</div>
                      <div className="text-right text-xs text-slate-500 font-medium shrink-0">
                        {new Date(lead.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="px-8 py-5 border-t border-slate-100 bg-white text-right">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition">
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};