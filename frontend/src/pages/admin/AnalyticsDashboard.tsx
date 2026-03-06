import { useState } from "react";
import { useNavigate } from "react-router-dom"; // Added for navigation
import { useAnalyticsData } from "../../hooks/useAnalyticsData";
import { AnalyticsHeader } from "../../components/admin/AnalyticsHeader";
import { KPICards } from "../../components/admin/KPICards";
import { LeadsTrendChart } from "../../components/admin/LeadsTrendChart";
import { PlatformPerformance } from "../../components/admin/PlatformPerformance";
import { SourcePieChart } from "../../components/admin/SourcePieChart";
import { OverlapSummary } from "../../components/admin/OverlapSummary";
import { OverlapModal } from "../../components/admin/OverlapModal";
import { TourConversionChart } from "../../components/admin/tourConversionChart";
import { TenantConversionChart } from "../../components/admin/TenantConversionChart";
import { ConversionFunnel } from "../../components/admin/ConversionFunnel";

export default function AnalyticsDashboard() {
  const navigate = useNavigate(); // Hook to handle redirection
  const { dateRange, setDateRange, loading, analytics, growthPercentage } = useAnalyticsData();
  const [isOverlapModalOpen, setIsOverlapModalOpen] = useState<boolean>(false);

  /**
   * Handles clicking a source in the Pie Chart.
   * Redirects to the Admin Overview page with a URL parameter.
   */
  const handleSourceClick = (source: string) => {
    // Encodes the source (e.g., "Google Ads") to safely pass it in the URL
    navigate(`/admin?source=${encodeURIComponent(source)}`);
  };

  return (
    <div className="w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8 font-sans text-slate-900 bg-slate-50 min-h-screen">
      
      <AnalyticsHeader 
        dateRange={dateRange} 
        setDateRange={setDateRange} 
        loading={loading} 
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
          <div className="col-span-1 md:col-span-3 h-64 bg-slate-200/50 rounded-2xl mb-8"></div>
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-slate-200/50 rounded-2xl"></div>)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Top-of-Funnel acquisition */}
            {analytics.chartData.length > 1 ? (
              <LeadsTrendChart 
                data={analytics.chartData} 
                totalValue={analytics.totalLeads} 
                percentage={growthPercentage} 
              />
            ) : (
              <div className="w-full p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
                Not enough data to display trend chart.
              </div>
            )}

            {/* Bottom-of-Funnel conversion */}
            <TourConversionChart data={analytics.tourConversionData} />

              <ConversionFunnel data={analytics.funnelData} />
              <TenantConversionChart data={analytics.tenantConversionData} />
          </div>

          <KPICards 
            totalLeads={analytics.totalLeads} 
            uniquePeople={analytics.uniquePeople} 
            duplicatesCount={analytics.duplicatesCount} 
            onOpenOverlapModal={() => setIsOverlapModalOpen(true)} 
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <PlatformPerformance 
              platformStats={analytics.platformStats} 
              totalLeads={analytics.totalLeads} 
            />
            <SourcePieChart 
              data={analytics.pieChartData} 
              onSliceClick={handleSourceClick} // Pass the navigation handler here
            />
          </div>

          <OverlapSummary 
            overlapStats={analytics.overlapStats} 
          />
        </>
      )}

      <OverlapModal 
        isOpen={isOverlapModalOpen}
        onClose={() => setIsOverlapModalOpen(false)}
        overlappingGroups={analytics.overlappingGroups}
      />
      
    </div>
  );
}