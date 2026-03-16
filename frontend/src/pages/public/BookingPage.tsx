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

// Building lists per type — same for now, easy to split in the future
const BUILDINGS_BY_TYPE: Record<string, string[]> = {
  tour: ["80 Bond St E", "100 Bond St E"],
  meeting: ["80 Bond St E", "100 Bond St E"],
};

const TIME_SLOTS = [
  "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00",
];

const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
};

interface BookingPageProps {
  bookingType: "tour" | "meeting";
}

const BookingPage: React.FC<BookingPageProps> = ({ bookingType }) => {
  const isMeeting = bookingType === "meeting";
  const BUILDINGS = BUILDINGS_BY_TYPE[bookingType];

  // Copy for the two page variants
  const copy = {
    pageTitle: isMeeting ? "Schedule a Meeting" : "Schedule a Tour",
    pageSubtitle: isMeeting
      ? "Book a meeting at 80 or 100 Bond St E."
      : "Experience our premium spaces at 80 and 100 Bond St E.",
    step1Header: isMeeting ? "Select Location & Time" : "Select Location & Time",
    confirmButton: isMeeting ? "Confirm Meeting" : "Confirm Booking",
    confirmingButton: isMeeting ? "Confirming..." : "Confirming...",
    successTitle: isMeeting ? "Meeting Confirmed!" : "Booking Confirmed!",
    successBody: (name: string, building: string, date: string, time: string) =>
      isMeeting
        ? `Thank you, ${name}. Your meeting at ${building} is scheduled for ${date} at ${time}.`
        : `Thank you, ${name}. Your tour at ${building} is scheduled for ${date} at ${time}.`,
    resetButton: isMeeting ? "Schedule another meeting" : "Book another tour",
    arrivalNote: isMeeting
      ? "Please arrive a few minutes before your scheduled time."
      : "Please arrive 5 minutes before your scheduled time. The admin team has also been notified.",
  };

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
          booking_type: bookingType,
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
    setStep(1);
    setFormData({
      building: BUILDINGS[0],
      date: format(today, "yyyy-MM-dd"),
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
              {copy.pageTitle}
            </h1>
            <p className="text-zinc-500">{copy.pageSubtitle}</p>
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
                    {copy.step1Header}
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
                                : "border-zinc-200 hover:border-zinc-400"
                            }`}
                          >
                            <div className="font-medium text-zinc-900">{b}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">
                        <CalendarIcon className="inline w-4 h-4 mr-1 text-zinc-400" />
                        Date
                      </label>
                      <select
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-zinc-200 p-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      >
                        {availableDates.map((d) => (
                          <option key={d.date} value={d.date} disabled={d.disabled}>
                            {d.label}{d.labelSuffix}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">
                        <Clock className="inline w-4 h-4 mr-1 text-zinc-400" />
                        Time
                      </label>
                      {isLoadingSlots ? (
                        <div className="text-sm text-zinc-400 py-4">Loading available times...</div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2">
                          {TIME_SLOTS.map((slot) => {
                            const isTaken = takenSlots.includes(slot);
                            const isToday = formData.date === format(today, "yyyy-MM-dd");
                            const slotHour = parseInt(slot.split(":")[0], 10);
                            const isPast = isToday && slotHour <= currentHour;
                            const localDate = parseLocalDate(formData.date);
                            const isSatEve = isSaturday(localDate) && slot === "16:00";
                            const isDisabled = isTaken || isPast || isSatEve;

                            return (
                              <button
                                key={slot}
                                type="button"
                                disabled={isDisabled}
                                onClick={() => setFormData((prev) => ({ ...prev, time: slot }))}
                                className={`py-2 rounded-lg text-sm font-medium transition-all ${
                                  formData.time === slot
                                    ? "bg-zinc-900 text-white"
                                    : isDisabled
                                    ? "bg-zinc-100 text-zinc-300 cursor-not-allowed line-through"
                                    : "bg-zinc-50 text-zinc-700 hover:bg-zinc-200 border border-zinc-200"
                                }`}
                              >
                                {slot}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={!formData.time}
                      onClick={() => setStep(2)}
                      className="w-full bg-zinc-900 text-white rounded-xl p-3 font-medium disabled:opacity-40 hover:bg-zinc-700 transition-colors"
                    >
                      Continue to Details
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-zinc-400" />
                    Your Details
                  </h2>

                  {/* Booking summary */}
                  <div className="bg-zinc-50 rounded-xl p-4 mb-6 border border-zinc-200 text-sm">
                    <div className="flex items-center gap-2 text-zinc-600 mb-1">
                      <MapPin className="w-4 h-4" /> {formData.building}
                    </div>
                    <div className="flex items-center gap-2 text-zinc-600">
                      <Clock className="w-4 h-4" />
                      {format(parseLocalDate(formData.date), "MMMM d, yyyy")} at {formData.time}
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">
                        <User className="inline w-4 h-4 mr-1 text-zinc-400" /> Full Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-zinc-200 p-3 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                        placeholder="Jane Smith"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">
                        <Mail className="inline w-4 h-4 mr-1 text-zinc-400" /> Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-zinc-200 p-3 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                        placeholder="jane@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">
                        <Phone className="inline w-4 h-4 mr-1 text-zinc-400" /> Phone (optional)
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-zinc-200 p-3 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                        placeholder="416-555-0100"
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="flex-1 border border-zinc-200 rounded-xl p-3 font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 bg-zinc-900 text-white rounded-xl p-3 font-medium disabled:opacity-40 hover:bg-zinc-700 transition-colors"
                      >
                        {isSubmitting ? copy.confirmingButton : copy.confirmButton}
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
                    {copy.successTitle}
                  </h2>
                  <p className="text-zinc-600 mb-8 max-w-md mx-auto">
                    {copy.successBody(
                      formData.name,
                      formData.building,
                      format(parseLocalDate(formData.date), "MMMM d, yyyy"),
                      formData.time
                    )}
                  </p>
                  <div className="bg-zinc-50 p-6 rounded-xl border border-zinc-200 mb-8 text-left max-w-sm mx-auto">
                    <p className="text-sm text-zinc-600 mb-4">
                      We've sent a confirmation email to{" "}
                      <strong>{formData.email}</strong> with a calendar invitation attached.
                    </p>
                    <p className="text-sm text-zinc-500">{copy.arrivalNote}</p>
                  </div>
                  <button
                    onClick={resetForm}
                    className="text-zinc-900 font-medium hover:underline"
                  >
                    {copy.resetButton}
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