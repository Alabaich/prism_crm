import React, { useState } from "react";
import { Link2, Check } from "lucide-react";
import { signerStatusConfig } from "../types";
import type { SignerSession } from "../types";

interface Props {
  signers: SignerSession[];
}

const SignerProgress: React.FC<Props> = ({ signers }) => {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const handleCopyLink = async (token: string) => {
    const url = `${window.location.origin}/pub_apply/${token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="space-y-2">
      {signers.map((signer, i) => {
        const config = signerStatusConfig[signer.status] || signerStatusConfig.pending;
        const isCopied = copiedToken === signer.token;

        return (
          <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-xl ${config.bg}`}>
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${config.dot}`} />
              <div>
                <span className="text-sm font-semibold text-slate-800">{signer.signer_name}</span>
                <span className="text-xs text-slate-500 ml-2">{signer.signer_email}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {signer.consent_given_at && (
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consented</span>
              )}
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${config.text} ${config.bg}`}>
                {signer.status.replace("_", " ")}
              </span>
              {signer.token && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyLink(signer.token);
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    isCopied
                      ? "bg-green-100 text-green-700 border border-green-200"
                      : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700"
                  }`}
                  title="Copy application link"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Link2 className="w-3 h-3" />
                      Copy Link
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SignerProgress;