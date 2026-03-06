import React from "react";
import { Users, CalendarCheck, Home, ArrowRight, TrendingUp } from "lucide-react";

export interface FunnelData {
  totalLeads: number;
  totalTours: number;
  totalTenants: number;
}

interface ConversionFunnelProps {
  data?: FunnelData;
}

export const ConversionFunnel: React.FC<ConversionFunnelProps> = ({ data }) => {
  // Safe calculations to avoid dividing by zero
  const safeData = data || { totalLeads: 0, totalTours: 0, totalTenants: 0 };
  const tourRate = safeData.totalLeads > 0 ? Math.round((safeData.totalTours / safeData.totalLeads) * 100) : 0;
  const tenantRate = safeData.totalTours > 0 ? Math.round((safeData.totalTenants / safeData.totalTours) * 100) : 0;
  const overallRate = safeData.totalLeads > 0 ? Math.round((safeData.totalTenants / safeData.totalLeads) * 100) : 0;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm w-full">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Pipeline Conversion</h2>
          <p className="text-sm text-slate-500 mt-1">Lead to Tenant journey overview</p>
        </div>
        <div className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          {overallRate}% Overall Close Rate
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
        {/* Stage 1: Leads */}
        <div className="flex-1 w-full bg-blue-50 border border-blue-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center relative group hover:bg-blue-100 transition-colors">
          <div className="bg-blue-200/50 p-3 rounded-xl mb-3 text-blue-600">
            <Users className="w-6 h-6" />
          </div>
          <span className="text-3xl font-black text-slate-800">{safeData.totalLeads}</span>
          <span className="text-sm font-bold text-blue-700 uppercase tracking-wide mt-1">Total Leads</span>
        </div>

        {/* Arrow 1 */}
        <div className="flex flex-col items-center justify-center -my-2 md:my-0 z-10">
          <div className="bg-white border border-slate-200 shadow-sm rounded-full px-3 py-1 text-xs font-bold text-slate-500 mb-1">
            {tourRate}% Booked
          </div>
          <ArrowRight className="w-6 h-6 text-slate-300 hidden md:block" />
        </div>

        {/* Stage 2: Tours */}
        <div className="flex-1 w-full bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center relative group hover:bg-indigo-100 transition-colors">
          <div className="bg-indigo-200/50 p-3 rounded-xl mb-3 text-indigo-600">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <span className="text-3xl font-black text-slate-800">{safeData.totalTours}</span>
          <span className="text-sm font-bold text-indigo-700 uppercase tracking-wide mt-1">Tours Booked</span>
        </div>

        {/* Arrow 2 */}
        <div className="flex flex-col items-center justify-center -my-2 md:my-0 z-10">
          <div className="bg-white border border-slate-200 shadow-sm rounded-full px-3 py-1 text-xs font-bold text-slate-500 mb-1">
            {tenantRate}% Converted
          </div>
          <ArrowRight className="w-6 h-6 text-slate-300 hidden md:block" />
        </div>

        {/* Stage 3: Tenants */}
        <div className="flex-1 w-full bg-purple-50 border border-purple-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center relative group hover:bg-purple-100 transition-colors">
          <div className="bg-purple-200/50 p-3 rounded-xl mb-3 text-purple-600">
            <Home className="w-6 h-6" />
          </div>
          <span className="text-3xl font-black text-slate-800">{safeData.totalTenants}</span>
          <span className="text-sm font-bold text-purple-700 uppercase tracking-wide mt-1">New Tenants</span>
        </div>
      </div>
    </div>
  );
};