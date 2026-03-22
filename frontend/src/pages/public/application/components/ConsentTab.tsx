import React from "react";
import { motion } from "framer-motion";
import { Shield, FileText, CheckCircle2, Loader2 } from "lucide-react";
import type { SessionData } from "../types";

interface Props {
  session: SessionData;
  submitting: boolean;
  onConsent: () => void;
  onDecline: () => void;
}

const ConsentTab: React.FC<Props> = ({ session, submitting, onConsent, onDecline }) => {
  return (
    <motion.div
      key="consent"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Electronic Consent</h2>
          <p className="text-xs text-zinc-500">Required by Ontario Electronic Commerce Act</p>
        </div>
      </div>

      <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-5 mb-6 text-sm text-zinc-600 space-y-3">
        <p>
          By proceeding, you consent to complete this rental application electronically.
          Your electronic signature will carry the same legal weight as a handwritten signature.
        </p>
        <p>You will be asked to:</p>
        <ul className="space-y-2 ml-1">
          {session.documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-400" />
              {doc.display_name}
            </li>
          ))}
        </ul>
        <p className="text-xs text-zinc-400">
          Your IP address and timestamp will be recorded for verification.
        </p>
      </div>

      {session.consent_given && (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm font-medium mb-4">
          <CheckCircle2 className="w-4 h-4" />
          Consent already recorded. You can proceed.
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={onConsent}
          disabled={submitting || session.consent_given}
          className="flex-1 bg-zinc-900 text-white rounded-xl p-3 font-medium disabled:opacity-40 hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : session.consent_given ? (
            <>
              <CheckCircle2 className="w-4 h-4" /> Consented — Continue
            </>
          ) : (
            "I Agree — Continue"
          )}
        </button>
        {!session.consent_given && (
          <button
            onClick={onDecline}
            className="px-4 py-3 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-500 hover:bg-zinc-50 transition"
          >
            Decline
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default ConsentTab;