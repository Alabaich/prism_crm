import React from 'react';

const AdminView: React.FC = () => {
  return (
    <div className="w-full px-8 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Dashboard Overview</h2>
        <p className="text-slate-500">Manage your CRM data and properties here.</p>
      </div>

      <div className="grid w-full gap-6 grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-700">Total Bookings</h3>
          <p className="mt-2 text-3xl font-bold text-blue-600">142</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-700">Revenue</h3>
          <p className="mt-2 text-3xl font-bold text-emerald-600">$12,450</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-700">System Status</h3>
          <p className="mt-2 text-3xl font-bold text-indigo-600">Online</p>
        </div>
      </div>
    </div>
  );
};

export default AdminView;