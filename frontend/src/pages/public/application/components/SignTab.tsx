import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { PenTool, FileText, CheckCircle2, Loader2 } from "lucide-react";
import type { SessionData } from "../types";

interface Props {
  session: SessionData;
  token: string;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  onError: (msg: string) => void;
  onReload: () => Promise<void>;
  onComplete: () => void;
}

const SignTab: React.FC<Props> = ({ session, token, submitting, setSubmitting, onError, onReload, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatures, setSignatures] = useState<Record<string, string>>({});
  const [currentDocType, setCurrentDocType] = useState<string>("");

  const unsignedDocs = session.documents.filter((d) => !d.signed && !signatures[d.document_type]);
  const firstUnsigned = unsignedDocs[0];

  // Auto-select first unsigned doc
  useEffect(() => {
    if (firstUnsigned && currentDocType !== firstUnsigned.document_type) {
      setCurrentDocType(firstUnsigned.document_type);
    }
  }, [firstUnsigned, currentDocType]);

  // ── Canvas setup ──
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  useEffect(() => {
    setTimeout(initCanvas, 100);
  }, [currentDocType, initCanvas]);

  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSign = async (docType: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sigData = canvas.toDataURL("image/png");

    setSubmitting(true);
    try {
      const res = await fetch(`/apply/${token}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_type: docType, signature_data: sigData }),
      });
      if (!res.ok) throw new Error("Failed to submit signature");
      const result = await res.json();

      setSignatures((prev) => ({ ...prev, [docType]: sigData }));

      if (result.all_signed) {
        await onReload();
        onComplete();
      } else {
        clearCanvas();
        await onReload();
      }
    } catch (err: any) {
      onError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      key="sign"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
          <PenTool className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Sign Documents</h2>
          <p className="text-xs text-zinc-500">
            {session.signed_documents}/{session.total_documents} documents signed
          </p>
        </div>
      </div>

      {/* Document list */}
      <div className="space-y-3 mb-6">
        {session.documents.map((doc) => {
          const isSigned = doc.signed || !!signatures[doc.document_type];
          const isCurrent = doc.document_type === currentDocType;
          return (
            <div
              key={doc.id}
              onClick={() => !isSigned && setCurrentDocType(doc.document_type)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all cursor-pointer ${
                isSigned
                  ? "bg-green-50 border-green-200"
                  : isCurrent
                  ? "bg-zinc-50 border-zinc-900 ring-1 ring-zinc-900"
                  : "border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              <div className="flex items-center gap-3">
                {isSigned ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <FileText className="w-5 h-5 text-zinc-400" />
                )}
                <span className={`text-sm font-medium ${isSigned ? "text-green-700" : "text-zinc-700"}`}>
                  {doc.display_name}
                </span>
              </div>
              {isSigned && (
                <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Signed</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Signature pad */}
      {firstUnsigned && (
        <div>
          <p className="text-sm text-zinc-600 mb-3">
            Sign below for: <strong>{session.documents.find((d) => d.document_type === currentDocType)?.display_name}</strong>
          </p>
          <div className="border-2 border-dashed border-zinc-300 rounded-xl overflow-hidden mb-3 bg-white">
            <canvas
              ref={canvasRef}
              className="w-full h-40 touch-none cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={clearCanvas}
              className="px-4 py-2 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-500 hover:bg-zinc-50 transition"
            >
              Clear
            </button>
            <button
              onClick={() => handleSign(currentDocType)}
              disabled={submitting}
              className="flex-1 bg-zinc-900 text-white rounded-xl p-3 font-medium disabled:opacity-40 hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenTool className="w-4 h-4" />}
              Submit Signature
            </button>
          </div>
        </div>
      )}

      {unsignedDocs.length === 0 && (
        <div className="text-center py-6">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-sm text-zinc-600 font-medium">All documents signed!</p>
          <button
            onClick={onComplete}
            className="mt-4 bg-zinc-900 text-white rounded-xl px-6 py-3 font-medium hover:bg-zinc-700 transition-colors"
          >
            View Confirmation
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default SignTab;