import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Shield } from "lucide-react";
import type { SessionData } from "../types";

interface Props {
  session: SessionData;
}

const DoneTab: React.FC<Props> = ({ session }) => {
  return (
    <motion.div
      key="done"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-8"
    >
      <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-zinc-900 mb-2">Application Complete!</h2>
      <p className="text-zinc-600 mb-8 max-w-md mx-auto">
        Thank you, {session.signer_name}. Your rental application
        {session.building ? ` for ${session.building}` : ""} has been submitted successfully.
        All documents have been signed.
      </p>
      <div className="bg-zinc-50 p-6 rounded-xl border border-zinc-200 mb-6 text-left max-w-sm mx-auto space-y-3">
        <p className="text-sm text-zinc-600">
          The property management team will review your application and get back to you shortly.
        </p>
        <p className="text-sm text-zinc-500">
          A confirmation has been sent to <strong>{session.signer_email}</strong>.
        </p>
      </div>
      <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
        <Shield className="w-3.5 h-3.5" />
        Your signatures are securely stored with timestamps and IP verification.
      </div>
    </motion.div>
  );
};

export default DoneTab;