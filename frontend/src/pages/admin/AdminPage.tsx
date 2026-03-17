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
} from "lucide-react";
import { format } from "date-fns";

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
    if (debugStr.includes("Msg:")) {
      return debugStr.split("Msg:")[1].trim();
    }
    return debugStr;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />

      <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in fade-in duration-300 flex flex-col max-h-[90vh]">
        <div className="px-8 py-7 border-b border-slate-100 flex justify-between items-center bg-slate-50/40">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-3xl font-black shadow-2xl shadow-blue-200">
              {lead.prospect_name?.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{lead.prospect_name}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-black tracking-widest">ID #{lead.id}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className={`px-2.5 py-0.5 rounded-lg text-[9px] uppercase font-black border tracking-widest ${getStatusColor(lead.status)}`}>
                  {lead.status}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white hover:shadow-md rounded-2xl text-slate-400 transition-all hover:rotate-90">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <section>
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-[0.15em] mb-2.5 block">Email Address</label>
                <div className="flex items-center gap-3 text-slate-800">
                  <div className="p-2.5 bg-blue-50 rounded-xl"><Mail className="w-4 h-4 text-blue-600" /></div>
                  <span className="text-sm font-bold truncate">{lead.email}</span>
                </div>
              </section>
              <section>
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-[0.15em] mb-2.5 block">Phone Number</label>
                <div className="flex items-center gap-3 text-slate-800">
                  <div className="p-2.5 bg-blue-50 rounded-xl"><Phone className="w-4 h-4 text-blue-600" /></div>
                  <span className="text-sm font-bold">{lead.phone || "N/A"}</span>
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section>
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-[0.15em] mb-2.5 block">Channel Source</label>
                <div className="flex items-center gap-3 text-slate-800">
                  <div className="p-2.5 bg-slate-100 rounded-xl"><Tag className="w-4 h-4 text-slate-500" /></div>
                  <span className="text-sm font-bold tracking-tight">{lead.source}</span>
                </div>
              </section>
              <section>
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-[0.15em] mb-2.5 block">Received At</label>
                <div className="flex items-center gap-3 text-slate-800">
                  <div className="p-2.5 bg-slate-100 rounded-xl"><Clock className="w-4 h-4 text-slate-500" /></div>
                  <span className="text-sm font-bold truncate">
                    {format(new Date(lead.created_at), "MMM d, yyyy h:mm a")}
                  </span>
                </div>
              </section>
            </div>
          </div>

          <div className="bg-slate-900 rounded-[2rem] p-7 text-white shadow-2xl shadow-slate-200">
            <div className="flex items-center gap-2 mb-5 text-blue-400">
              <Building className="w-4 h-4" />
              <span className="text-[10px] uppercase font-black tracking-widest">Building Inquiry Context</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div>
                <p className="text-slate-400 text-[9px] uppercase font-black mb-1.5 tracking-wider">Property Address</p>
                <p className="text-sm font-black text-white leading-tight">{lead.property_name || "General Inquiry"}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[9px] uppercase font-black mb-1.5 tracking-wider">Desired Move-in</p>
                <p className="text-sm font-black text-white">{lead.move_in_date || "Undisclosed"}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-black text-[10px] uppercase tracking-[0.2em]">
              <MessageSquare className="w-4 h-4 text-blue-600" /> Prospect Message
            </div>
            <div className="relative p-7 bg-blue-50/30 rounded-3xl border border-blue-100/50">
              <p className="text-slate-800 text-sm leading-relaxed font-bold italic opacity-90">
                "{getCleanMessage(lead.debug_1 || "")}"
              </p>
            </div>
          </div>
        </div>

        <div className="p-7 px-9 border-t border-slate-100 bg-white flex justify-between items-center">
          <button onClick={onClose} className="px-7 py-3.5 rounded-2xl border border-slate-200 text-slate-500 font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition">
            Close
          </button>
          <button className="px-9 py-3.5 rounded-2xl bg-blue-600 text-white font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 transition shadow-xl shadow-blue-100">
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
  // CHANGE 2: converting state
  const [converting, setConverting] = useState<number | null>(null);

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

  // CHANGE 3: Convert to tenant handler
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
    } catch (err: any) {
      alert(err.message);
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

  const SortableHeader: React.FC<SortableHeaderProps> = ({ label, sortKey, align = "left" }) => {
    const isActive = sortConfig?.key === sortKey;
    return (
      <th className={`p-4 cursor-pointer hover:bg-slate-100 transition-colors group text-${align}`} onClick={() => requestSort(sortKey)}>
        <div className={`flex items-center gap-2 ${align === "right" ? "justify-end" : "justify-start"}`}>
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
                    {/* CHANGE 4: Actions cell with Convert button */}
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
    </div>
  );
};

export default AdminPage;