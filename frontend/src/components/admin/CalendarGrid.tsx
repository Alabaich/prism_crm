import React from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { Lock } from 'lucide-react';
import type { BlockedDate, Booking } from '../../types';

interface CalendarGridProps {
  currentDate: Date;
  bookings: Booking[];
  blockedDates: BlockedDate[];
  onDateClick: (date: Date) => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({ currentDate, bookings, blockedDates, onDateClick }) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-b-2xl border-x border-b border-slate-200 shadow-sm overflow-hidden">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {weekDays.map(day => (
          <div key={day} className="py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Cells */}
      <div className="grid grid-cols-7 bg-slate-200 gap-px">
        {calendarDays.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayBookings = bookings.filter(b => b.date === dateStr && b.status !== 'cancelled');
          const isBlocked = blockedDates.some(b => b.date === dateStr);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toString()}
              onClick={() => onDateClick(day)}
              className={`min-h-[120px] bg-white p-2 sm:p-3 transition-colors cursor-pointer flex flex-col
                ${!isCurrentMonth ? 'bg-slate-50 text-slate-400' : 'text-slate-800'}
                ${isBlocked ? 'bg-slate-50/80 cursor-not-allowed' : 'hover:bg-blue-50/30'}
              `}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                  ${isToday ? 'bg-blue-600 text-white shadow-sm' : ''}
                  ${!isToday && !isCurrentMonth ? 'text-slate-400' : ''}
                `}>
                  {format(day, 'd')}
                </span>
                {isBlocked && <Lock className="w-3.5 h-3.5 text-slate-400 mt-1.5 mr-1" />}
              </div>

              <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
                {isBlocked ? (
                  <div className="text-xs font-medium bg-slate-200 text-slate-600 px-2 py-1 rounded truncate">
                    Blocked
                  </div>
                ) : dayBookings.length > 0 ? (
                  <div className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200 truncate">
                    {dayBookings.length} Tour{dayBookings.length > 1 ? 's' : ''}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
