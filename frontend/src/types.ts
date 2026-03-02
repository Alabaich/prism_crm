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