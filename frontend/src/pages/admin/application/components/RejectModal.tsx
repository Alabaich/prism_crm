import React, { useState } from "react";
import { XCircle, Loader2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  applicationId: number | null;
  onClose: () => void;
  onReject: (id: number, reason: string) => Promise<void>;
}

const RejectModal: React.FC<Props> = ({ isOpen, applicationId, onClose, onReject }) => {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim() || !applicationId) return;
    setSubmitting(true);
    try {
      await onReject(applicationId, reason.trim());
      setReason("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !applicationId) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Reject Application</h2>
          <p className="text-xs text-slate-500 mt-0.5">This will reject the application and notify the lead.</p>
        </div>
        <div className="p-6">
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Rejection Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Incomplete income documentation..."
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition text-sm resize-none"
          />
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason.trim() || submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Reject
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectModal;