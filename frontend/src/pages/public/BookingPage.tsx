import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  CheckCircle2,
} from "lucide-react";
import { format, addDays, startOfToday, isSunday, isSaturday } from "date-fns";
import Header from "../../components/Header";

const BUILDINGS = ["80 Bond St E", "100 Bond St E"];
const TIME_SLOTS = [
  "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00",
];

// Parses "yyyy-MM-dd" as a local date (avoids UTC timezone shifts)
const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const BookingPage: React.FC = () => {
  const [today] = useState(() => startOfToday());
  const [currentHour] = useState(() => new Date().getHours());

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    building: BUILDINGS[0],
    date: format(today, "yyyy-MM-dd"),
    time: "",
    name: "",
    email: "",
    phone: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [takenSlots, setTakenSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);

  // 1. Fetch blocked dates on mount
  useEffect(() => {
    const fetchBlockedDates = async () => {
      try {
        const res = await fetch("/bookings/blocked-dates");
        if (res.ok) {
          const data = await res.json();
          setBlockedDates(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to fetch blocked dates", err);
      }
    };
    fetchBlockedDates();
  }, []);

  // 2. Build available dates list
  const availableDates = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => {
      const date = addDays(today, i);
      const dateStr = format(date, "yyyy-MM-dd");
      const isSun = isSunday(date);
      const isBlocked = blockedDates.some((bd) => bd === dateStr);
      const disabled = isSun || isBlocked;

      let labelSuffix = "";
      if (isSun) labelSuffix = " (Sunday Closed)";
      else if (isBlocked) labelSuffix = " (Unavailable)";

      return { date: dateStr, label: format(date, "EEE, MMM d"), disabled, labelSuffix };
    });
  }, [today, blockedDates]);

  // 3. Auto-correct selected date if it becomes blocked
  useEffect(() => {
    const currentOption = availableDates.find((d) => d.date === formData.date);
    if (currentOption?.disabled) {
      const nextAvailable = availableDates.find((d) => !d.disabled);
      if (nextAvailable) {
        setFormData((prev) => ({ ...prev, date: nextAvailable.date, time: "" }));
      }
    }
  }, [availableDates, formData.date]);

  // 4. Fetch taken slots when building or date changes
  useEffect(() => {
    const fetchTakenSlots = async () => {
      if (!formData.building || !formData.date) return;
      setIsLoadingSlots(true);
      try {
        const res = await fetch(
          `/bookings/taken?building=${encodeURIComponent(formData.building)}&date=${encodeURIComponent(formData.date)}`
        );
        if (res.ok) {
          const data = await res.json();
          setTakenSlots(data);

          setFormData((prev) => {
            const isToday = prev.date === format(today, "yyyy-MM-dd");
            const slotHour = prev.time ? parseInt(prev.time.split(":")[0], 10) : null;
            const isPassedToday = isToday && slotHour !== null && slotHour <= currentHour;
            const localDate = parseLocalDate(prev.date);
            const isSaturdayEvening = isSaturday(localDate) && prev.time === "16:00";
            const shouldClear = data.includes(prev.time) || isPassedToday || isSaturdayEvening;

            if (shouldClear && prev.time !== "") {
              return { ...prev, time: "" };
            }
            return prev;
          });
        }
      } catch (err) {
        console.error("Failed to fetch taken slots", err);
        setTakenSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchTakenSlots();
  }, [formData.building, formData.date, today, currentHour]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/bookings/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          building: formData.building,
          date: formData.date,
          time: formData.time,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to create booking. Please try again.");
      }

      setStep(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    const todayStr = format(today, "yyyy-MM-dd");
    setStep(1);
    setFormData({
      building: BUILDINGS[0],
      date: todayStr,
      time: "",
      name: "",
      email: "",
      phone: "",
    });
    setError("");
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col">
      <Header currentView="booking" />
      <main className="flex-1 w-full px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 mb-2">
              Schedule a Tour
            </h1>
            <p className="text-zinc-500">
              Experience our premium spaces at 80 and 100 Bond St E.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
            {/* Step indicator */}
            <div className="bg-zinc-50 border-b border-zinc-200 px-6 py-4">
              <div className="flex items-center justify-center">
                {[1, 2, 3].map((s) => (
                  <React.Fragment key={s}>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                        step >= s ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-500"
                      }`}
                    >
                      {s}
                    </div>
                    {s < 3 && (
                      <div
                        className={`flex-1 h-1 mx-2 rounded-full max-w-24 ${
                          step > s ? "bg-zinc-900" : "bg-zinc-200"
                        }`}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="p-6 sm:p-8">
              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-zinc-400" />
                    Select Location & Time
                  </h2>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">
                        Building
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        {BUILDINGS.map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({ ...prev, building: b, time: "" }))
                            }
                            className={`p-4 rounded-xl border-2 text-left transition-all ${
                              formData.building === b
                                ? "border-zinc-900 bg-zinc-50"
                                : "border-zinc-200 hover:border-zinc-300"
                            }`}
                          >
                            <div className="font-medium text-zinc-900">{b}</div>
                            <div className="text-sm text-zinc-500 mt-1">Guided Tour</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">
                        Date
                      </label>
                      <select
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        className="w-full p-3 rounded-xl border border-zinc-300 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition-shadow bg-white"
                      >
                        {availableDates.map((d) => (
                          <option
                            key={d.date}
                            value={d.date}
                            disabled={d.disabled}
                            style={d.disabled ? { color: "#94a3b8" } : {}}
                          >
                            {d.label}{d.labelSuffix}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">
                        Time{" "}
                        {isLoadingSlots && (
                          <span className="text-zinc-400 text-xs ml-2">
                            (Loading availability...)
                          </span>
                        )}
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {TIME_SLOTS.map((t) => {
                          const isTaken = takenSlots.includes(t);
                          const isToday = formData.date === format(today, "yyyy-MM-dd");
                          const slotHour = parseInt(t.split(":")[0], 10);
                          const isPassedToday = isToday && slotHour <= currentHour;
                          const localDate = parseLocalDate(formData.date);
                          const isSaturdayEvening = isSaturday(localDate) && t === "16:00";
                          const isDisabled = isTaken || isPassedToday || isSaturdayEvening;

                          return (
                            <button
                              key={t}
                              type="button"
                              disabled={isDisabled}
                              onClick={() =>
                                setFormData((prev) => ({ ...prev, time: t }))
                              }
                              className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                                isDisabled
                                  ? "bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed"
                                  : formData.time === t
                                  ? "bg-zinc-900 text-white border-zinc-900"
                                  : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300"
                              }`}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-6 flex justify-end">
                      <button
                        onClick={() => setStep(2)}
                        disabled={!formData.time}
                        className="bg-zinc-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Continue to Details
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-zinc-400" />
                    Your Details
                  </h2>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">
                        Full Name
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-zinc-400" />
                        </div>
                        <input
                          type="text"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          className="block w-full pl-10 p-3 rounded-xl border border-zinc-300 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition-shadow"
                          placeholder="Jane Doe"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">
                        Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-zinc-400" />
                        </div>
                        <input
                          type="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          className="block w-full pl-10 p-3 rounded-xl border border-zinc-300 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition-shadow"
                          placeholder="jane@example.com"
                        />
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        We'll send your calendar invitation here.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">
                        Phone Number (Optional)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-5 w-5 text-zinc-400" />
                        </div>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="block w-full pl-10 p-3 rounded-xl border border-zinc-300 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition-shadow"
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>

                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 mt-6">
                      <h3 className="text-sm font-medium text-zinc-900 mb-2">
                        Booking Summary
                      </h3>
                      <div className="text-sm text-zinc-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" /> {formData.building}
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4" />{" "}
                          {format(parseLocalDate(formData.date), "MMMM d, yyyy")}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" /> {formData.time}
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 flex justify-between">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-zinc-600 px-6 py-3 rounded-xl font-medium hover:bg-zinc-100 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || !formData.name || !formData.email}
                        className="bg-zinc-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {isSubmitting ? "Confirming..." : "Confirm Booking"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-zinc-900 mb-2">
                    Booking Confirmed!
                  </h2>
                  <p className="text-zinc-600 mb-8 max-w-md mx-auto">
                    Thank you, {formData.name}. Your tour at {formData.building} is
                    scheduled for {format(parseLocalDate(formData.date), "MMMM d, yyyy")} at{" "}
                    {formData.time}.
                  </p>
                  <div className="bg-zinc-50 p-6 rounded-xl border border-zinc-200 mb-8 text-left max-w-sm mx-auto">
                    <p className="text-sm text-zinc-600 mb-4">
                      We've sent a confirmation email to{" "}
                      <strong>{formData.email}</strong> with a calendar invitation
                      attached.
                    </p>
                    <p className="text-sm text-zinc-500">
                      Please arrive 5 minutes before your scheduled time. The admin
                      team has also been notified.
                    </p>
                  </div>
                  <button
                    onClick={resetForm}
                    className="text-zinc-900 font-medium hover:underline"
                  >
                    Book another tour
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BookingPage;