import React, { useState } from "react";
import {
  X,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Brain,
  FileText,
  Briefcase,
  Home,
  Users,
  Search,
  Loader2,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

interface AIReviewData {
  risk_level: string;
  confidence: number;
  summary: string;
  rent_affordability?: {
    assessment: string;
    rent_ratio_percent: number;
    net_disposable_monthly: number;
    risk: string;
  };
  employment_stability?: {
    assessment: string;
    risk: string;
  };
  document_integrity?: {
    assessment: string;
    risk: string;
  };
  rental_history?: {
    assessment: string;
    risk: string;
  };
  references_quality?: {
    assessment: string;
    risk: string;
  };
  consistency_check?: {
    assessment: string;
    risk: string;
  };
  red_flags?: string[];
  positive_indicators?: string[];
  recommendation?: string;
  reviewed_at?: string;
  images_analyzed?: number;
  documents_with_metadata?: number;
}

// ── Risk badge (used in table + modal) ──
export const RiskBadge: React.FC<{
  level: string | null;
  onClick?: () => void;
  loading?: boolean;
}> = ({ level, onClick, loading }) => {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-50 text-slate-400 border border-slate-200">
        <Loader2 className="w-3 h-3 animate-spin" />
        Analyzing...
      </span>
    );
  }

  if (!level) {
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 transition"
      >
        <Brain className="w-3 h-3" />
        Run AI Review
      </button>
    );
  }

  const config: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
    Low: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    Medium: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      icon: <AlertTriangle className="w-3 h-3" />,
    },
    High: {
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
      icon: <XCircle className="w-3 h-3" />,
    },
  };

  const c = config[level] || config.Medium;

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition hover:opacity-80 ${c.bg} ${c.text} ${c.border}`}
    >
      {c.icon}
      {level} Risk
    </button>
  );
};

// ── Category row in modal ──
const CategoryRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  assessment: string;
  risk: string;
}> = ({ icon, label, assessment, risk }) => {
  const riskColors: Record<string, string> = {
    low: "bg-emerald-100 text-emerald-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-red-100 text-red-700",
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-slate-800">{label}</span>
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${riskColors[risk] || riskColors.medium}`}>
            {risk}
          </span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">{assessment}</p>
      </div>
    </div>
  );
};

// ── Full modal ──
interface Props {
  isOpen: boolean;
  onClose: () => void;
  review: AIReviewData | null;
}

const AIReviewModal: React.FC<Props> = ({ isOpen, onClose, review }) => {
  if (!isOpen || !review) return null;

  const riskConfig: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    Low: { bg: "bg-emerald-500", text: "text-white", icon: <CheckCircle2 className="w-6 h-6" /> },
    Medium: { bg: "bg-amber-500", text: "text-white", icon: <AlertTriangle className="w-6 h-6" /> },
    High: { bg: "bg-red-500", text: "text-white", icon: <XCircle className="w-6 h-6" /> },
  };

  const rc = riskConfig[review.risk_level] || riskConfig.Medium;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />

      <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className={`px-6 py-5 flex justify-between items-center ${rc.bg}`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              {rc.icon}
            </div>
            <div className={rc.text}>
              <h2 className="text-lg font-bold">AI Risk Assessment</h2>
              <p className="text-sm opacity-80">
                {review.risk_level} Risk · {Math.round((review.confidence || 0) * 100)}% confidence
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Summary */}
          <div className="bg-slate-50 rounded-xl px-4 py-3">
            <p className="text-sm text-slate-700 leading-relaxed">{review.summary}</p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Assessment Breakdown</h3>
            <div className="bg-white rounded-xl border border-slate-200 px-4">
              {review.rent_affordability && (
                <CategoryRow
                  icon={<FileText className="w-4 h-4" />}
                  label="Rent Affordability"
                  assessment={review.rent_affordability.assessment}
                  risk={review.rent_affordability.risk}
                />
              )}
              {review.employment_stability && (
                <CategoryRow
                  icon={<Briefcase className="w-4 h-4" />}
                  label="Employment Stability"
                  assessment={review.employment_stability.assessment}
                  risk={review.employment_stability.risk}
                />
              )}
              {review.document_integrity && (
                <CategoryRow
                  icon={<Shield className="w-4 h-4" />}
                  label="Document Integrity"
                  assessment={review.document_integrity.assessment}
                  risk={review.document_integrity.risk}
                />
              )}
              {review.rental_history && (
                <CategoryRow
                  icon={<Home className="w-4 h-4" />}
                  label="Rental History"
                  assessment={review.rental_history.assessment}
                  risk={review.rental_history.risk}
                />
              )}
              {review.references_quality && (
                <CategoryRow
                  icon={<Users className="w-4 h-4" />}
                  label="References"
                  assessment={review.references_quality.assessment}
                  risk={review.references_quality.risk}
                />
              )}
              {review.consistency_check && (
                <CategoryRow
                  icon={<Search className="w-4 h-4" />}
                  label="Data Consistency"
                  assessment={review.consistency_check.assessment}
                  risk={review.consistency_check.risk}
                />
              )}
            </div>
          </div>

          {/* Red Flags */}
          {review.red_flags && review.red_flags.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ThumbsDown className="w-3.5 h-3.5" />
                Red Flags ({review.red_flags.length})
              </h3>
              <div className="space-y-1.5">
                {review.red_flags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-2 bg-red-50 rounded-lg px-3 py-2">
                    <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                    <span className="text-xs text-red-800">{flag}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Positive Indicators */}
          {review.positive_indicators && review.positive_indicators.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ThumbsUp className="w-3.5 h-3.5" />
                Positive Indicators ({review.positive_indicators.length})
              </h3>
              <div className="space-y-1.5">
                {review.positive_indicators.map((pos, i) => (
                  <div key={i} className="flex items-start gap-2 bg-emerald-50 rounded-lg px-3 py-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <span className="text-xs text-emerald-800">{pos}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendation */}
          {review.recommendation && (
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Recommendation</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <p className="text-sm text-blue-800 leading-relaxed">{review.recommendation}</p>
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2">
            <span>Reviewed: {review.reviewed_at ? new Date(review.reviewed_at).toLocaleString() : "N/A"}</span>
            <span>{review.images_analyzed || 0} images · {review.documents_with_metadata || 0} docs analyzed</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIReviewModal;