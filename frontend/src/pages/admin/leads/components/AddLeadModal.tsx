import React, { useState } from "react";
import { X, UserPlus, AlertCircle, Loader2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SOURCE_OPTIONS = [
  "Walk-in",
  "Phone",
  "Referral",
  "Rhenti",
  "Apartments.com",
  "RentSync",
  "Kijiji",
  "Facebook",
  "Other",
];

const AddLeadModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    prospect_name: "",
    email: "",
    phone: "",
    source: "",
    property_name: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setError("");

    if (!form.prospect_name.trim()) {
      setError("Name is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/leads/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("prism_token")}`,
        },
        body: JSON.stringify({
          prospect_name: form.prospect_name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          source: form.source || "Manual",
          property_name: form.property_name.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to create lead");
      }

      // Reset & close
      setForm({ prospect_name: "", email: "", phone: "", source: "", property_name: "" });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const inputClass =
    "w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition text-sm bg-white";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />

      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Add Lead</h2>
              <p className="text-xs text-slate-500">Manually create a new prospect</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.prospect_name}
              onChange={(e) => update("prospect_name", e.target.value)}
              className={inputClass}
              placeholder="John Smith"
            />
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className={inputClass}
                placeholder="john@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                className={inputClass}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Source</label>
            <div className="flex flex-wrap gap-2">
              {SOURCE_OPTIONS.map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => update("source", form.source === src ? "" : src)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    form.source === src
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {src}
                </button>
              ))}
            </div>
          </div>

          {/* Property */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Property <span className="text-xs font-normal text-slate-400">(Optional)</span>
            </label>
            <input
              type="text"
              value={form.property_name}
              onChange={(e) => update("property_name", e.target.value)}
              className={inputClass}
              placeholder="e.g. 123 Main St"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Add Lead
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddLeadModal;