export interface Lead {
  id: number;
  email: string;
  phone: string;
  source: string;
  created_at: string;
  prospect_name?: string;
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
  name: string;
  email: string;
  phone?: string;
  building: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
}

export interface BlockedDate {
  id: number;
  date: string;
  reason?: string;
}