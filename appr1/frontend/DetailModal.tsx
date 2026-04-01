import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  X,
  User,
  Briefcase,
  PawPrint,
  Car,
  MapPin,
  Shield,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  Loader2,
  Link2,
  Check,
  Users,
  Home,
  AlertCircle,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────

interface SignerDetail {
  id: number;
  signer_name: string;
  signer_email: string;
  token: string;
  status: string;
  expires_at: string | null;
  consent_given_at: string | null;
  signatures: Record<string, any> | null;
}

interface ApplicationDetailData {
  id: number;
  created_at: string;
  lead_id: number;
  lead_name: string | null;
  lead_email: string | null;
  lead_phone: string | null;
  employer_name: string | null;
  employment_type: string | null;
  monthly_income: string | null;
  position_held: string | null;
  co_applicants: any[] | null;
  other_occupants: any[] | null;
  id_verified: boolean;
  credit_check_score: number | null;
  credit_check_notes: string | null;
  has_pet: boolean;
  pet_details: string | null;
  parking_requested: boolean;
  landlord_reference_id: number | null;
  parking_spot: string | null;
  previous_addresses: any[] | null;
  vacating_reason: string | null;
  id_document_id: number | null;
  income_proof_id: number | null;
  signed_form_410_id: number | null;
  signed_consent_id: number | null;
  additional_docs: { id: number; file_name: string }[];
  status: string;
  approved_at: string | null;
  rejection_reason: string | null;
  package_id: number | null;
  signing_sessions: SignerDetail[];
}

// ── Helpers ──────────────────────────────────────────────────

const signerStatusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: "bg-slate-50", text: "text-slate-600", dot: "bg-slate-400" },
  in_progress: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  completed: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  declined: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  expired: { bg: "bg-slate-50", text: "text-slate-500", dot: "bg-slate-300" },
};

const InfoRow: React.FC<{ label: string; value: string | null | undefined; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
    <span className="text-xs text-slate-500">{label}</span>
    <span className={`text-sm font-semibold ${highlight ? "text-blue-700" : value ? "text-slate-800" : "text-slate-300"}`}>
      {value || "\u2014"}
    </span>
  </div>
);

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mt-6 mb-3 first:mt-0">
    {icon}
    {title}
  </div>
);

const DownloadButton: React.FC<{ docId: number | null; label: string }> = ({ docId, label }) => {
  if (!docId) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-xl text-slate-400 text-sm">
        <FileText className="w-4 h-4" />
        {label}
        <span className="ml-auto text-[10px] font-bold uppercase tracking-wider">Not yet generated</span>
      </div>
    );
  }
  return (
    <a
      href={`/docs/${docId}/download`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-4 py-3 bg-white rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all group"
    >
      <FileText className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
      <span className="truncate pr-4">{label}</span>
      <Download className="w-4 h-4 ml-auto text-slate-400 group-hover:text-blue-500 shrink-0" />
    </a>
  );
};

// ── Modal ────────────────────────────────────────────────────

interface Props {
  applicationId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (id: number) => Promise<void>;
  onReject: (id: number) => void;
}

const ApplicationDetailModal: React.FC<Props> = ({ applicationId, isOpen, onClose, onApprove, onReject }) => {
  const [detail, setDetail] = useState<ApplicationDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (!isOpen || !applicationId) { setDetail(null); setError(""); return; }
    setLoading(true);
    fetch(`/applications/${applicationId}`)
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then(setDetail)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isOpen, applicationId]);

  const handleCopyLink = async (token: string) => {
    const url = `${window.location.origin}/pub_apply/${token}`;
    try { await navigator.clipboard.writeText(url); } catch {
      const inp = document.createElement("input"); inp.value = url;
      document.body.appendChild(inp); inp.select(); document.execCommand("copy"); document.body.removeChild(inp);
    }
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleApprove = async () => {
    if (!applicationId) return;
    setApproving(true);
    try { await onApprove(applicationId); onClose(); } finally { setApproving(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />

      <div className="relative bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/40">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-200">
              {detail?.lead_name?.charAt(0) || "?"}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{detail?.lead_name || "Loading..."}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-400 font-mono">APP #{applicationId}</span>
                {detail && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] uppercase font-bold border tracking-wider ${
                      detail.status === "Approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : detail.status === "Rejected" ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>{detail.status}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white hover:shadow-md rounded-2xl text-slate-400 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading application...
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          {detail && !loading && (
            <>
              {/* Contact */}
              <SectionHeader icon={<User className="w-3.5 h-3.5" />} title="Contact" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[["Name", detail.lead_name], ["Email", detail.lead_email], ["Phone", detail.lead_phone]].map(([l, v]) => (
                  <div key={l as string} className="bg-slate-50 rounded-xl px-4 py-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{l}</div>
                    <div className="text-sm font-semibold text-slate-800 truncate">{(v as string) || "\u2014"}</div>
                  </div>
                ))}
              </div>

              {/* Employment */}
              <SectionHeader icon={<Briefcase className="w-3.5 h-3.5" />} title="Employment" />
              <div className="bg-slate-50 rounded-xl px-4 py-1">
                <InfoRow label="Employer" value={detail.employer_name} />
                <InfoRow label="Position" value={detail.position_held} />
                <InfoRow label="Type" value={detail.employment_type} />
                <InfoRow label="Monthly Income" value={detail.monthly_income} highlight />
              </div>

              {/* Additional */}
              <SectionHeader icon={<Home className="w-3.5 h-3.5" />} title="Additional" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={`rounded-xl px-4 py-3 ${detail.has_pet ? "bg-amber-50 border border-amber-200" : "bg-slate-50"}`}>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5"><PawPrint className="w-3 h-3" /> Pet</div>
                  <div className={`text-sm font-semibold ${detail.has_pet ? "text-amber-700" : "text-slate-400"}`}>{detail.has_pet ? detail.pet_details || "Yes" : "No"}</div>
                </div>
                <div className={`rounded-xl px-4 py-3 ${detail.parking_requested ? "bg-blue-50 border border-blue-200" : "bg-slate-50"}`}>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5"><Car className="w-3 h-3" /> Parking</div>
                  <div className={`text-sm font-semibold ${detail.parking_requested ? "text-blue-700" : "text-slate-400"}`}>{detail.parking_requested ? detail.parking_spot || "Requested" : "No"}</div>
                </div>
                <div className={`rounded-xl px-4 py-3 ${detail.id_verified ? "bg-green-50 border border-green-200" : "bg-slate-50"}`}>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5"><Shield className="w-3 h-3" /> ID</div>
                  <div className={`text-sm font-semibold ${detail.id_verified ? "text-green-700" : "text-slate-400"}`}>{detail.id_verified ? "Verified" : "Not yet"}</div>
                </div>
              </div>

              {/* Credit */}
              {detail.credit_check_score != null && (
                <>
                  <SectionHeader icon={<Shield className="w-3.5 h-3.5" />} title="Credit Check" />
                  <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center gap-4">
                    <div className="text-3xl font-black text-slate-900">{detail.credit_check_score}</div>
                    {detail.credit_check_notes && <p className="text-xs text-slate-500 flex-1">{detail.credit_check_notes}</p>}
                  </div>
                </>
              )}

              {/* Co-applicants */}
              {detail.co_applicants && detail.co_applicants.length > 0 && (
                <>
                  <SectionHeader icon={<Users className="w-3.5 h-3.5" />} title="Co-Applicants" />
                  {detail.co_applicants.map((co: any, i: number) => (
                    <div key={i} className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{co.name || "\u2014"}</div>
                        <div className="text-xs text-slate-500">{co.occupation} {co.employer ? `at ${co.employer}` : ""}</div>
                      </div>
                      {co.monthly_income && <span className="text-sm font-bold text-slate-700">${co.monthly_income}/mo</span>}
                    </div>
                  ))}
                </>
              )}

              {/* Previous Addresses */}
              {detail.previous_addresses && detail.previous_addresses.length > 0 && (
                <>
                  <SectionHeader icon={<MapPin className="w-3.5 h-3.5" />} title="Previous Addresses" />
                  {detail.previous_addresses.map((addr: any, i: number) => (
                    <div key={i} className="bg-slate-50 rounded-xl px-4 py-3">
                      <div className="text-sm font-semibold text-slate-800">{addr.address || "\u2014"}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {addr.from && addr.to && `${addr.from} \u2014 ${addr.to}`}
                        {addr.landlord_name && ` \u00B7 Landlord: ${addr.landlord_name}`}
                        {addr.landlord_phone && ` (${addr.landlord_phone})`}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Vacating */}
              {detail.vacating_reason && (
                <>
                  <SectionHeader icon={<Home className="w-3.5 h-3.5" />} title="Reason for Vacating" />
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-xl px-4 py-3">{detail.vacating_reason}</p>
                </>
              )}

              {/* Signers */}
              <SectionHeader icon={<FileText className="w-3.5 h-3.5" />} title="Signing Progress" />
              <div className="space-y-2">
                {detail.signing_sessions.map((s, i) => {
                  const cfg = signerStatusConfig[s.status] || signerStatusConfig.pending;
                  const copied = copiedToken === s.token;
                  return (
                    <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-xl ${cfg.bg}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                        <div>
                          <span className="text-sm font-semibold text-slate-800">{s.signer_name}</span>
                          <span className="text-xs text-slate-500 ml-2">{s.signer_email}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {s.consent_given_at && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consented</span>}
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${cfg.text}`}>{s.status.replace("_", " ")}</span>
                        <button onClick={() => handleCopyLink(s.token)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${copied ? "bg-green-100 text-green-700 border border-green-200" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}>
                          {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Link2 className="w-3 h-3" /> Link</>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Documents */}
              <SectionHeader icon={<Download className="w-3.5 h-3.5" />} title="Documents" />
              <div className="space-y-2">
                <DownloadButton docId={detail.signed_form_410_id} label="Form 410 \u2014 Rental Application (Signed)" />
                <DownloadButton docId={detail.signed_consent_id} label="Schedule A \u2014 Privacy Consent (Signed)" />
                <DownloadButton docId={detail.id_document_id} label="ID Document" />
                <DownloadButton docId={detail.income_proof_id} label="Income Proof" />
                <DownloadButton docId={detail.landlord_reference_id} label="Landlord Reference" />
                
                {/* Render additional documents uploaded after completion */}
                {detail.additional_docs && detail.additional_docs.length > 0 && (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Additional Documents (Uploaded Late)</p>
                    <div className="space-y-2">
                      {detail.additional_docs.map(doc => (
                        <DownloadButton key={doc.id} docId={doc.id} label={doc.file_name} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Status info */}
              {detail.rejection_reason && (
                <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                  <div className="text-xs font-bold text-red-700 uppercase tracking-wider mb-1">Rejection Reason</div>
                  <p className="text-sm text-red-800">{detail.rejection_reason}</p>
                </div>
              )}
              {detail.approved_at && (
                <div className="mt-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Approved</div>
                  <p className="text-sm text-emerald-800">{format(new Date(detail.approved_at), "MMM d, yyyy 'at' h:mm a")}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {detail && detail.status === "Pending" && (
          <div className="px-8 py-4 border-t border-slate-100 flex justify-end gap-3">
            <button onClick={() => onReject(applicationId!)} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 text-sm font-bold transition">
              <XCircle className="w-4 h-4" /> Reject
            </button>
            <button onClick={handleApprove} disabled={approving} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-50">
              {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Approve Application
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationDetailModal;