import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  FileText,
  CheckCircle2,
  Loader2,
  Trash2,
  Image,
  Home,
  X,
  AlertCircle,
  Plus,
} from "lucide-react";
import type { SessionData } from "../types";
import { inputClass, labelClass } from "../types";

// ── Types ────────────────────────────────────────────────────────────────────

interface UploadedFile {
  id?: number;
  name: string;
  category: string;
  uploading?: boolean;
}

interface Props {
  session: SessionData;
  token: string;
  sessionToken?: string;
  onContinue: () => void;
  onError: (msg: string) => void;
}

// ── File drop zone ───────────────────────────────────────────────────────────

interface DropZoneProps {
  label: string;
  hint: string;
  required?: boolean;
  category: string;
  file: UploadedFile | null;
  uploading: boolean;
  onUpload: (file: File, category: string) => void;
  onRemove: (category: string) => void;
}

const DropZone: React.FC<DropZoneProps> = ({
  label,
  hint,
  required,
  category,
  file,
  uploading,
  onUpload,
  onRemove,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onUpload(dropped, category);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) onUpload(selected, category);
    if (inputRef.current) inputRef.current.value = "";
  };

  if (file && !uploading) {
    return (
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-green-50 border border-green-200">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-800">{file.name}</p>
            <p className="text-[10px] text-green-600 uppercase tracking-wider font-bold">{label}</p>
          </div>
        </div>
        <button
          onClick={() => onRemove(category)}
          className="p-1.5 text-green-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <label className={labelClass}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center px-4 py-6 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
          dragOver
            ? "border-zinc-900 bg-zinc-50"
            : "border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50"
        }`}
      >
        {uploading ? (
          <Loader2 className="w-6 h-6 text-zinc-400 animate-spin mb-2" />
        ) : (
          <Upload className="w-6 h-6 text-zinc-400 mb-2" />
        )}
        <p className="text-sm text-zinc-600 font-medium">
          {uploading ? "Uploading..." : "Click to upload or drag & drop"}
        </p>
        <p className="text-xs text-zinc-400 mt-1">{hint}</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleChange}
          className="hidden"
        />
      </div>
    </div>
  );
};

// ── Additional Doc Upload Button ─────────────────────────────────────────────

interface AddDocButtonProps {
  uploading: boolean;
  onUpload: (file: File) => void;
}

const AddDocButton: React.FC<AddDocButtonProps> = ({ uploading, onUpload }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onUpload(dropped);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) onUpload(selected);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex flex-col items-center justify-center px-4 py-5 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
        dragOver
          ? "border-zinc-900 bg-zinc-50"
          : "border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50"
      }`}
    >
      {uploading ? (
        <Loader2 className="w-5 h-5 text-zinc-400 animate-spin mb-1.5" />
      ) : (
        <Plus className="w-5 h-5 text-zinc-400 mb-1.5" />
      )}
      <p className="text-sm text-zinc-600 font-medium">
        {uploading ? "Uploading..." : "Add another document"}
      </p>
      <p className="text-xs text-zinc-400 mt-0.5">
        Student visa, work permit, co-signer letter, bank statement, etc.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────

type PreviousPosition = "rent" | "own" | "parents" | "";

const DocumentsTab: React.FC<Props> = ({ session, token, sessionToken, onContinue, onError }) => {
  const [files, setFiles] = useState<Record<string, UploadedFile | null>>({
    id_upload: null,
    income_proof: null,
    landlord_reference: null,
  });
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [previousPosition, setPreviousPosition] = useState<PreviousPosition>("");
  const [noReferenceReason, setNoReferenceReason] = useState("");

  const [additionalDocs, setAdditionalDocs] = useState<UploadedFile[]>([]);
  const [additionalUploading, setAdditionalUploading] = useState(false);

  const getUploadHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (sessionToken) headers["X-Session-Token"] = sessionToken;
    return headers;
  };

  const handleUpload = async (file: File, category: string) => {
    if (file.size > 10 * 1024 * 1024) {
      onError("File too large. Maximum size is 10MB.");
      return;
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"];
    if (!allowed.includes(file.type)) {
      onError("Invalid file type. Please upload an image (JPG, PNG) or PDF.");
      return;
    }

    setUploading((prev) => ({ ...prev, [category]: true }));

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);

      const res = await fetch(`/apply/${token}/upload`, {
        method: "POST",
        headers: getUploadHeaders(),
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Upload failed");
      }

      const result = await res.json();

      setFiles((prev) => ({
        ...prev,
        [category]: { id: result.doc_id, name: file.name, category },
      }));
    } catch (err: any) {
      onError(err.message);
    } finally {
      setUploading((prev) => ({ ...prev, [category]: false }));
    }
  };

  const handleRemove = (category: string) => {
    setFiles((prev) => ({ ...prev, [category]: null }));
  };

  const handleAdditionalUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      onError("File too large. Maximum size is 10MB.");
      return;
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"];
    if (!allowed.includes(file.type)) {
      onError("Invalid file type. Please upload an image (JPG, PNG) or PDF.");
      return;
    }

    setAdditionalUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "additional_doc");

      const res = await fetch(`/apply/${token}/upload`, {
        method: "POST",
        headers: getUploadHeaders(),
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Upload failed");
      }

      const result = await res.json();

      setAdditionalDocs((prev) => [
        ...prev,
        { id: result.doc_id, name: file.name, category: "additional_doc" },
      ]);
    } catch (err: any) {
      onError(err.message);
    } finally {
      setAdditionalUploading(false);
    }
  };

  const removeAdditionalDoc = (docId: number) => {
    setAdditionalDocs((prev) => prev.filter((d) => d.id !== docId));
  };

  const canProceed = (): boolean => {
    if (!files.id_upload || !files.income_proof) return false;
    if (!previousPosition) return false;
    if (previousPosition === "rent" && !files.landlord_reference && !noReferenceReason.trim()) return false;
    return true;
  };

  const handleContinue = () => {
    if (!files.id_upload) { onError("Photo ID is required"); return; }
    if (!files.income_proof) { onError("Proof of income is required"); return; }
    if (!previousPosition) { onError("Please select your previous living situation"); return; }
    if (previousPosition === "rent" && !files.landlord_reference && !noReferenceReason.trim()) {
      onError("Please upload a landlord reference or explain why you can't provide one");
      return;
    }
    onContinue();
  };

  return (
    <motion.div key="documents" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
          <Upload className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Documents & History</h2>
          <p className="text-xs text-zinc-500">Upload required documents and provide rental history</p>
        </div>
      </div>

      <div className="space-y-8">
        <div>
          <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2 mb-4">
            <Image className="w-4 h-4 text-zinc-400" />
            Required Documents
          </h3>
          <div className="space-y-4">
            <DropZone label="Photo ID" hint="Government-issued photo ID (passport, driver's license)" required category="id_upload" file={files.id_upload} uploading={uploading.id_upload || false} onUpload={handleUpload} onRemove={handleRemove} />
            <DropZone label="Proof of Income" hint="Pay stub, employment letter, or bank statement" required category="income_proof" file={files.income_proof} uploading={uploading.income_proof || false} onUpload={handleUpload} onRemove={handleRemove} />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2 mb-4">
            <Home className="w-4 h-4 text-zinc-400" />
            Previous Living Situation <span className="text-red-500">*</span>
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {([
              { value: "rent", label: "Rented" },
              { value: "own", label: "Owned" },
              { value: "parents", label: "Lived with Parents" },
            ] as const).map((option) => (
              <button key={option.value} type="button" onClick={() => setPreviousPosition(option.value)}
                className={`p-4 rounded-xl border-2 text-center text-sm font-medium transition-all ${previousPosition === option.value ? "border-zinc-900 bg-zinc-50 text-zinc-900" : "border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50"}`}>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {previousPosition === "rent" && (
          <div>
            <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-zinc-400" />
              Landlord Reference
            </h3>
            <DropZone label="Landlord Reference Letter" hint="A reference letter from your previous landlord (PDF or image)" category="landlord_reference" file={files.landlord_reference} uploading={uploading.landlord_reference || false} onUpload={handleUpload} onRemove={handleRemove} />
            {!files.landlord_reference && (
              <div className="mt-3">
                <label className={labelClass}>If unavailable, please explain why</label>
                <textarea value={noReferenceReason} onChange={(e) => setNoReferenceReason(e.target.value)} className={`${inputClass} resize-none`} rows={2} placeholder="e.g. First time renting, landlord unreachable..." />
              </div>
            )}
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-zinc-400" />
            Additional Documents
            <span className="text-xs font-normal text-zinc-400 ml-1">(Optional)</span>
          </h3>
          <p className="text-xs text-zinc-500 mb-4">
            Upload any supporting documents such as student visa, work permit, co-signer authorization, bank statements, credit report, or any other relevant paperwork.
          </p>
          {additionalDocs.length > 0 && (
            <div className="space-y-2 mb-4">
              {additionalDocs.map((doc, i) => (
                <div key={doc.id || i} className="flex items-center justify-between px-4 py-3 rounded-xl bg-green-50 border border-green-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-800">{doc.name}</p>
                      <p className="text-[10px] text-green-600 uppercase tracking-wider font-bold">Additional Document</p>
                    </div>
                  </div>
                  {doc.id && (
                    <button onClick={() => removeAdditionalDoc(doc.id!)} className="p-1.5 text-green-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <AddDocButton uploading={additionalUploading} onUpload={handleAdditionalUpload} />
        </div>
      </div>

      <button onClick={handleContinue} disabled={!canProceed()} className="w-full mt-8 bg-zinc-900 text-white rounded-xl p-3 font-medium disabled:opacity-40 hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2">
        Continue to Signing
      </button>
    </motion.div>
  );
};

export default DocumentsTab;