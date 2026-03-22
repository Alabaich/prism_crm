import React from "react";
import { Clock, CheckCircle2, XCircle } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SignerSession {
  signer_name: string;
  signer_email: string;
  status: string;
  token: string;
  consent_given_at: string | null;
  submitted_at: string | null;
}

export interface Application {
  id: number;
  created_at: string;
  lead_id: number;
  lead_name: string | null;
  lead_email: string | null;
  status: string;
  approved_at: string | null;
  rejection_reason: string | null;
  signers: SignerSession[];
  total_signers: number;
  completed_signers: number;
  pending_signers: number;
  ai_risk_level: string | null;
  ai_review: any | null;
}

export interface LeadSearchResult {
  id: number;
  prospect_name: string;
  email: string;
  phone: string;
  status: string;
}

// ── Status configs ───────────────────────────────────────────────────────────

export const statusConfig: Record<
  string,
  { bg: string; text: string; border: string; icon: React.ReactNode }
> = {
  Pending: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  Approved: {
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  Rejected: {
    bg: "bg-red-50",
    text: "text-red-800",
    border: "border-red-200",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

export const signerStatusConfig: Record<
  string,
  { bg: string; text: string; dot: string }
> = {
  pending: { bg: "bg-slate-50", text: "text-slate-600", dot: "bg-slate-400" },
  in_progress: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  completed: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  declined: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  expired: { bg: "bg-slate-50", text: "text-slate-500", dot: "bg-slate-300" },
};