import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar as CalendarIcon, Clock, MapPin, User, Mail, Phone, CheckCircle2 } from 'lucide-react';
import { format, addDays, startOfToday, isSunday } from 'date-fns';

const BUILDINGS = ['80 Bond St E', '100 Bond St E'];
const TIME_SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

const BookingView: React.FC = () => {
  const today = startOfToday();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    building: BUILDINGS[0],
    date: format(addDays(today, 1), 'yyyy-MM-dd'),
    time: '',
    name: '',
    email: '',
    phone: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [takenSlots, setTakenSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  useEffect(() => {
    const fetchTakenSlots = async () => {
      if (!formData.building || !formData.date) return;
      setIsLoadingSlots(true);
      try {
        // TODO: Backend (FastAPI) implementation needed for GET /api/bookings/taken
        const res = await fetch(`http://localhost:8000/api/bookings/taken?building=${encodeURIComponent(formData.building)}&date=${encodeURIComponent(formData.date)}`);
        
        if (res.ok) {
          const data = await res.json();
          setTakenSlots(data);
          if (data.includes(formData.time)) {
            setFormData(prev => ({ ...prev, time: '' }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch taken slots', err);
        setTakenSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchTakenSlots();
  }, [formData.building, formData.date, formData.time]);

  const availableDates = Array.from({ length: 14 }).map((_, i) => {
    const date = addDays(today, i + 1);
    return {
      date: format(date, 'yyyy-MM-dd'),
      label: format(date, 'EEE, MMM d'),
      disabled: isSunday(date)
    };
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // TODO: Backend (FastAPI) implementation needed for POST /api/bookings
      await new Promise(resolve => setTimeout(resolve, 800));
      setStep(3);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="w-full px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 mb-2">Schedule a Tour</h1>
          <p className="text-zinc-500">Experience our premium spaces at 80 and 100 Bond St E.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
          {/* Progress Bar */}
          <div className="bg-zinc-50 border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-500'
                }`}>
                  {s}
                </div>
                {s < 3 && (
                  <div className={`w-12 sm:w-24 h-1 mx-2 rounded-full ${
                    step > s ? 'bg-zinc-900' : 'bg-zinc-200'
                  }`} />
                )}
              </div>
            ))}
          </div>

          <div className="p-6 sm:p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-zinc-400" />
                  Select Location & Time
                </h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-2">Building</label>
                    <div className="grid grid-cols-2 gap-4">
                      {BUILDINGS.map(b => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, building: b }))}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            formData.building === b 
                              ? 'border-zinc-900 bg-zinc-50' 
                              : 'border-zinc-200 hover:border-zinc-300'
                          }`}
                        >
                          <div className="font-medium text-zinc-900">{b}</div>
                          <div className="text-sm text-zinc-500 mt-1">Guided Tour</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-2">Date</label>
                    <select
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      className="w-full p-3 rounded-xl border border-zinc-300 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition-shadow bg-white"
                    >
                      {availableDates.map(d => (
                        <option key={d.date} value={d.date} disabled={d.disabled}>
                          {d.label} {d.disabled ? '(Sunday Closed)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-2">
                      Time {isLoadingSlots && <span className="text-zinc-400 text-xs ml-2">(Loading availability...)</span>}
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {TIME_SLOTS.map(t => {
                        const isTaken = takenSlots.includes(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            disabled={isTaken}
                            onClick={() => setFormData(prev => ({ ...prev, time: t }))}
                            className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                              isTaken
                                ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed'
                                : formData.time === t
                                  ? 'bg-zinc-900 text-white border-zinc-900'
                                  : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300'
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
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <User className="w-5 h-5 text-zinc-400" />
                  Your Details
                </h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Full Name</label>
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
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Email Address</label>
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
                    <p className="mt-1 text-xs text-zinc-500">We'll send your calendar invitation here.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Phone Number (Optional)</label>
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
                    <h3 className="text-sm font-medium text-zinc-900 mb-2">Booking Summary</h3>
                    <div className="text-sm text-zinc-600 space-y-1">
                      <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {formData.building}</div>
                      <div className="flex items-center gap-2"><CalendarIcon className="w-4 h-4" /> {format(new Date(formData.date), 'MMMM d, yyyy')}</div>
                      <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> {formData.time}</div>
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
                      {isSubmitting ? 'Confirming...' : 'Confirm Booking'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 mb-2">Booking Confirmed!</h2>
                <p className="text-zinc-600 mb-8 max-w-md mx-auto">
                  Thank you, {formData.name}. Your tour at {formData.building} is scheduled for {format(new Date(formData.date), 'MMMM d, yyyy')} at {formData.time}.
                </p>
                <div className="bg-zinc-50 p-6 rounded-xl border border-zinc-200 mb-8 text-left max-w-sm mx-auto">
                  <p className="text-sm text-zinc-600 mb-4">
                    We've sent a confirmation email to <strong>{formData.email}</strong> with a calendar invitation attached.
                  </p>
                  <p className="text-sm text-zinc-500">
                    Please arrive 5 minutes before your scheduled time. The admin team has also been notified.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setStep(1);
                    setFormData({ ...formData, time: '', name: '', email: '', phone: '' });
                  }}
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
  );
};

export default BookingView;