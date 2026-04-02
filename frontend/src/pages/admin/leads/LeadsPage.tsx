import React, { useState, useEffect } from "react";
import type { FC } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import {
  Search, Download, ChevronLeft, ChevronRight,
  Eye, RefreshCw, X, Home, UserPlus,
} from "lucide-react";
import { format } from "date-fns";
import AddLeadModal from "./components/AddLeadModal";
import LeadDetailModal from "./components/LeadDetailModal";
import DataTable from "../../../components/shared/DataTable";
import type { Column } from "../../../components/shared/DataTable";

import type { Lead, SortConfig } from "./types";
import { statusColors } from "./types";
// ── Types ─────────────────────────────────────────────────────────────────────


// ── Status badge ──────────────────────────────────────────────────────────────

const StatusBadge: FC<{ status: string }> = ({ status }) => {
  const s = status.toLowerCase();
  const colors =
    s === "new"       ? "bg-blue-50 text-blue-700 border-blue-100" :
    s === "contacted" ? "bg-yellow-50 text-yellow-700 border-yellow-100" :
    s === "applied"   ? "bg-purple-50 text-purple-700 border-purple-100" :
    s === "approved"  ? "bg-green-50 text-green-700 border-green-100" :
    s === "rejected"  ? "bg-red-50 text-red-600 border-red-100" :
    s === "tenant"    ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                        "bg-slate-50 text-slate-600 border-slate-100";
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black border uppercase tracking-tight ${colors}`}>
      {status}
    </span>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const LeadsPage: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const sourceFilter = searchParams.get("source");

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "created_at", direction: "desc" });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [converting, setConverting] = useState<number | null>(null);
  const [showAddLead, setShowAddLead] = useState(false);

  const ITEMS_PER_PAGE = 20;

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
        sort_by: sortConfig.key,
        sort_order: sortConfig.direction,
      };
      if (sourceFilter) queryParams.source = sourceFilter;
      const params = new URLSearchParams(queryParams);
      const response = await axios.get(`/get_leads/?${params.toString()}`);
      setLeads(response.data);
    } catch {
      console.warn("Failed to fetch leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, [page, sortConfig, debouncedSearch, sourceFilter]);

  const handleConvertToTenant = async (id: number) => {
    if (!window.confirm("Convert this lead to a Tenant?")) return;
    setConverting(id);
    try {
      const res = await fetch(`/leads/${id}/convert`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to convert lead");
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status: "Tenant" } : l));
    } catch (err) {
      console.error(err);
    } finally {
      setConverting(null);
    }
  };

  const requestSort = (key: keyof Lead) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  // ── Column definitions ───────────────────────────────────────────────────

  const columns: Column<Lead>[] = [
    {
      key: "id",
      label: "ID",
      width: "w-16",
      render: (val) => (
        <span className="text-slate-400 font-mono text-[10px]">#{val}</span>
      ),
    },
    {
      key: "prospect_name",
      label: "Lead Name",
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-700 font-black text-sm border border-blue-100 shadow-sm shrink-0">
            {row.prospect_name?.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm leading-tight">{row.prospect_name}</div>
            <div className="text-[11px] text-slate-400">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: "source",
      label: "Source",
      render: (val) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 text-[10px] font-black border border-indigo-100 uppercase tracking-tighter">
          {val}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Received",
      render: (val) => (
        <span className="text-slate-500 text-xs font-bold uppercase tracking-tighter">
          {format(new Date(val), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      key: "_actions",
      label: "",
      align: "right",
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          {row.status === "Tenant" ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
              <Home className="w-3.5 h-3.5" /> Tenant
            </span>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); handleConvertToTenant(row.id); }}
              disabled={converting === row.id}
              className="flex items-center gap-1.5 text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            >
              <Home className="w-3.5 h-3.5" /> Convert
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedLead(row); }}
            className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all bg-white border border-slate-100"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Leads</h1>
          <p className="text-sm text-slate-500 mt-0.5">All prospects and inquiries</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition text-sm bg-white w-64"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {sourceFilter && (
            <button onClick={() => { searchParams.delete("source"); setSearchParams(searchParams); setPage(1); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-100 transition">
              {sourceFilter} <X className="w-3 h-3" />
            </button>
          )}
          <button onClick={fetchLeads} className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition bg-white">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowAddLead(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-bold text-sm">
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Lead</span>
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition font-bold text-sm">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={leads}
        loading={loading}
        rowKey={(row) => row.id}
        emptyMessage="No prospects found matching your criteria."
        emptyIcon={<Search className="w-12 h-12" />}
        skeletonRows={8}
      />

      {/* Pagination */}
      <div className="flex justify-between items-center py-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Page <span className="text-slate-900 px-2 py-1 bg-white border border-slate-200 rounded-lg mx-1">{page}</span>
        </span>
        <div className="flex gap-2">
          <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="flex items-center px-5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-30 transition text-xs font-black uppercase tracking-widest">
            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
          </button>
          <button disabled={leads.length < ITEMS_PER_PAGE} onClick={() => setPage((p) => p + 1)}
            className="flex items-center px-5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-30 transition text-xs font-black uppercase tracking-widest">
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>

      {/* Modals */}
      {selectedLead && (
        <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
      <AddLeadModal isOpen={showAddLead} onClose={() => setShowAddLead(false)} onSuccess={fetchLeads} />
    </div>
  );
};

export default LeadsPage;