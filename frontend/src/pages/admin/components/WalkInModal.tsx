import React, { useState } from "react";
import { X, User, Mail, Phone, MapPin, Calendar, Clock } from "lucide-react";
import { format, subDays } from "date-fns";

const BUILDINGS = ["80 Bond St E", "100 Bond St E"];

const TIME_SLOTS = [
  "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00",
];

// Generate past 90 days + today + next 7 days
const generateDates = () => {
  const dates = [];
  const today = new Date();
  for (let i = 90; i >= 0; i--) {
    const d = subDays(today, i);
    dates.push(format(d, "yyyy-MM-dd"));
  }
  // also add next 7 days
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);
    dates.push(format(d, "yyyy-MM-dd"));
  }
  return dates;
};

const DATE_OPTIONS = generateDates();

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const WalkInModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({
    building: BUILDINGS[0],
    date: format(new Date(), "yyyy-MM-dd"),
    time: "10:00",
    name: "",
    email: "",
    phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      setError("Name and email are required.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/admin/bookings/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("prism_token")}`,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to save");
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Add Walk-in Tour</h2>
            <p className="text-xs text-slate-500 mt-0.5">No email will be sent to the prospect.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Building */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <MapPin className="inline w-3.5 h-3.5 mr-1 text-slate-400" /> Building
            </label>
            <div className="grid grid-cols-2 gap-2">
              {BUILDINGS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, building: b }))}
                  className={`py-2.5 px-3 rounded-xl border-2 text-sm font-medium text-left transition-all ${
                    form.building === b
                      ? "border-zinc-900 bg-zinc-50 text-zinc-900"
                      : "border-slate-200 text-slate-600 hover:border-slate-400"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <Calendar className="inline w-3.5 h-3.5 mr-1 text-slate-400" /> Date
            </label>
            <select
              name="date"
              value={form.date}
              onChange={handleChange}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              {DATE_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {format(new Date(d + "T00:00:00"), "EEE, MMM d, yyyy")}
                  {d === format(new Date(), "yyyy-MM-dd") ? " (Today)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Time */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <Clock className="inline w-3.5 h-3.5 mr-1 text-slate-400" /> Time
            </label>
            <div className="grid grid-cols-4 gap-2">
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, time: slot }))}
                  className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                    form.time === slot
                      ? "bg-zinc-900 text-white border-zinc-900"
                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-3">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <User className="inline w-3.5 h-3.5 mr-1 text-slate-400" /> Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Jane Smith"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <Mail className="inline w-3.5 h-3.5 mr-1 text-slate-400" /> Email *
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="jane@example.com"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <Phone className="inline w-3.5 h-3.5 mr-1 text-slate-400" /> Phone (optional)
              </label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="416-555-0100"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-700">
            This tour will be saved as <strong>Completed</strong>. No confirmation email will be sent.
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-bold hover:bg-zinc-700 transition-colors disabled:opacity-40"
            >
              {submitting ? "Saving..." : "Save Tour"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WalkInModal;