import React, { useState, useEffect, useMemo } from 'react';
import { 
  format, addMonths, subMonths } from 'date-fns';
import { MonthPicker } from '../../components/admin/MonthPicker';
import { CalendarGrid } from '../../components/admin/CalendarGrid';
import { DayDetailsModal } from '../../components/admin/DayDetailsModal';
import type { Booking, BlockedDate } from '../../types';

const Header: React.FC<{ currentView?: string }> = ({ currentView }) => (
  <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between shadow-sm">
    <div className="font-bold text-zinc-800 text-lg">Prism Property Management</div>
    <div className="text-sm font-medium text-zinc-500 bg-zinc-100 px-3 py-1 rounded-md">
      {currentView}
    </div>
  </header>
);

const AdminCalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [bookingsRes, blockedRes] = await Promise.all([
        fetch('/admin/bookings/'),
        fetch('/admin/bookings/blocked-dates')
      ]);

      if (bookingsRes.ok) setBookings(await bookingsRes.json());
      if (blockedRes.ok) setBlockedDates(await blockedRes.json());
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    }
  };

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleToggleBlock = async (date: Date, shouldBlock: boolean) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    try {
      if (shouldBlock) {
        const res = await fetch('/admin/bookings/blocked-dates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateStr, reason: 'Admin blocked via calendar' })
        });
        if (res.ok) {
          // Optimistically update UI
          setBlockedDates(prev => [...prev, { id: Date.now(), date: dateStr }]);
        }
      } else {
        const res = await fetch(`/admin/bookings/blocked-dates/${dateStr}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          // Optimistically update UI
          setBlockedDates(prev => prev.filter(b => b.date !== dateStr));
        }
      }
    } catch (err) {
      console.error('Failed to update block status', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header currentView="Calendar Admin" />
      
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Availability Calendar</h1>
            <p className="text-slate-500 mt-1">Manage tour availability and view daily schedules.</p>
          </div>
        </div>

        <div className="shadow-sm rounded-2xl overflow-hidden border border-slate-200">
          <MonthPicker 
            currentDate={currentDate} 
            onPrevMonth={handlePrevMonth} 
            onNextMonth={handleNextMonth} 
          />
          <CalendarGrid 
            currentDate={currentDate}
            bookings={bookings}
            blockedDates={blockedDates}
            onDateClick={handleDateClick}
          />
        </div>

        {isModalOpen && selectedDate && (
          <DayDetailsModal
            date={selectedDate}
            bookings={bookings.filter(b => b.date === format(selectedDate, 'yyyy-MM-dd'))}
            isBlocked={blockedDates.some(b => b.date === format(selectedDate, 'yyyy-MM-dd'))}
            onClose={() => setIsModalOpen(false)}
            onToggleBlock={handleToggleBlock}
          />
        )}
      </main>
    </div>
  );
};

export default AdminCalendarPage;