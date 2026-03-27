import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Mail, Loader2, AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  token: string;
  signerName: string;
  maskedEmail: string;
  building: string | null;
  unitNumber: string | null;
  onVerified: (sessionToken: string) => void;
  onError: (msg: string) => void;
}

const OtpGate: React.FC<Props> = ({
  token,
  signerName,
  maskedEmail,
  building,
  unitNumber,
  onVerified,
  onError,
}) => {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Auto-focus first input when code is sent
  useEffect(() => {
    if (codeSent) {
      inputRefs.current[0]?.focus();
    }
  }, [codeSent]);

  const requestCode = async () => {
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/apply/${token}/otp/request`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to send code");
      }
      setCodeSent(true);
      setCooldown(60);
      setCode(["", "", "", "", "", ""]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleInput = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (digit && index === 5 && newCode.every((d) => d)) {
      verifyCode(newCode.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newCode = [...code];
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i];
    }
    setCode(newCode);
    if (pasted.length === 6) {
      verifyCode(pasted);
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  };

  const verifyCode = async (fullCode: string) => {
    setVerifying(true);
    setError("");
    try {
      const res = await fetch(`/apply/${token}/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: fullCode }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Verification failed");
      }

      const result = await res.json();
      onVerified(result.session_token);
    } catch (err: any) {
      setError(err.message);
      // Clear the code on error so user can retry
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-4"
    >
      <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <Shield className="w-8 h-8" />
      </div>

      <h2 className="text-xl font-bold text-zinc-900 mb-2">Verify Your Identity</h2>
      <p className="text-sm text-zinc-500 mb-1">
        Welcome back, {signerName}
        {building && (
          <span className="text-zinc-400">
            {" "}— {building}
            {unitNumber && ` Unit ${unitNumber}`}
          </span>
        )}
      </p>
      <p className="text-sm text-zinc-500 mb-8">
        For your security, please verify your email to continue.
      </p>

      {error && (
        <div className="mb-6 mx-auto max-w-sm p-3 bg-red-50 text-red-700 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {!codeSent ? (
        /* ── Step 1: Request code ── */
        <div className="max-w-sm mx-auto">
          <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-5 mb-6">
            <div className="flex items-center gap-3 justify-center">
              <Mail className="w-5 h-5 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-700">{maskedEmail}</span>
            </div>
            <p className="text-xs text-zinc-400 mt-2">
              A 6-digit code will be sent to this email address.
            </p>
          </div>
          <button
            onClick={requestCode}
            disabled={sending}
            className="w-full bg-zinc-900 text-white rounded-xl p-3 font-medium hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                Send Verification Code
              </>
            )}
          </button>
        </div>
      ) : (
        /* ── Step 2: Enter code ── */
        <div className="max-w-sm mx-auto">
          <p className="text-sm text-zinc-600 mb-5">
            Enter the 6-digit code sent to <strong>{maskedEmail}</strong>
          </p>

          {/* Code input boxes */}
          <div className="flex justify-center gap-2.5 mb-6" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInput(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={verifying}
                className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all ${
                  digit
                    ? "border-zinc-900 bg-zinc-50 text-zinc-900"
                    : "border-zinc-200 bg-white text-zinc-900 focus:border-zinc-900 focus:bg-zinc-50"
                } disabled:opacity-50`}
              />
            ))}
          </div>

          {verifying && (
            <div className="flex items-center justify-center gap-2 text-sm text-zinc-500 mb-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying...
            </div>
          )}

          {/* Resend */}
          <div className="text-sm text-zinc-400">
            Didn't receive the code?{" "}
            {cooldown > 0 ? (
              <span className="text-zinc-400">Resend in {cooldown}s</span>
            ) : (
              <button
                onClick={requestCode}
                disabled={sending}
                className="text-zinc-700 font-medium hover:underline inline-flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Resend
              </button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default OtpGate;