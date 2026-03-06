import React from "react";
import { Calendar as CalendarIcon, Loader2, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import type { DateRange } from "../types";
import { 
  DateRangePicker, 
  Group, 
  DateInput, 
  DateSegment, 
  Button, 
  Popover, 
  Dialog, 
  RangeCalendar, 
  CalendarGrid, 
  CalendarGridHeader, 
  CalendarHeaderCell, 
  CalendarGridBody, 
  CalendarCell, 
  Heading 
} from 'react-aria-components';
import type { RangeValue } from "@react-types/shared";
import { CalendarDate, parseDate } from "@internationalized/date"; // Added parseDate import

interface AnalyticsHeaderProps {
  dateRange: DateRange;
  setDateRange: React.Dispatch<React.SetStateAction<DateRange>>;
  loading: boolean;
}

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({ dateRange, setDateRange, loading }) => {
  
  // FIXED: Safely parse the "YYYY-MM-DD" string state into React Aria's CalendarDate format.
  // We check if BOTH start and end exist. If they do, we return the strict object type.
  // If not, we return null to perfectly satisfy React Aria's expected type.
  const ariaDateRange = (dateRange.start && dateRange.end) 
    ? {
        start: parseDate(dateRange.start),
        end: parseDate(dateRange.end)
      } 
    : null;

  // Convert React Aria's format back to "YYYY-MM-DD" strings for your parent component
  const handleRangeChange = (range: any) => {
    setDateRange({
      start: range?.start ? range.start.toString() : "",
      end: range?.end ? range.end.toString() : ""
    });
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6 border-b border-slate-200 pb-6 pt-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Analytics Dashboard</h1>
        <p className="text-slate-500 mt-1">Cross-platform performance & lead overlap analysis</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
        
        {/* React Aria Date Range Picker */}
        <DateRangePicker 
          value={ariaDateRange} 
          onChange={handleRangeChange}
          className="flex items-center px-1"
        >
          <Group className="flex items-center transition-all">
            <div className="flex items-center px-3 py-1.5 border-r border-slate-100 hidden sm:flex">
              <CalendarIcon className="w-4 h-4 text-slate-400 mr-2" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Range</span>
            </div>

            <div className="flex items-center px-3">
              <DateInput slot="start" className="flex text-sm font-medium text-slate-700">
                {(segment) => (
                  <DateSegment 
                    segment={segment} 
                    className="px-0.5 outline-none rounded focus:bg-slate-100 focus:text-slate-900 caret-transparent data-[placeholder]:text-slate-400" 
                  />
                )}
              </DateInput>
              <span aria-hidden="true" className="px-2 text-slate-300 text-sm font-medium">—</span>
              <DateInput slot="end" className="flex text-sm font-medium text-slate-700">
                {(segment) => (
                  <DateSegment 
                    segment={segment} 
                    className="px-0.5 outline-none rounded focus:bg-slate-100 focus:text-slate-900 caret-transparent data-[placeholder]:text-slate-400" 
                  />
                )}
              </DateInput>
            </div>
            
            <Button className="p-1.5 ml-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 outline-none transition-colors">
              <CalendarIcon className="w-4 h-4" />
            </Button>
          </Group>

          {/* Popover Calendar UI */}
          <Popover className="bg-white border border-slate-200 shadow-xl rounded-2xl p-4 overflow-auto z-50 mt-2 font-sans">
            <Dialog className="outline-none">
              <RangeCalendar>
                <header className="flex items-center justify-between pb-4 w-full">
                  <Button slot="previous" className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 outline-none">
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Heading className="text-sm font-bold text-slate-800 tracking-wide" />
                  <Button slot="next" className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 outline-none">
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </header>
                <CalendarGrid className="border-collapse">
                  <CalendarGridHeader>
                    {(day) => <CalendarHeaderCell className="text-xs font-semibold text-slate-400 pb-3 uppercase">{day}</CalendarHeaderCell>}
                  </CalendarGridHeader>
                  <CalendarGridBody>
                    {(date) => (
                      <CalendarCell
                        date={date}
                        className={({ isSelected, isSelectionStart, isSelectionEnd, isOutsideVisibleRange }) => `
                          w-9 h-9 flex items-center justify-center text-sm outline-none cursor-pointer transition-colors
                          ${isOutsideVisibleRange ? 'text-slate-300' : 'text-slate-700 font-medium'}
                          ${isSelected && !isSelectionStart && !isSelectionEnd ? 'bg-slate-100' : ''}
                          ${isSelectionStart ? 'bg-slate-900 text-white rounded-l-lg hover:bg-slate-800' : ''}
                          ${isSelectionEnd ? 'bg-slate-900 text-white rounded-r-lg hover:bg-slate-800' : ''}
                          ${!isSelected && !isOutsideVisibleRange ? 'hover:bg-slate-100 rounded-lg' : ''}
                          ${isSelectionStart && isSelectionEnd ? 'rounded-lg' : ''}
                        `}
                      />
                    )}
                  </CalendarGridBody>
                </CalendarGrid>
              </RangeCalendar>
            </Dialog>
          </Popover>
        </DateRangePicker>

        <button 
          className="p-2 ml-1 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition shadow-md disabled:opacity-70 disabled:cursor-not-allowed" 
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};