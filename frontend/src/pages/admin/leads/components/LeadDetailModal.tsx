import React from "react";
import type { FC } from "react";
import { X, Mail, Phone, Tag, Clock, Building, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import type { Lead } from "../types";

interface Props {
  lead: Lead | null;
  onClose: () => void;
}

const getStatusColor = (status: string): string => {
  switch ((status || "").toLowerCase()) {
    case "new":       return "bg-blue-100 text-blue-700 border-blue-200";
    case "contacted": return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "applied":   return "bg-purple-100 text-purple-700 border-purple-200";
    case "approved":  return "bg-green-100 text-green-700 border-green-200";
    case "rejected":  return "bg-red-50 text-red-600 border-red-100";
    case "tenant":    return "bg-emerald-100 text-emerald-700 border-emerald-200";
    default:          return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

const getCleanMessage = (debugStr: string): string => {
  if (!debugStr) return "No message provided.";
  const match = debugStr.match(/Msg:\s*(.*)/);
  if (match && match[1]) return match[1].trim();
  return debugStr;
};

const LeadDetailModal: FC<Props> = ({ lead, onClose }) => {
  if (!lead) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-slate-50 px-8 py-6 border-b border-slate-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-700 text-xl font-black border border-blue-100 shadow-sm">
                {lead.prospect_name?.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">{lead.prospect_name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={"inline-flex px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-black border " + getStatusColor(lead.status)}>
                    {lead.status}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">{"#" + lead.id}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-2 hover:bg-white rounded-xl">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <Mail className="w-3.5 h-3.5" /> Email
              </div>
              <p className="text-sm font-bold text-slate-800 truncate">{lead.email || "\u2014"}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <Phone className="w-3.5 h-3.5" /> Phone
              </div>
              <p className="text-sm font-bold text-slate-800">{lead.phone || "\u2014"}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <Tag className="w-3.5 h-3.5" /> Source
              </div>
              <p className="text-sm font-bold text-slate-800">{lead.source || "\u2014"}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <Clock className="w-3.5 h-3.5" /> Received
              </div>
              <p className="text-sm font-bold text-slate-800">
                {lead.created_at ? format(new Date(lead.created_at), "MMM d, yyyy") : "\u2014"}
              </p>
            </div>
          </div>

          {(lead.property_name || lead.move_in_date) && (
            <div className="bg-slate-900 rounded-2xl p-6 text-white">
              <div className="flex items-center gap-2 mb-4 text-blue-400">
                <Building className="w-4 h-4" />
                <span className="text-[10px] uppercase font-black tracking-widest">Inquiry Details</span>
              </div>
              <div className="grid grid-cols-2 gap-6">
                {lead.property_name && (
                  <div>
                    <p className="text-slate-400 text-[9px] uppercase font-black mb-1 tracking-wider">Property</p>
                    <p className="text-sm font-bold text-white leading-tight">{lead.property_name}</p>
                  </div>
                )}
                {lead.move_in_date && (
                  <div>
                    <p className="text-slate-400 text-[9px] uppercase font-black mb-1 tracking-wider">Move-in</p>
                    <p className="text-sm font-bold text-white">{lead.move_in_date}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {lead.debug_1 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <MessageSquare className="w-3.5 h-3.5" /> Message
              </div>
              <div className="bg-blue-50/40 rounded-xl px-4 py-3 text-sm text-slate-700 leading-relaxed font-medium border border-blue-100/50 italic">
                {"\u201C" + getCleanMessage(lead.debug_1) + "\u201D"}
              </div>
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-white transition">
            Close
          </button>
          <a
            href={"mailto:" + lead.email}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition shadow-lg shadow-blue-100"
          >
            <Mail className="w-4 h-4" />
            Contact Prospect
          </a>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailModal;