import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { MapPin, User, Mail, Phone } from "lucide-react";
import { format, addDays, startOfToday, isSunday, isSaturday } from "date-fns";
import Header from "../../../components/Header";
import BuildingSelector from "./components/BuildingSelector";
import DateSelector from "./components/DateSelector";
import TimeSlotGrid from "./components/TimeSlotGrid";
import BookingSummary from "./components/BookingSummary";
import SuccessStep from "./components/SuccessStep";

const BUILDINGS_BY_TYPE: Record<string, string[]> = {
  tour: ["80 Bond St E", "100 Bond St E"],
  meeting: ["80 Bond St E", "100 Bond St E"],
};

const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
};

interface BookingPageProps {
  bookingType: "tour" | "meeting";
  meetingToken?: string;
}

const BookingPage: React.FC<BookingPageProps> = ({ bookingType, meetingToken }) => {
  const isMeeting = bookingType === "meeting";
  const isTokenMeeting = isMeeting && !!meetingToken;
  const BUILDINGS = BUILDINGS_BY_TYPE[bookingType];

  // Agent info
  const [agentName, setAgentName] = useState("");
  const [tokenError, setTokenError] = useState(false);
  const [isLoadingAgent, setIsLoadingAgent] = useState(isTokenMeeting);

  // Core state
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

  // Resolve token → agent name
  useEffect(() => {
    if (!isTokenMeeting) return;
    fetch(`/bookings/meeting-info/${meetingToken}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { setAgentName(data.agent_name); setIsLoadingAgent(false); })
      .catch(() => { setTokenError(true); setIsLoadingAgent(false); });
  }, [meetingToken, isTokenMeeting]);

  // Fetch blocked dates
  useEffect(() => {
    fetch("/bookings/blocked-dates")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setBlockedDates(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Build available dates
  const availableDates = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => {
      const date = addDays(today, i);
      const dateStr = format(date, "yyyy-MM-dd");
      const isSun = isSunday(date);
      const isBlocked = blockedDates.includes(dateStr);
      const disabled = isSun || isBlocked;
      let labelSuffix = "";
      if (isSun) labelSuffix = " (Sunday Closed)";
      else if (isBlocked) labelSuffix = " (Unavailable)";
      return { date: dateStr, label: format(date, "EEE, MMM d"), disabled, labelSuffix };
    });
  }, [today, blockedDates]);

  // Auto-correct selected date if blocked
  useEffect(() => {
    const current = availableDates.find((d) => d.date === formData.date);
    if (current?.disabled) {
      const next = availableDates.find((d) => !d.disabled);
      if (next) setFormData((p) => ({ ...p, date: next.date, time: "" }));
    }
  }, [availableDates, formData.date]);

  // Fetch taken slots
  useEffect(() => {
    if (!formData.date) return;
    setIsLoadingSlots(true);
    const url = isTokenMeeting
      ? `/bookings/meeting-taken/${meetingToken}?date=${formData.date}`
      : `/bookings/taken?building=${encodeURIComponent(formData.building)}&date=${formData.date}`;

    fetch(url)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        setTakenSlots(Array.isArray(data) ? data : []);
        setFormData((prev) => {
          const isToday = prev.date === format(today, "yyyy-MM-dd");
          const slotHour = prev.time ? parseInt(prev.time.split(":")[0], 10) : null;
          const isPast = isToday && slotHour !== null && slotHour <= currentHour;
          const localDate = parseLocalDate(prev.date);
          const isSatEve = isSaturday(localDate) && prev.time === "16:00";
          const shouldClear = data.includes(prev.time) || isPast || isSatEve;
          return shouldClear && prev.time !== "" ? { ...prev, time: "" } : prev;
        });
      })
      .catch(() => setTakenSlots([]))
      .finally(() => setIsLoadingSlots(false));
  }, [formData.building, formData.date, meetingToken, isTokenMeeting, today, currentHour, blockedDates]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const url = isTokenMeeting ? `/bookings/meeting/${meetingToken}` : "/bookings/";
      const body = isTokenMeeting
        ? { date: formData.date, time: formData.time, name: formData.name, email: formData.email, phone: formData.phone }
        : { building: formData.building, date: formData.date, time: formData.time, name: formData.name, email: formData.email, phone: formData.phone, booking_type: bookingType };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to create booking.");
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
    setFormData({ building: BUILDINGS[0], date: format(today, "yyyy-MM-dd"), time: "", name: "", email: "", phone: "" });
    setError("");
  };

  const pageTitle = isMeeting ? "Schedule a Meeting" : "Schedule a Tour";
  const pageSubtitle = isTokenMeeting
    ? agentName ? `Book a meeting with ${agentName}.` : "Loading..."
    : isMeeting ? "Book a meeting at 80 or 100 Bond St E."
    : "Experience our premium spaces at 80 and 100 Bond St E.";

  // Token error
  if (isTokenMeeting && tokenError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header currentView="booking" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Invalid Link</h1>
            <p className="text-slate-500">This meeting link is invalid or has expired.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingAgent) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col">
      <Header currentView="booking" />
      <main className="flex-1 w-full px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 mb-2">{pageTitle}</h1>
            <p className="text-zinc-500">{pageSubtitle}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
            {/* Step indicator */}
            <div className="bg-zinc-50 border-b border-zinc-200 px-6 py-4">
              <div className="flex items-center justify-center">
                {[1, 2, 3].map((s) => (
                  <React.Fragment key={s}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${step >= s ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-500"}`}>
                      {s}
                    </div>
                    {s < 3 && (
                      <div className={`flex-1 h-1 mx-2 rounded-full max-w-24 ${step > s ? "bg-zinc-900" : "bg-zinc-200"}`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="p-6 sm:p-8">
              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
              )}

              {/* Step 1 — Date & Time */}
              {step === 1 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-zinc-400" />
                    {isTokenMeeting ? "Select Date & Time" : "Select Location & Time"}
                  </h2>
                  <div className="space-y-6">
                    {!isTokenMeeting && (
                      <BuildingSelector
                        buildings={BUILDINGS}
                        selected={formData.building}
                        onSelect={(b) => setFormData((p) => ({ ...p, building: b, time: "" }))}
                      />
                    )}
                    <DateSelector
                      availableDates={availableDates}
                      selected={formData.date}
                      onChange={(date) => setFormData((p) => ({ ...p, date, time: "" }))}
                    />
                    <TimeSlotGrid
                      date={formData.date}
                      today={today}
                      currentHour={currentHour}
                      takenSlots={takenSlots}
                      selectedTime={formData.time}
                      isLoading={isLoadingSlots}
                      onSelect={(time) => setFormData((p) => ({ ...p, time }))}
                    />
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

              {/* Step 2 — Contact Info */}
              {step === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                  <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-zinc-400" />
                    Your Details
                  </h2>
                  <BookingSummary
                    building={formData.building}
                    date={formData.date}
                    time={formData.time}
                    agentName={isTokenMeeting ? agentName : undefined}
                    showBuilding={!isTokenMeeting}
                  />
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">
                        <User className="inline w-4 h-4 mr-1 text-zinc-400" /> Full Name
                      </label>
                      <input type="text" name="name" required value={formData.name} onChange={handleChange}
                        className="w-full rounded-xl border border-zinc-200 p-3 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                        placeholder="Jane Smith" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">
                        <Mail className="inline w-4 h-4 mr-1 text-zinc-400" /> Email
                      </label>
                      <input type="email" name="email" required value={formData.email} onChange={handleChange}
                        className="w-full rounded-xl border border-zinc-200 p-3 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                        placeholder="jane@example.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">
                        <Phone className="inline w-4 h-4 mr-1 text-zinc-400" /> Phone (optional)
                      </label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                        className="w-full rounded-xl border border-zinc-200 p-3 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                        placeholder="416-555-0100" />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => setStep(1)}
                        className="flex-1 border border-zinc-200 rounded-xl p-3 font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">
                        Back
                      </button>
                      <button type="submit" disabled={isSubmitting}
                        className="flex-1 bg-zinc-900 text-white rounded-xl p-3 font-medium disabled:opacity-40 hover:bg-zinc-700 transition-colors">
                        {isSubmitting ? "Confirming..." : isMeeting ? "Confirm Meeting" : "Confirm Booking"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Step 3 — Success */}
              {step === 3 && (
                <SuccessStep
                  name={formData.name}
                  email={formData.email}
                  building={formData.building}
                  date={formData.date}
                  time={formData.time}
                  agentName={agentName}
                  isTokenMeeting={isTokenMeeting}
                  isMeeting={isMeeting}
                  onReset={resetForm}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BookingPage;