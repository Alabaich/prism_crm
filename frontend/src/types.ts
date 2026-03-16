export interface Lead {
  id: number;
  email: string;
  phone: string;
  source: string;
  created_at: string;
  prospect_name?: string;
  status?: string; // NEW: Added to track if they are "New", "Tenant", etc.
}

export interface OverlapGroup {
  email: string;
  leads: Lead[];
}

export interface DateRange {
  start: string;
  end: string;
}

export interface User {
  username: string;
  role: string;
}

export interface Booking {
  id: number;
  building: string;
  date: string;
  time: string;
  status: string;
  tour_outcome?: string;
  booking_type?: 'tour' | 'meeting';   // <-- ADD THIS LINE
  created_at: string;
  name: string;
  email: string;
  phone?: string;
  source?: string;
}

export interface BlockedDate {
  id: number;
  date: string;
  reason?: string;
}