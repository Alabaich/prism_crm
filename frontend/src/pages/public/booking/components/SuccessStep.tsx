import React from "react";
import { CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
};

interface Props {
  name: string;
  email: string;
  building: string;
  date: string;
  time: string;
  agentName?: string;
  isTokenMeeting: boolean;
  isMeeting: boolean;
  onReset: () => void;
}

const SuccessStep: React.FC<Props> = ({
  name,
  email,
  building,
  date,
  time,
  agentName,
  isTokenMeeting,
  isMeeting,
  onReset,
}) => {
  const formattedDate = format(parseLocalDate(date), "MMMM d, yyyy");

  const successTitle = isMeeting ? "Meeting Confirmed!" : "Booking Confirmed!";
  const resetButton = isMeeting ? "Schedule another meeting" : "Book another tour";
  const arrivalNote = isMeeting
    ? "Please arrive a few minutes before your scheduled time."
    : "Please arrive 5 minutes before your scheduled time. The admin team has also been notified.";

  const successBody = isTokenMeeting
    ? `Thank you, ${name}. Your meeting with ${agentName} is scheduled for ${formattedDate} at ${time}.`
    : isMeeting
    ? `Thank you, ${name}. Your meeting at ${building} is scheduled for ${formattedDate} at ${time}.`
    : `Thank you, ${name}. Your tour at ${building} is scheduled for ${formattedDate} at ${time}.`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-8"
    >
      <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-zinc-900 mb-2">{successTitle}</h2>
      <p className="text-zinc-600 mb-8 max-w-md mx-auto">{successBody}</p>
      <div className="bg-zinc-50 p-6 rounded-xl border border-zinc-200 mb-8 text-left max-w-sm mx-auto">
        <p className="text-sm text-zinc-600 mb-4">
          We've sent a confirmation email to <strong>{email}</strong> with a calendar invitation attached.
        </p>
        <p className="text-sm text-zinc-500">{arrivalNote}</p>
      </div>
      <button onClick={onReset} className="text-zinc-900 font-medium hover:underline">
        {resetButton}
      </button>
    </motion.div>
  );
};

export default SuccessStep;