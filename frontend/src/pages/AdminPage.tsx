import React from 'react';

const AdminPage: React.FC = () => {
  return (
    <div className="w-full p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Dashboard Overview</h2>
        <p className="text-slate-500">Manage your CRM data and properties here.</p>
      </div>
      
      {/* Overview content like daily tasks, recent bookings, etc. goes here */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-slate-500">
        <p>Main Admin content goes here...</p>
      </div>
    </div>
  );
};

export default AdminPage;
