import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  Tag,
  Home,
  CheckCircle2,
  UserX,
  CalendarIcon,
  Search,
  X,
  Coffee,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const Header: React.FC<{ currentView?: string }> = ({ currentView }) => (
  <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between shadow-sm">
    <div className="font-bold text-zinc-800 text-lg">
      Prism Property Management
    </div>
    <div className="text-sm font-medium text-zinc-500 bg-zinc-100 px-3 py-1 rounded-md">
      Admin View
    </div>
  </header>
);

interface Booking {
  id: number;
  name: string;
  email: string;
  phone?: string;
  building: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "cancelled" | "Completed";
  tour_outcome?: string;
  booking_type?: "tour" | "meeting";
  created_at: string;
  source?: string;
}

type TypeFilter = "tour" | "all";
type StatusFilter = "active" | "all";

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("tour");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<number | null>(null);

  const filteredBookings = bookings.filter((b) => {
    // Type filter — "tour" hides meetings, "all" shows everything
    if (typeFilter === "tour" && b.booking_type === "meeting") return false;

    // Status filter — "active" hides cancelled and past bookings
    if (statusFilter === "active") {
      if (b.status === "cancelled") return false;
      const bookingDate = new Date(b.date + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (bookingDate < today) return false;
    }

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      b.name?.toLowerCase().includes(q) ||
      b.email?.toLowerCase().includes(q) ||
      b.building?.toLowerCase().includes(q) ||
      b.date?.includes(q)
    );
  });

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await fetch("/admin/bookings/");
      if (!res.ok) throw new Error("Failed to fetch bookings");
      const data = await res.json();
      setBookings(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (
    id: number,
    status: "confirmed" | "cancelled" | "Completed"
  ) => {
    setUpdating(id);
    try {
      const res = await fetch(`/admin/bookings/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status } : b))
      );
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleOutcomeChange = async (id: number, outcome: string) => {
    setUpdating(id);
    try {
      const res = await fetch(`/admin/bookings/${id}/outcome`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tour_outcome: outcome }),
      });
      if (!res.ok) throw new Error("Failed to update outcome");
      setBookings((prev) =>
        prev.map((b) =>
          b.id === id ? { ...b, tour_outcome: outcome, status: "Completed" } : b
        )
      );
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header currentView="admin" />
        <div className="flex-1 flex items-center justify-center text-slate-500 font-medium animate-pulse">
          Loading bookings...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header currentView="admin" />
        <div className="flex-1 flex items-center justify-center text-red-500 font-medium">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col font-sans">
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
        <div className="mx-auto">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Tours & Bookings
              </h1>
              <p className="text-slate-500 mt-1">
                Manage tours and meetings for 80/100 Bond St E.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by name, email, building..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition text-sm bg-white w-72 shadow-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4">
                {/* Tours only checkbox */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={typeFilter === "tour"}
                    onChange={(e) => setTypeFilter(e.target.checked ? "tour" : "all")}
                    className="w-4 h-4 rounded border-slate-300 accent-zinc-900 cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-slate-700">Show only tours</span>
                </label>

                {/* Active only checkbox */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={statusFilter === "active"}
                    onChange={(e) => setStatusFilter(e.target.checked ? "active" : "all")}
                    className="w-4 h-4 rounded border-slate-300 accent-zinc-900 cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-slate-700">Show only active</span>
                </label>

                {/* Count badge */}
                <div className="bg-white px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm text-sm font-bold text-slate-700 flex items-center gap-2">
                  {typeFilter === "tour" ? "Tours" : "Total"}
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">
                    {filteredBookings.length}
                  </span>
                </div>

                <button
                  onClick={() => navigate("/booking")}
                  className="bg-zinc-900 text-white px-5 py-2.5 rounded-xl border border-zinc-700 shadow-sm text-sm font-bold hover:bg-zinc-800 transition-colors flex items-center gap-2"
                >
                  <CalendarIcon className="w-4 h-4" />
                  Book a Tour
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Building</th>
                    <th className="px-6 py-4">Visitor Details</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Source</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Outcome</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-12 text-center text-slate-500 italic"
                      >
                        {searchTerm
                          ? `No bookings match "${searchTerm}".`
                          : statusFilter === "active"
                          ? "No active bookings. Click 'All' to see cancelled ones."
                          : "No bookings found."}
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((booking) => {
                      const isMeeting = booking.booking_type === "meeting";
                      return (
                        <tr
                          key={booking.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isMeeting ? "bg-amber-50/30" : ""
                          }`}
                        >
                          {/* Date & Time */}
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-800 flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-blue-500" />
                              {booking.date
                                ? format(
                                    new Date(booking.date + "T00:00:00"),
                                    "MMM d, yyyy"
                                  )
                                : "No Date"}
                            </div>
                            <div className="text-slate-500 mt-1.5 flex items-center gap-2 font-medium">
                              <Clock className="w-4 h-4 text-amber-500" />
                              {booking.time || "No Time"}
                            </div>
                          </td>

                          {/* Building */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-slate-700 font-medium">
                              <MapPin className="w-4 h-4 text-emerald-500" />
                              {booking.building}
                            </div>
                          </td>

                          {/* Visitor Details */}
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-800 flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-400" />
                              {booking.name}
                            </div>
                            <div className="text-slate-500 mt-1.5 flex items-center gap-2">
                              <Mail className="w-4 h-4 text-slate-400" />
                              <a
                                href={`mailto:${booking.email}`}
                                className="hover:text-blue-600 transition-colors"
                              >
                                {booking.email}
                              </a>
                            </div>
                            {booking.phone && (
                              <div className="text-slate-500 mt-1.5 flex items-center gap-2">
                                <Phone className="w-4 h-4 text-slate-400" />
                                <a
                                  href={`tel:${booking.phone}`}
                                  className="hover:text-blue-600 transition-colors"
                                >
                                  {booking.phone}
                                </a>
                              </div>
                            )}
                          </td>

                          {/* Type badge */}
                          <td className="px-6 py-4">
                            {isMeeting ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Coffee className="w-3.5 h-3.5" />
                                Meeting
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                <CalendarIcon className="w-3.5 h-3.5" />
                                Tour
                              </span>
                            )}
                          </td>

                          {/* Source */}
                          <td className="px-6 py-4">
                            {(!booking.source ||
                              booking.source !== "Tour Booking App") && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                <Tag className="w-3.5 h-3.5" />
                                {booking.source || "Direct / Website"}
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide ${
                                booking.status === "confirmed" ||
                                booking.status === "Completed"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : booking.status === "cancelled"
                                  ? "bg-red-100 text-red-800 border border-red-200"
                                  : "bg-amber-100 text-amber-800 border border-amber-200"
                              }`}
                            >
                              {booking.status === "cancelled" ? (
                                <X className="w-3 h-3" />
                              ) : booking.status === "confirmed" ||
                                booking.status === "Completed" ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : null}
                              {booking.status}
                            </span>
                          </td>

                          {/* Outcome — tours only */}
                          <td className="px-6 py-4">
                            {isMeeting ? (
                              <span className="text-slate-400 text-xs italic">—</span>
                            ) : booking.tour_outcome ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                <Home className="w-3.5 h-3.5" />
                                {booking.tour_outcome}
                              </span>
                            ) : booking.status === "confirmed" ||
                              booking.status === "Completed" ? (
                              <button
                                onClick={() =>
                                  handleOutcomeChange(
                                    booking.id,
                                    "Converted to Tenant"
                                  )
                                }
                                disabled={updating === booking.id}
                                className="flex items-center gap-1.5 text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
                              >
                                <Home className="w-3.5 h-3.5" />
                                Convert
                              </button>
                            ) : (
                              <span className="text-slate-400 text-xs italic">
                                Awaiting Tour
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 flex-wrap">
                              {/* Confirm — both */}
                              {booking.status !== "confirmed" &&
                                booking.status !== "Completed" && (
                                  <button
                                    onClick={() =>
                                      handleStatusChange(booking.id, "confirmed")
                                    }
                                    disabled={updating === booking.id}
                                    className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-sm"
                                  >
                                    Confirm
                                  </button>
                                )}

                              {/* Showed Up + No Show — tours only */}
                              {!isMeeting &&
                                booking.status === "confirmed" &&
                                !booking.tour_outcome && (
                                  <>
                                    <button
                                      onClick={() =>
                                        handleStatusChange(
                                          booking.id,
                                          "Completed"
                                        )
                                      }
                                      disabled={updating === booking.id}
                                      className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-sm flex items-center gap-1.5"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />{" "}
                                      Showed Up
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleOutcomeChange(
                                          booking.id,
                                          "No Show"
                                        )
                                      }
                                      disabled={updating === booking.id}
                                      className="text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-sm flex items-center gap-1.5"
                                    >
                                      <UserX className="w-3.5 h-3.5" /> No Show
                                    </button>
                                  </>
                                )}

                              {/* Cancel — both */}
                              {booking.status !== "cancelled" && (
                                <button
                                  onClick={() =>
                                    handleStatusChange(booking.id, "cancelled")
                                  }
                                  disabled={updating === booking.id}
                                  className="text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-sm"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPage;