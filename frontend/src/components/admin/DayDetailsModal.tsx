import React, { useState } from 'react';
import { format } from 'date-fns';
import { X, AlertCircle, Clock, User, MapPin, CheckCircle2, UserX, Home } from 'lucide-react';
import type { Booking } from '../../types';

interface DayDetailsModalProps {
  date: Date;
  bookings: Booking[];
  isBlocked: boolean;
  onClose: () => void;
  onToggleBlock: (date: Date, block: boolean) => void;
  onUpdateBooking: (id: number, updates: Partial<Booking>) => void;
}

export const DayDetailsModal: React.FC<DayDetailsModalProps> = ({
  date, bookings, isBlocked, onClose, onToggleBlock, onUpdateBooking
}) => {
  const [updating, setUpdating] = useState<number | null>(null);
  const activeBookings = bookings.filter(b => b.status !== 'cancelled');
  const hasBookings = activeBookings.length > 0;

  const handleBlockToggle = () => {
    if (hasBookings && !isBlocked) return;
    onToggleBlock(date, !isBlocked);
  };

  // --- Confirm (pending → confirmed) ---
  const handleConfirm = async (id: number) => {
    setUpdating(id);
    try {
      const res = await fetch(`/admin/bookings/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      });
      if (res.ok) onUpdateBooking(id, { status: 'confirmed' });
    } finally {
      setUpdating(null);
    }
  };

  // --- Cancel ---
  const handleCancel = async (id: number) => {
    setUpdating(id);
    try {
      const res = await fetch(`/admin/bookings/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (res.ok) onUpdateBooking(id, { status: 'cancelled' });
    } finally {
      setUpdating(null);
    }
  };

  // --- Showed Up (confirmed → Completed) ---
  const handleShowedUp = async (id: number) => {
    setUpdating(id);
    try {
      const res = await fetch(`/admin/bookings/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Completed' }),
      });
      if (res.ok) onUpdateBooking(id, { status: 'Completed' });
    } finally {
      setUpdating(null);
    }
  };

  // --- No Show ---
  const handleNoShow = async (id: number) => {
    setUpdating(id);
    try {
      const res = await fetch(`/admin/bookings/${id}/outcome`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tour_outcome: 'No Show' }),
      });
      if (res.ok) onUpdateBooking(id, { status: 'Completed', tour_outcome: 'No Show' });
    } finally {
      setUpdating(null);
    }
  };

  // --- Convert to Tenant ---
  const handleConvert = async (id: number) => {
    setUpdating(id);
    try {
      const res = await fetch(`/admin/bookings/${id}/outcome`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tour_outcome: 'Converted to Tenant' }),
      });
      if (res.ok) onUpdateBooking(id, { status: 'Completed', tour_outcome: 'Converted to Tenant' });
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">
            {format(date, 'EEEE, MMMM do, yyyy')}
          </h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
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
                  ${isBlocked ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'}
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

          <div>
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              Scheduled Tours <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs">{activeBookings.length}</span>
            </h4>

            {activeBookings.length === 0 ? (
              <p className="text-sm text-slate-500 italic py-4">No active tours scheduled for this day.</p>
            ) : (
              <div className="space-y-3">
                {activeBookings.map(booking => {
                  const isPending = booking.status === 'pending' || booking.status === 'Scheduled';
                  const isConfirmed = booking.status === 'confirmed';
                  const isCompleted = booking.status === 'Completed';
                  const isConverted = booking.tour_outcome === 'Converted to Tenant';
                  const isNoShow = booking.tour_outcome === 'No Show';

                  return (
                    <div key={booking.id} className="border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all bg-white">
                      {/* Header row: time + status badge */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-blue-500" />
                          {booking.time}
                        </div>
                        {isConverted ? (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-purple-100 text-purple-700">
                            <Home className="w-3 h-3" /> Tenant
                          </span>
                        ) : (
                          <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded ${
                            isCompleted ? 'bg-emerald-100 text-emerald-700' :
                            booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            isConfirmed ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {isNoShow ? 'No Show' : booking.status}
                          </span>
                        )}
                      </div>

                      {/* Booking info */}
                      <div className="space-y-1 mt-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <User className="w-4 h-4 text-slate-400" /> {booking.name}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <MapPin className="w-4 h-4 text-slate-400" /> {booking.building}
                        </div>
                      </div>

                      {/* ── ACTION BUTTONS ── */}

                      {/* PENDING: Confirm + Cancel */}
                      {isPending && (
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => handleConfirm(booking.id)}
                            disabled={updating === booking.id}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
                          </button>
                          <button
                            onClick={() => handleCancel(booking.id)}
                            disabled={updating === booking.id}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-all disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" /> Cancel
                          </button>
                        </div>
                      )}

                      {/* CONFIRMED: Showed Up + No Show + Cancel */}
                      {isConfirmed && !booking.tour_outcome && (
                        <div className="flex gap-2 mt-4 flex-wrap">
                          <button
                            onClick={() => handleShowedUp(booking.id)}
                            disabled={updating === booking.id}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Showed Up
                          </button>
                          <button
                            onClick={() => handleNoShow(booking.id)}
                            disabled={updating === booking.id}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-all disabled:opacity-50"
                          >
                            <UserX className="w-3.5 h-3.5" /> No Show
                          </button>
                          <button
                            onClick={() => handleCancel(booking.id)}
                            disabled={updating === booking.id}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-all disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" /> Cancel
                          </button>
                        </div>
                      )}

                      {/* COMPLETED (showed up) & not yet converted: Convert to Tenant */}
                      {(isCompleted || isConfirmed) && !booking.tour_outcome && isCompleted && (
                        <div className="mt-2">
                          <button
                            onClick={() => handleConvert(booking.id)}
                            disabled={updating === booking.id}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-all disabled:opacity-50"
                          >
                            <Home className="w-3.5 h-3.5" /> Convert to Tenant
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};