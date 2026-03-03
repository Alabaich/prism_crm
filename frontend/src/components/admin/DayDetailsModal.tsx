import React from 'react';
import { format } from 'date-fns';
import { X, AlertCircle, Clock, User, MapPin } from 'lucide-react';
import type { Booking } from '../../types';

interface DayDetailsModalProps {
  date: Date;
  bookings: Booking[];
  isBlocked: boolean;
  onClose: () => void;
  onToggleBlock: (date: Date, block: boolean) => void;
}

export const DayDetailsModal: React.FC<DayDetailsModalProps> = ({ date, bookings, isBlocked, onClose, onToggleBlock }) => {
  const activeBookings = bookings.filter(b => b.status !== 'cancelled');
  const hasBookings = activeBookings.length > 0;

  const handleBlockToggle = () => {
    if (hasBookings && !isBlocked) return; // Cannot block if there are bookings
    onToggleBlock(date, !isBlocked);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">
            {format(date, 'EEEE, MMMM do, yyyy')}
          </h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Settings Section */}
          <div className="mb-8">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Availability Settings</h4>
            
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">Block this date</p>
                <p className="text-sm text-slate-500">Prevent anyone from booking tours.</p>
              </div>
              <button
                onClick={handleBlockToggle}
                disabled={hasBookings && !isBlocked}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all
                  ${isBlocked 
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' 
                    : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'}
                  ${(hasBookings && !isBlocked) ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {isBlocked ? 'Unblock Date' : 'Block Date'}
              </button>
            </div>
            
            {(hasBookings && !isBlocked) && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                <AlertCircle className="w-4 h-4" />
                You cannot block a date that already has scheduled tours.
              </div>
            )}
          </div>

          {/* Bookings Section */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              Scheduled Tours <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs">{activeBookings.length}</span>
            </h4>
            
            {activeBookings.length === 0 ? (
              <p className="text-sm text-slate-500 italic py-4">No active tours scheduled for this day.</p>
            ) : (
              <div className="space-y-3">
                {activeBookings.map(booking => (
                  <div key={booking.id} className="border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-blue-500" />
                        {booking.time}
                      </div>
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-slate-100 text-slate-600`}>
                        {booking.status}
                      </span>
                    </div>
                    <div className="space-y-1 mt-3">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <User className="w-4 h-4 text-slate-400" /> {booking.name}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="w-4 h-4 text-slate-400" /> {booking.building}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
