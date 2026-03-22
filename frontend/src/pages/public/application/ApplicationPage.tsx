import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  XCircle,
  MapPin,
  ChevronRight,
} from "lucide-react";
import Header from "../../../components/Header";

import type { SessionData, TabKey, FormData } from "./types";
import { TABS, INITIAL_FORM_DATA } from "./types";
import ConsentTab from "./components/ConsentTab";
import FormTab from "./components/FormTab";
import DocumentsTab from "./components/DocumentsTab";
import SignTab from "./components/SignTab";
import DoneTab from "./components/DoneTab";

const ApplicationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("consent");
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [signerIndex, setSignerIndex] = useState(0);

  // ── Load session ──
  const loadSession = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/apply/${token}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Invalid or expired link");
      }
      const data: SessionData = await res.json();
      setSession(data);

      setSignerIndex(data.signer_index ?? 0);

      // Determine starting tab
      if (data.status === "completed" || data.all_signed) {
        setActiveTab("done");
      } else if (!data.consent_given) {
        setActiveTab("consent");
      } else if (data.signed_documents === 0) {
        setActiveTab("form");
      } else {
        setActiveTab("sign");
      }

      // Prefill form from lead/application data
      if (data.prefill) {
        setFormData((prev) => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(data.prefill!).filter(([_, v]) => v != null)
          ),
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          prospect_name: data.signer_name || "",
          email: data.signer_email || "",
        }));
      }

      // Prefill property details from package (editable by applicant 1)
      setFormData((prev) => ({
        ...prev,
        building: data.building || prev.building || "",
        unit_number: data.unit_number || prev.unit_number || "",
        lease_start: data.lease_start || prev.lease_start || "",
        monthly_rent: data.monthly_rent || prev.monthly_rent || "",
      }));

    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // ── Tab navigation ──
  const canAccessTab = (tab: TabKey): boolean => {
    if (!session) return false;
    if (tab === "consent") return true;
    if (tab === "form") return session.consent_given;
    if (tab === "documents") return session.consent_given;
    if (tab === "sign") return session.consent_given;
    if (tab === "done") return session.all_signed || session.status === "completed";
    return false;
  };

  // ── Consent handler ──
  const handleConsent = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/apply/${token}/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Failed to record consent");
      await loadSession();
      setActiveTab("form");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Decline handler ──
  const handleDecline = async () => {
    const reason = window.prompt("Please provide a reason for declining:");
    if (!reason) return;
    try {
      await fetch(`/apply/${token}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      await loadSession();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ── Form save handler ──
  const handleFormSave = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/apply/${token}/form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to save form data");
      setActiveTab("documents");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex flex-col">
        <Header currentView="booking" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-zinc-500 animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading your application...
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error && !session) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex flex-col">
        <Header currentView="booking" />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 mb-2">Unable to Load</h2>
            <p className="text-zinc-500 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  // ── Declined state ──
  if (session.status === "declined") {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex flex-col">
        <Header currentView="booking" />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-zinc-100 text-zinc-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 mb-2">Application Declined</h2>
            <p className="text-zinc-500 text-sm">You have declined this application. If this was a mistake, please contact the property management team.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col">
      <Header currentView="booking" />

      <main className="flex-1 w-full px-4 py-8 sm:py-12">
        <div className="max-w-2xl mx-auto">
          {/* ── Header ── */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 mb-1">
              Rental Application
            </h1>
            <p className="text-zinc-500 text-sm">
              {session.building && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {session.building}
                  {session.unit_number && ` — Unit ${session.unit_number}`}
                  <span className="mx-1.5">·</span>
                </span>
              )}
              Welcome, {session.signer_name}
            </p>
          </div>

          {/* ── Card ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
            {/* ── Tab bar ── */}
            <div className="bg-zinc-50 border-b border-zinc-200 px-4 sm:px-6 py-3">
              <div className="flex items-center justify-between">
                {TABS.map((tab, i) => {
                  const Icon = tab.icon;
                  const accessible = canAccessTab(tab.key);
                  const isActive = activeTab === tab.key;
                  const isCompleted =
                    (tab.key === "consent" && session.consent_given) ||
                    (tab.key === "done" && (session.all_signed || session.status === "completed"));

                  return (
                    <React.Fragment key={tab.key}>
                      <button
                        onClick={() => accessible && setActiveTab(tab.key)}
                        disabled={!accessible}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                          isActive
                            ? "bg-zinc-900 text-white shadow-sm"
                            : isCompleted
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : accessible
                            ? "text-zinc-600 hover:bg-zinc-100"
                            : "text-zinc-300 cursor-not-allowed"
                        }`}
                      >
                        {isCompleted && !isActive ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">{tab.label}</span>
                      </button>
                      {i < TABS.length - 1 && (
                        <ChevronRight className="w-4 h-4 text-zinc-300 hidden sm:block" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* ── Content ── */}
            <div className="p-6 sm:p-8">
              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                  <button onClick={() => setError("")} className="ml-auto text-red-500 hover:text-red-700">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              )}

              <AnimatePresence mode="wait">
                {activeTab === "consent" && (
                  <ConsentTab
                    session={session}
                    submitting={submitting}
                    onConsent={handleConsent}
                    onDecline={handleDecline}
                  />
                )}

                {activeTab === "form" && (
                  <FormTab
                    formData={formData}
                    submitting={submitting}
                    signerIndex={signerIndex}
                    onChange={(field, value) => setFormData((prev) => ({ ...prev, [field]: value }))}
                    onSave={handleFormSave}
                    onError={setError}
                  />
                )}

                {activeTab === "documents" && token && (
                  <DocumentsTab
                    session={session}
                    token={token}
                    onContinue={() => setActiveTab("sign")}
                    onError={setError}
                  />
                )}

                {activeTab === "sign" && token && (
                  <SignTab
                    session={session}
                    token={token}
                    submitting={submitting}
                    setSubmitting={setSubmitting}
                    onError={setError}
                    onReload={loadSession}
                    onComplete={() => setActiveTab("done")}
                  />
                )}

                {activeTab === "done" && (
                  <DoneTab session={session} />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ApplicationPage;