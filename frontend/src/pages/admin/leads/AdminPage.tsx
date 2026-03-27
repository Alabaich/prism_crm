import React, { useState, useEffect } from "react";
import type { FC } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  X,
  Mail,
  Phone,
  Tag,
  Clock,
  Building,
  MessageSquare,
  Home,
  UserPlus,
} from "lucide-react";
import { format } from "date-fns";
import AddLeadModal from "./components/AddLeadModal";

// --- INTERFACES ---
interface Lead {
  id: number;
  prospect_name: string;
  email: string;
  phone: string;
  status: string;
  source: string;
  property_name?: string;
  move_in_date?: string;
  debug_1?: string;
  debug_2?: string;
  created_at: string;
}

interface SortConfig {
  key: keyof Lead;
  direction: "asc" | "desc";
}

interface SortableHeaderProps {
  label: string;
  sortKey: keyof Lead;
  align?: "left" | "right" | "center";
  sortConfig: SortConfig | null;
  requestSort: (key: keyof Lead) => void;
}

// --- SUB-COMPONENT: LEAD DETAIL MODAL ---
interface LeadDetailModalProps {
  lead: Lead | null;
  onClose: () => void;
}

const LeadDetailModal: FC<LeadDetailModalProps> = ({ lead, onClose }) => {
  if (!lead) return null;

  const getStatusColor = (status: string): string => {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "new": return "bg-blue-100 text-blue-700 border-blue-200";
      case "contacted": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "qualified": return "bg-green-100 text-green-700 border-green-200";
      case "lost": return "bg-red-50 text-red-600 border-red-100";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getCleanMessage = (debugStr: string): string => {
    if (!debugStr) return "No specific message content was provided.";
    const msgMatch = debugStr.match(/Msg:\s*(.*)/);
    if (msgMatch && msgMatch[1]) return msgMatch[1].trim();
    return debugStr;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200" onClick={(e) => e.stopPropagation()}>
        <div className="bg-slate-50 px-8 py-6 border-b border-slate-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-700 text-xl font-black border border-blue-100 shadow-sm">
                {lead.prospect_name?.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">{lead.prospect_name}</h2>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-black border ${getStatusColor(lead.status)}`}>
                  {lead.status}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-2 hover:bg-white rounded-xl">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <Mail className="w-3.5 h-3.5" /> Email
              </div>
              <p className="text-sm font-bold text-slate-800">{lead.email || "—"}</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <Phone className="w-3.5 h-3.5" /> Phone
              </div>
              <p className="text-sm font-bold text-slate-800">{lead.phone || "—"}</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <Tag className="w-3.5 h-3.5" /> Source
              </div>
              <p className="text-sm font-bold text-slate-800">{lead.source || "—"}</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <Clock className="w-3.5 h-3.5" /> Received
              </div>
              <p className="text-sm font-bold text-slate-800">{format(new Date(lead.created_at), "MMM d, yyyy · h:mm a")}</p>
            </div>
          </div>

          {lead.property_name && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <Building className="w-3.5 h-3.5" /> Property
              </div>
              <p className="text-sm font-bold text-slate-800">{lead.property_name}</p>
            </div>
          )}

          {lead.debug_1 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <MessageSquare className="w-3.5 h-3.5" /> Message
              </div>
              <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-700 leading-relaxed font-medium border border-slate-100">
                {getCleanMessage(lead.debug_1)}
              </div>
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-blue-600 text-white font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 transition shadow-xl shadow-blue-100">
            Contact Prospect
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminPage: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const sourceFilter = searchParams.get("source");

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: "created_at", direction: "desc" });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [converting, setConverting] = useState<number | null>(null);
  const [showAddLead, setShowAddLead] = useState(false);

  const ITEMS_PER_PAGE = 20;

  const clearFilter = () => {
    searchParams.delete("source");
    setSearchParams(searchParams);
    setPage(1);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      if (searchTerm !== debouncedSearch) setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchLeads = async () => {
    setLoading(true);
    const skip = (page - 1) * ITEMS_PER_PAGE;
    try {
      const queryParams: any = {
        skip: skip.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        search: debouncedSearch,
        sort_by: sortConfig?.key || "created_at",
        sort_order: sortConfig?.direction || "desc",
      };

      if (sourceFilter) {
        queryParams.source = sourceFilter;
      }

      const params = new URLSearchParams(queryParams);
      const response = await axios.get(`/get_leads/?${params.toString()}`);
      setLeads(response.data);
    } catch (error) {
      console.warn("Backend error, check if FastAPI is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [page, sortConfig, debouncedSearch, sourceFilter]);

  const handleConvertToTenant = async (id: number) => {
    if (!window.confirm("Convert this lead directly to a Tenant? (No tour required)")) return;
    setConverting(id);
    try {
      const res = await fetch(`/leads/${id}/convert`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to convert lead");
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: "Tenant" } : l))
      );
    } catch (err) {
      alert("Failed to convert lead to tenant");
    } finally {
      setConverting(null);
    }
  };

  const requestSort = (key: keyof Lead) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const SortableHeader: FC<SortableHeaderProps> = ({ label, sortKey, align = "left", sortConfig, requestSort }) => {
    const isActive = sortConfig?.key === sortKey;
    return (
      <th
        className="p-4 cursor-pointer group select-none hover:bg-slate-100/50 transition"
        onClick={() => requestSort(sortKey)}
      >
        <div className={`flex items-center gap-1.5 ${align === "right" ? "justify-end" : "justify-start"}`}>
          <span>{label}</span>
          {!isActive ? (
            <ArrowUpDown className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-50" />
          ) : sortConfig.direction === "asc" ? (
            <ArrowUp className="w-4 h-4 text-blue-600" />
          ) : (
            <ArrowDown className="w-4 h-4 text-blue-600" />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="w-full mx-auto p-4 sm:p-8 space-y-8 font-sans text-slate-900 bg-slate-50/30 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between gap-6 items-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard Overview</h1>
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-500 font-medium">Real-time prospect monitoring</p>
            {sourceFilter && (
              <div className="flex items-center gap-2 px-3 py-1 bg-indigo-100 border border-indigo-200 rounded-full animate-in slide-in-from-left-2 duration-300">
                <Tag className="w-3 h-3 text-indigo-600" />
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">{sourceFilter}</span>
                <button onClick={clearFilter} className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors">
                  <X className="w-3 h-3 text-indigo-700" />
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search leads..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition shadow-sm bg-white font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={fetchLeads} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 text-slate-600 transition shadow-sm">
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowAddLead(true)}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition shadow-lg shadow-emerald-100 font-bold text-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Lead</span>
          </button>
          <button className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition shadow-lg shadow-slate-200 font-bold text-sm">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm bg-white">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] uppercase text-slate-400 font-black tracking-widest">
                <SortableHeader label="ID" sortKey="id" sortConfig={sortConfig} requestSort={requestSort} />
                <SortableHeader label="Lead Name" sortKey="prospect_name" sortConfig={sortConfig} requestSort={requestSort} />
                <SortableHeader label="Status" sortKey="status" sortConfig={sortConfig} requestSort={requestSort} />
                <SortableHeader label="Source" sortKey="source" sortConfig={sortConfig} requestSort={requestSort} />
                <SortableHeader label="Received" sortKey="created_at" sortConfig={sortConfig} requestSort={requestSort} />
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse"><td colSpan={6} className="p-8"><div className="h-10 bg-slate-50 rounded-2xl w-full"></div></td></tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-24 text-center text-slate-400 italic">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    No prospects found matching your criteria.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/80 transition duration-150 group">
                    <td className="p-4 text-slate-400 font-mono text-[10px]">#{lead.id}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-700 font-black text-sm border border-blue-100 shadow-sm">
                          {lead.prospect_name?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm leading-tight">{lead.prospect_name}</div>
                          <div className="text-[11px] text-slate-400 font-bold tracking-tight">{lead.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black border uppercase tracking-tight bg-slate-50 text-slate-600 border-slate-100">
                        {lead.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="inline-flex items-center px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 text-[10px] font-black border border-indigo-100 uppercase tracking-tighter">
                        {lead.source}
                      </div>
                    </td>
                    <td className="p-4 text-slate-500 text-xs font-bold uppercase tracking-tighter">
                      {format(new Date(lead.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {lead.status === "Tenant" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            <Home className="w-3.5 h-3.5" />
                            Tenant
                          </span>
                        ) : (
                          <button
                            onClick={() => handleConvertToTenant(lead.id)}
                            disabled={converting === lead.id}
                            className="flex items-center gap-1.5 text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
                          >
                            <Home className="w-3.5 h-3.5" />
                            Convert
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedLead(lead)}
                          className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all shadow-sm hover:shadow-blue-100 bg-white border border-slate-100"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 py-4 px-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          Page <span className="text-slate-900 px-2 py-1 bg-white border border-slate-200 rounded-lg mx-1">{page}</span>
        </span>
        <div className="flex gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="flex items-center px-6 py-3 border border-slate-200 rounded-2xl bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-30 transition-all text-xs font-black uppercase tracking-widest shadow-sm"
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> Prev
          </button>
          <button
            disabled={leads.length < ITEMS_PER_PAGE}
            onClick={() => setPage((p) => p + 1)}
            className="flex items-center px-6 py-3 border border-slate-200 rounded-2xl bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-30 transition-all text-xs font-black uppercase tracking-widest shadow-sm"
          >
            Next <ChevronRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>

      {selectedLead && <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />}

      <AddLeadModal
        isOpen={showAddLead}
        onClose={() => setShowAddLead(false)}
        onSuccess={fetchLeads}
      />
    </div>
  );
};

export default AdminPage;