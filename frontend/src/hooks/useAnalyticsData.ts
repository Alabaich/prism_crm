import { useState, useMemo, useEffect } from "react";
import axios from "axios";
import type { Lead, DateRange, OverlapGroup } from "../types";

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

export function useAnalyticsData() {
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [previousLeadsCount, setPreviousLeadsCount] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAllAnalyticsData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          start_date: dateRange.start,
          end_date: dateRange.end,
          limit: "5000",
          skip: "0",
        });

        const startMs = new Date(dateRange.start).getTime();
        const endMs = new Date(dateRange.end).getTime();
        const rangeMs = endMs - startMs;

        const prevEnd = new Date(startMs - 1).toISOString().split("T")[0];
        const prevStart = new Date(startMs - rangeMs - 1).toISOString().split("T")[0];

        const prevParams = new URLSearchParams({
          start_date: prevStart,
          end_date: prevEnd,
          limit: "5000",
          skip: "0",
        });

        const [leadsRes, bookingsRes, prevLeadsRes] = await Promise.all([
          axios.get(`/get_leads/?${params.toString()}`),
          axios.get(`/admin/bookings/`),
          axios.get(`/get_leads/?${prevParams.toString()}`),
        ]);

        setAllLeads(leadsRes.data);
        setAllBookings(bookingsRes.data);
        setPreviousLeadsCount(prevLeadsRes.data.length);
      } catch (error) {
        console.error("Failed to fetch analytics data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllAnalyticsData();
  }, [dateRange]);

  const analytics = useMemo(() => {
    const leadsByDate: Record<string, number> = {};
    const uniqueLeadsBySource: Record<string, Set<string>> = {};
    const totalLeadsBySource: Record<string, number> = {};
    const emailToSources: Record<string, string[]> = {};
    const emailToLeads: Record<string, Lead[]> = {};
    const bookingsBySource: Record<string, number> = {};
    const tenantsBySource: Record<string, number> = {};

    let totalToursWithinRange = 0;
    let totalTenantsWithinRange = 0;
    let totalShowedUpWithinRange = 0;

    allLeads.forEach((lead) => {
      const dateLabel = new Date(lead.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      leadsByDate[dateLabel] = (leadsByDate[dateLabel] || 0) + 1;

      const source = lead.source || "Direct / Website";

      if (!uniqueLeadsBySource[source]) {
        uniqueLeadsBySource[source] = new Set();
        totalLeadsBySource[source] = 0;
      }
      if (lead.email) uniqueLeadsBySource[source].add(lead.email);
      totalLeadsBySource[source]++;

      if (lead.email) {
        if (!emailToSources[lead.email]) emailToSources[lead.email] = [];
        if (!emailToSources[lead.email].includes(source))
          emailToSources[lead.email].push(source);
        if (!emailToLeads[lead.email]) emailToLeads[lead.email] = [];
        emailToLeads[lead.email].push(lead);
      }

      if (lead.status === "Tenant") totalTenantsWithinRange++;
    });

    // Analytics only count tours — meetings are excluded
    const tourBookings = allBookings.filter(
      (b) => !b.booking_type || b.booking_type === "tour"
    );

    tourBookings.forEach((booking) => {
      if (!booking.date) return;
      const bookingDate = new Date(booking.date).toISOString().split("T")[0];

      if (bookingDate >= dateRange.start && bookingDate <= dateRange.end) {
        const source = booking.source || "Direct / Website";
        bookingsBySource[source] = (bookingsBySource[source] || 0) + 1;
        totalToursWithinRange++;

        if (
          booking.status === "Completed" &&
          booking.tour_outcome !== "No Show"
        ) {
          totalShowedUpWithinRange++;
        }

        if (booking.tour_outcome === "Converted to Tenant") {
          tenantsBySource[source] = (tenantsBySource[source] || 0) + 1;
        }
      }
    });

    const tourConversionData = Object.keys(totalLeadsBySource)
      .filter((source) => source !== "Tour Booking App")
      .map((source) => {
        const totalLeads = totalLeadsBySource[source] || 0;
        const bookedTours = bookingsBySource[source] || 0;
        const conversionRate =
          totalLeads > 0 ? Math.round((bookedTours / totalLeads) * 100) : 0;
        return { label: source, conversionRate, totalLeads, bookedTours };
      })
      .sort((a, b) => b.conversionRate - a.conversionRate);

    const tenantConversionData = Object.keys(bookingsBySource)
      .filter((source) => source !== "Tour Booking App")
      .map((source) => {
        const totalTours = bookingsBySource[source] || 0;
        const convertedTenants = tenantsBySource[source] || 0;
        const conversionRate =
          totalTours > 0
            ? Math.round((convertedTenants / totalTours) * 100)
            : 0;
        return { label: source, conversionRate, totalTours, convertedTenants };
      })
      .sort((a, b) => b.conversionRate - a.conversionRate);

    const funnelData = {
      totalLeads: allLeads.length,
      totalTours: totalToursWithinRange,
      totalShowedUp: totalShowedUpWithinRange,
      totalTenants: totalTenantsWithinRange,
    };

    const chartData = Object.entries(leadsByDate)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => new Date(a.label).getTime() - new Date(b.label).getTime());

    let duplicatesCount = 0;
    const overlapMatrix: Record<string, number> = {};

    Object.values(emailToSources).forEach((sources) => {
      if (sources.length > 1) {
        duplicatesCount++;
        for (let i = 0; i < sources.length; i++) {
          for (let j = i + 1; j < sources.length; j++) {
            const pair = [sources[i], sources[j]].sort().join(" & ");
            overlapMatrix[pair] = (overlapMatrix[pair] || 0) + 1;
          }
        }
      }
    });

    const overlappingGroups = Object.entries(emailToLeads)
      .filter(([, leads]) => new Set(leads.map((l) => l.source)).size > 1)
      .map(([email, leads]) => ({ email, leads }));

    const platformStats = Object.keys(uniqueLeadsBySource)
      .map((source) => ({
        source,
        uniqueCount: uniqueLeadsBySource[source].size,
        totalCount: totalLeadsBySource[source],
        efficiency:
          totalLeadsBySource[source] > 0
            ? Math.round(
                (uniqueLeadsBySource[source].size / totalLeadsBySource[source]) * 100
              )
            : 0,
      }))
      .sort((a, b) => b.totalCount - a.totalCount);

    const topSources = platformStats.slice(0, 4);
    const otherSources = platformStats.slice(4);

    const pieChartData = topSources.map((stat, index) => ({
      label: stat.source,
      value: stat.totalCount,
      color: PIE_COLORS[index % PIE_COLORS.length],
    }));

    if (otherSources.length > 0) {
      pieChartData.push({
        label: "Others",
        value: otherSources.reduce((sum, item) => sum + item.totalCount, 0),
        color: "#94a3b8",
      });
    }

    const overlapStats = Object.entries(overlapMatrix)
      .map(([pair, count]) => ({ pair, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalLeads: allLeads.length,
      uniquePeople: Object.keys(emailToSources).length,
      duplicatesCount,
      platformStats,
      overlapStats,
      chartData,
      pieChartData,
      overlappingGroups,
      tourConversionData,
      tenantConversionData,
      funnelData,
    };
  }, [allLeads, allBookings, dateRange]);

  const growthPercentage = useMemo(() => {
    if (previousLeadsCount === null || previousLeadsCount === 0) return null;
    return Math.round(
      ((analytics.totalLeads - previousLeadsCount) / previousLeadsCount) * 100
    );
  }, [analytics.totalLeads, previousLeadsCount]);

  return { dateRange, setDateRange, loading, analytics, growthPercentage };
}