import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Search,
  X,
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  User,
  Loader2,
} from "lucide-react";

import type { Application } from "./types";
import { statusConfig } from "./types";
import SignerProgress from "./components/SignerProgress";
import SendApplicationModal from "./components/SendApplicationModal";
import RejectModal from "./components/RejectModal";
import ApplicationDetailModal from "./components/ApplicationDetailModal";
import { RiskBadge } from "./components/AIReviewModal";
import AIReviewModal from "./components/AIReviewModal";

type StatusFilter = "All" | "Pending" | "Approved" | "Rejected";

const AdminApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);

  // Modals
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailTargetId, setDetailTargetId] = useState<number | null>(null);
  
  // AI Review States
  const [aiReviewModalOpen, setAiReviewModalOpen] = useState(false);
  const [aiReviewData, setAiReviewData] = useState<any>(null);
  const [aiReviewLoading, setAiReviewLoading] = useState<number | null>(null);

  // ── Fetch ──
  const fetchApplications = async () => {
    try {
      const params = statusFilter !== "All" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/applications/${params}`);
      if (!res.ok) throw new Error("Failed to fetch applications");
      const data = await res.json();
      setApplications(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchApplications();
  }, [statusFilter]);

  // ── Actions ──
  const handleSendApplication = async (data: {
    lead_id: number;
    signers: { name: string; email: string }[];
    building?: string;
    unit_number?: string;
  }) => {
    const res = await fetch("/applications/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to create application");
    }
    await fetchApplications();
  };

  const handleApprove = async (id: number) => {
    if (!window.confirm("Approve this application? This will create a Tenant record.")) return;
    setUpdating(id);
    try {
      const res = await fetch(`/applications/${id}/approve`, { method: "PUT" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to approve");
      }
      await fetchApplications();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleReject = async (id: number, reason: string) => {
    setUpdating(id);
    try {
      const res = await fetch(`/applications/${id}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejection_reason: reason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to reject");
      }
      await fetchApplications();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdating(null);
    }
  };

const handleAiReview = async (app: Application) => {
  if (app.ai_risk_level) {
    // Already has review — fetch full detail
    try {
      const res = await fetch(`/applications/${app.id}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setAiReviewData(data.ai_review);
      setAiReviewModalOpen(true);
    } catch (err: any) {
      alert(err.message);
    }
    return;
  }
  // Trigger new review
  setAiReviewLoading(app.id);
  try {
    const res = await fetch(`/applications/${app.id}/ai-review`, { method: "POST" });
    if (!res.ok) throw new Error("AI review failed");
    const data = await res.json();
    setAiReviewData(data.review);
    setAiReviewModalOpen(true);
    await fetchApplications();
  } catch (err: any) {
    alert(err.message);
  } finally {
    setAiReviewLoading(null);
  }
};

  // ── Filter ──
  const filtered = applications.filter((app) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      app.lead_name?.toLowerCase().includes(q) ||
      app.lead_email?.toLowerCase().includes(q) ||
      app.id.toString().includes(q)
    );
  });

  // ── Counts ──
  const counts = {
    All: applications.length,
    Pending: applications.filter((a) => a.status === "Pending").length,
    Approved: applications.filter((a) => a.status === "Approved").length,
    Rejected: applications.filter((a) => a.status === "Rejected").length,
  };

  // ── Loading / Error states ──
  if (loading && applications.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 font-medium animate-pulse">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading applications...
        </div>
      </div>
    );
  }

  if (error && applications.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-red-500 font-medium">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col font-sans">
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
        <div className="mx-auto">
          {/* ── Header ── */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Applications</h1>
              <p className="text-slate-500 mt-1">Manage rental applications and signing progress.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by name, email, ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition text-sm bg-white w-72 shadow-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                onClick={() => setSendModalOpen(true)}
                className="bg-zinc-900 text-white px-5 py-2.5 rounded-xl border border-zinc-700 shadow-sm text-sm font-bold hover:bg-zinc-800 transition-colors flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send Application
              </button>
            </div>
          </div>

          {/* ── Status Tabs ── */}
          <div className="flex items-center gap-2 mb-6">
            {(["All", "Pending", "Approved", "Rejected"] as StatusFilter[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${
                  statusFilter === tab
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {tab}
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                    statusFilter === tab ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {counts[tab]}
                </span>
              </button>
            ))}
          </div>

          {/* ── Table ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)]">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-4 w-10"></th>
                    <th className="px-6 py-4">Applicant</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Signing Progress</th>
                    <th className="px-6 py-4">Created</th>
                    <th className="px-6 py-4">Risk</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-slate-400 italic">
                        <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        {searchTerm
                          ? `No applications match "${searchTerm}".`
                          : statusFilter !== "All"
                          ? `No ${statusFilter.toLowerCase()} applications.`
                          : "No applications yet. Click 'Send Application' to create one."}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((app) => {
                      const isExpanded = expandedId === app.id;
                      const config = statusConfig[app.status] || statusConfig.Pending;
                      const progressPct =
                        app.total_signers > 0
                          ? Math.round((app.completed_signers / app.total_signers) * 100)
                          : 0;

                      return (
                        <React.Fragment key={app.id}>
                          <tr
                            className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                              isExpanded ? "bg-slate-50/50" : ""
                            }`}
                            onClick={() => setExpandedId(isExpanded ? null : app.id)}
                          >
                            <td className="px-6 py-4">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-sm border border-blue-100">
                                  {app.lead_name?.charAt(0) || "?"}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 text-sm">{app.lead_name || "Unknown"}</div>
                                  <div className="text-xs text-slate-400">{app.lead_email || "—"}</div>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border ${config.bg} ${config.text} ${config.border}`}
                              >
                                {config.icon}
                                {app.status}
                              </span>
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      progressPct === 100 ? "bg-emerald-500" : "bg-blue-500"
                                    }`}
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                                <span className="text-xs font-semibold text-slate-600">
                                  {app.completed_signers}/{app.total_signers}
                                </span>
                              </div>
                            </td>

                            <td className="px-6 py-4 text-slate-500 text-xs font-semibold">
                              {format(new Date(app.created_at), "MMM d, yyyy")}
                            </td>

                            <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                              <RiskBadge
                                level={app.ai_risk_level}
                                loading={aiReviewLoading === app.id}
                                onClick={() => handleAiReview(app)}
                              />
                            </td>

                            <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                {app.status === "Pending" && (
                                  <>
                                    <button
                                      onClick={() => handleApprove(app.id)}
                                      disabled={updating === app.id}
                                      className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => {
                                        setRejectTargetId(app.id);
                                        setRejectModalOpen(true);
                                      }}
                                      disabled={updating === app.id}
                                      className="flex items-center gap-1.5 text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                      Reject
                                    </button>
                                  </>
                                )}
                                {app.status === "Approved" && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Approved
                                  </span>
                                )}
                                {app.status === "Rejected" && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                                    <XCircle className="w-3.5 h-3.5" />
                                    Rejected
                                  </span>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDetailTargetId(app.id);
                                    setDetailModalOpen(true);
                                  }}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                  title="View details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="px-6 py-5 bg-slate-50/50">
                                <div className="max-w-2xl space-y-4">
                                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                    <User className="w-4 h-4 text-slate-400" />
                                    Signer Progress
                                  </div>
                                  <SignerProgress signers={app.signers} />

                                  {app.rejection_reason && (
                                    <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                                      <div className="text-xs font-bold text-red-700 uppercase tracking-wider mb-1">
                                        Rejection Reason
                                      </div>
                                      <p className="text-sm text-red-800">{app.rejection_reason}</p>
                                    </div>
                                  )}

                                  {app.approved_at && (
                                    <div className="mt-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                                      <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
                                        Approved
                                      </div>
                                      <p className="text-sm text-emerald-800">
                                        {format(new Date(app.approved_at), "MMM d, yyyy 'at' h:mm a")}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* ── Modals ── */}
      <SendApplicationModal
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        onSend={handleSendApplication}
      />
      <RejectModal
        isOpen={rejectModalOpen}
        applicationId={rejectTargetId}
        onClose={() => {
          setRejectModalOpen(false);
          setRejectTargetId(null);
        }}
        onReject={handleReject}
      />
      <ApplicationDetailModal
        applicationId={detailTargetId}
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setDetailTargetId(null);
        }}
        onApprove={handleApprove}
        onReject={(id) => {
          setDetailModalOpen(false);
          setRejectTargetId(id);
          setRejectModalOpen(true);
        }}
      />
      <AIReviewModal
        isOpen={aiReviewModalOpen}
        onClose={() => { setAiReviewModalOpen(false); setAiReviewData(null); }}
        review={aiReviewData}
      />
    </div>
  );
};

export default AdminApplicationsPage;