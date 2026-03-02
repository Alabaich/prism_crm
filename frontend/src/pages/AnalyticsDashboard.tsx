import { useState } from "react";
import { useAnalyticsData } from "../hooks/useAnalyticsData";
import { AnalyticsHeader } from "../components/AnalyticsHeader";
import { KPICards } from "../components/KPICards";
import { LeadsTrendChart } from "../components/LeadsTrendChart";
import { PlatformPerformance } from "../components/PlatformPerformance";
import { SourcePieChart } from "../components/SourcePieChart";
import { OverlapSummary } from "../components/OverlapSummary";
import { OverlapModal } from "../components/OverlapModal";

export default function AnalyticsDashboard({ onSourceClick }: { onSourceClick?: (source: string) => void }) {
  const { dateRange, setDateRange, loading, analytics, growthPercentage } = useAnalyticsData();
  const [isOverlapModalOpen, setIsOverlapModalOpen] = useState<boolean>(false);

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
          {analytics.chartData.length > 1 ? (
            <LeadsTrendChart 
              data={analytics.chartData} 
              totalValue={analytics.totalLeads} 
              percentage={growthPercentage} 
            />
          ) : (
            <div className="w-full mb-8 p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
              Not enough data to display trend chart.
            </div>
          )}

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
              onSliceClick={onSourceClick} 
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