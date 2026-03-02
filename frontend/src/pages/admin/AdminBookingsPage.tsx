import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, MapPin, User, Mail, Phone, CheckCircle, XCircle, AlertCircle, Tag } from 'lucide-react';

// Inline Header to ensure compilation in standalone mode
const Header: React.FC<{ currentView?: string }> = ({ currentView }) => (
  <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between shadow-sm">
    <div className="font-bold text-zinc-800 text-lg">Prism Property Management</div>
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
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
  source?: string;
}

const AdminPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<number | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      // Fetching from the new separated admin endpoint
      const res = await fetch('http://localhost:8000/admin/bookings/');
      if (!res.ok) throw new Error('Failed to fetch bookings');
      const data = await res.json();
      setBookings(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: number, status: 'confirmed' | 'cancelled') => {
    setUpdating(id);
    try {
      // Updating status via the admin endpoint
      const res = await fetch(`http://localhost:8000/admin/bookings/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
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
              <h1 className="text-3xl font-bold text-slate-900">Tours Dashboard</h1>
              <p className="text-slate-500 mt-1">Manage upcoming tours for 80/100 Bond St E.</p>
            </div>
            <div className="bg-white px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm text-sm font-bold text-slate-700 flex items-center gap-2">
              Total Bookings
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">
                {bookings.length}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Building</th>
                    <th className="px-6 py-4">Visitor Details</th>
                    <th className="px-6 py-4">Source</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                        No bookings found.
                      </td>
                    </tr>
                  ) : (
                    bookings.map(booking => (
                      <tr key={booking.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-500" />
                            {booking.date ? format(new Date(booking.date), 'MMM d, yyyy') : 'No Date'}
                          </div>
                          <div className="text-slate-500 mt-1.5 flex items-center gap-2 font-medium">
                            <Clock className="w-4 h-4 text-amber-500" />
                            {booking.time || 'No Time'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-700 font-medium">
                            <MapPin className="w-4 h-4 text-emerald-500" />
                            {booking.building}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            {booking.name}
                          </div>
                          <div className="text-slate-500 mt-1.5 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-slate-400" />
                            <a href={`mailto:${booking.email}`} className="hover:text-blue-600 transition-colors">
                              {booking.email}
                            </a>
                          </div>
                          {booking.phone && (
                            <div className="text-slate-500 mt-1.5 flex items-center gap-2">
                              <Phone className="w-4 h-4 text-slate-400" />
                              <a href={`tel:${booking.phone}`} className="hover:text-blue-600 transition-colors">
                                {booking.phone}
                              </a>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {(!booking.source || booking.source !== 'Tour Booking App') && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              <Tag className="w-3.5 h-3.5" />
                              {booking.source || 'Direct / Website'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide ${
                            booking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            booking.status === 'cancelled' ? 'bg-red-100 text-red-800 border border-red-200' :
                            'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {booking.status === 'confirmed' && <CheckCircle className="w-3.5 h-3.5" />}
                            {booking.status === 'cancelled' && <XCircle className="w-3.5 h-3.5" />}
                            {booking.status === 'pending' && <AlertCircle className="w-3.5 h-3.5" />}
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {booking.status !== 'confirmed' && (
                              <button
                                onClick={() => handleStatusChange(booking.id, 'confirmed')}
                                disabled={updating === booking.id}
                                className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-sm"
                              >
                                Confirm
                              </button>
                            )}
                            {booking.status !== 'cancelled' && (
                              <button
                                onClick={() => handleStatusChange(booking.id, 'cancelled')}
                                disabled={updating === booking.id}
                                className="text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-sm"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
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