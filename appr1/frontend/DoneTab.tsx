import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Shield, Upload, Loader2, FileText, Plus, Trash2 } from "lucide-react";
import type { SessionData } from "../types";

interface Props {
  session: SessionData;
  token?: string;
  sessionToken?: string;
  onError?: (msg: string) => void;
}

const DoneTab: React.FC<Props> = ({ session, token, sessionToken, onError }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<{ id: number; name: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    if (file.size > 10 * 1024 * 1024) {
      if (onError) onError("File too large. Maximum size is 10MB.");
      return;
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"];
    if (!allowed.includes(file.type)) {
      if (onError) onError("Invalid file type. Please upload an image (JPG, PNG) or PDF.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "additional_doc");

      const headers: Record<string, string> = {};
      if (sessionToken) headers["X-Session-Token"] = sessionToken;

      const res = await fetch(`/apply/${token}/upload`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Upload failed");
      }

      const result = await res.json();
      setUploadedDocs((prev) => [...prev, { id: result.doc_id, name: file.name }]);
    } catch (err: any) {
      if (onError) onError(err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!inputRef.current) return;
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // Create a fake event object to reuse handleUpload
      const fakeEvent = { target: { files } } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleUpload(fakeEvent);
    }
  };

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

      <div className="flex items-center justify-center gap-2 text-xs text-zinc-400 mb-10">
        <Shield className="w-3.5 h-3.5" />
        Your signatures are securely stored with timestamps and IP verification.
      </div>

      {/* --- ADD ADDITIONAL DOCUMENTS SECTION (Append-Only) --- */}
      {token && sessionToken && (
        <div className="max-w-md mx-auto border-t border-zinc-200 pt-8 text-left">
          <h3 className="text-sm font-semibold text-zinc-800 mb-2">Need to add something else?</h3>
          <p className="text-xs text-zinc-500 mb-4">
            If you forgot to upload a pay stub, guarantor letter, or additional ID, you can securely upload it here. 
            The admin team will be notified automatically.
          </p>

          {uploadedDocs.length > 0 && (
            <div className="space-y-2 mb-4">
              {uploadedDocs.map((doc, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl bg-green-50 border border-green-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-800">{doc.name}</p>
                      <p className="text-[10px] text-green-600 uppercase tracking-wider font-bold">Uploaded Successfully</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center px-4 py-6 rounded-xl border-2 border-dashed border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50 cursor-pointer transition-all"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 text-zinc-400 animate-spin mb-2" />
            ) : (
              <Plus className="w-5 h-5 text-zinc-400 mb-2" />
            )}
            <p className="text-sm text-zinc-600 font-medium">
              {uploading ? "Uploading..." : "Add another document"}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleUpload}
              className="hidden"
            />
          </div>
        </div>
      )}

    </motion.div>
  );
};

export default DoneTab;