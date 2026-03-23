import React, { useState, useEffect } from "react";
import { format, addMonths, subMonths } from "date-fns";
import { MonthPicker } from "../../components/admin/MonthPicker";
import { CalendarGrid } from "../../components/admin/CalendarGrid";
import { DayDetailsModal } from "../../components/admin/DayDetailsModal";
import type { Booking, BlockedDate } from "../../types";
import { useAuth } from "../../contexts/AuthContext";

interface AdminUser {
  id: number;
  username: string;
}

const AdminCalendarPage: React.FC = () => {
  const { user } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [filterAdminId, setFilterAdminId] = useState<number | null>(null);

  // Set default filter to current user on mount
  useEffect(() => {
    if (user?.id) {
      setFilterAdminId(user.id);
    }
    fetchAdmins();
  }, [user]);

  // Re-fetch when filter changes
  useEffect(() => {
    fetchDashboardData(filterAdminId);
  }, [filterAdminId]);

  const fetchAdmins = async () => {
    try {
      const res = await fetch("/admin/users/", {
        headers: { Authorization: `Bearer ${localStorage.getItem("prism_token")}` },
      });
      if (res.ok) setAdmins(await res.json());
    } catch {}
  };

  const fetchDashboardData = async (adminId?: number | null) => {
    try {
      const bookingsUrl = adminId
        ? `/admin/bookings/?admin_id=${adminId}`
        : "/admin/bookings/";
      const blockedUrl = adminId
        ? `/admin/bookings/blocked-dates?admin_user_id=${adminId}`
        : "/admin/bookings/blocked-dates";

      const [bookingsRes, blockedRes] = await Promise.all([
        fetch(bookingsUrl),
        fetch(blockedUrl),
      ]);

      if (bookingsRes.ok) setBookings(await bookingsRes.json());
      if (blockedRes.ok) setBlockedDates(await blockedRes.json());
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    }
  };

  const handleUpdateBooking = (id: number, updates: Partial<Booking>) => {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleToggleBlock = async (date: Date, shouldBlock: boolean) => {
    const dateStr = format(date, "yyyy-MM-dd");

    try {
      if (shouldBlock) {
        const res = await fetch("/admin/bookings/blocked-dates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: dateStr,
            reason: "Admin blocked via calendar",
            admin_user_id: filterAdminId,
          }),
        });
        if (res.ok) {
          setBlockedDates((prev) => [...prev, { id: Date.now(), date: dateStr }]);
        }
      } else {
        const res = await fetch(
          `/admin/bookings/blocked-dates/${dateStr}?admin_user_id=${filterAdminId}`,
          { method: "DELETE" }
        );
        if (res.ok) {
          setBlockedDates((prev) => prev.filter((b) => b.date !== dateStr));
        }
      }
    } catch (err) {
      console.error("Failed to update block status", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Availability Calendar</h1>
            <p className="text-slate-500 mt-1">Manage tour availability and view daily schedules.</p>

            {/* View as filter */}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm text-slate-500 font-medium">View as:</span>
              <select
                value={filterAdminId ?? ""}
                onChange={(e) => setFilterAdminId(e.target.value ? Number(e.target.value) : null)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 shadow-sm"
              >
                <option value="">All agents</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>{a.username}</option>
                ))}
              </select>
            </div>
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
            bookings={bookings.filter((b) => b.date === format(selectedDate, "yyyy-MM-dd"))}
            isBlocked={blockedDates.some((b) => b.date === format(selectedDate, "yyyy-MM-dd"))}
            onClose={() => setIsModalOpen(false)}
            onToggleBlock={handleToggleBlock}
            onUpdateBooking={handleUpdateBooking}
          />
        )}
      </main>
    </div>
  );
};

export default AdminCalendarPage;