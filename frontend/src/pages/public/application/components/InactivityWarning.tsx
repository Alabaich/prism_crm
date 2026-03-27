import React, { useState, useEffect, useCallback, useRef } from "react";
import { Clock, AlertTriangle } from "lucide-react";

interface Props {
  warningAfterMs?: number;
  expireAfterMs?: number;
  onStillHere: () => void;
  onExpired: () => void;
  active: boolean;
}

const InactivityWarning: React.FC<Props> = ({
  warningAfterMs = 17 * 60 * 1000,
  expireAfterMs = 20 * 60 * 1000,
  onStillHere,
  onExpired,
  active,
}) => {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const startInactivityTimer = useCallback(() => {
    clearAllTimers();
    if (!active) return;

    // 1. Set the timer to show the warning
    warningTimerRef.current = setTimeout(() => {
      const remaining = Math.ceil((expireAfterMs - warningAfterMs) / 1000);
      setSecondsLeft(remaining);
      setShowWarning(true);

      // 2. Start the visual countdown once warning is visible
      countdownRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearAllTimers();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, warningAfterMs);

    // 3. Set the absolute expiration timer
    expireTimerRef.current = setTimeout(() => {
      clearAllTimers();
      setShowWarning(false);
      onExpired();
    }, expireAfterMs);
  }, [active, warningAfterMs, expireAfterMs, onExpired, clearAllTimers]);

  // Initial Start & Cleanup
  useEffect(() => {
    if (active) {
      startInactivityTimer();
    } else {
      clearAllTimers();
      setShowWarning(false);
    }
    return () => clearAllTimers();
  }, [active, startInactivityTimer, clearAllTimers]);

  // Handle "Still here" click
  const handleStillHere = () => {
    setShowWarning(false);
    startInactivityTimer(); // Resets everything
    onStillHere();
  };

  // Trigger expiration when countdown hits zero
  useEffect(() => {
    if (showWarning && secondsLeft <= 0) {
      clearAllTimers();
      onExpired();
    }
  }, [showWarning, secondsLeft, onExpired, clearAllTimers]);

  if (!showWarning) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="h-1 bg-amber-500" />
        <div className="p-8 text-center">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 mb-2">Still there?</h3>
          <p className="text-sm text-zinc-500 mb-6">
            Your session will expire soon. Click below to stay logged in.
          </p>
          <div className="inline-flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 mb-6">
            <Clock className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-mono font-bold text-zinc-700">
              {minutes}:{seconds.toString().padStart(2, "0")}
            </span>
          </div>
          <button
            onClick={handleStillHere}
            className="w-full bg-zinc-900 text-white rounded-xl p-3 font-semibold hover:bg-zinc-700 transition"
          >
            Yes, I'm still here
          </button>
        </div>
      </div>
    </div>
  );
};

export default InactivityWarning;