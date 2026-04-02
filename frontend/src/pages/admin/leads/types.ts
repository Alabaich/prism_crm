export interface Lead {
  id: number;
  prospect_name: string;
  email: string;
  phone: string;
  status: string;
  source: string;
  property_name?: string;
  move_in_date?: string;
  debug_1?: string;
  debug_2?: string;
  created_at: string;
}

export interface SortConfig {
  key: keyof Lead;
  direction: "asc" | "desc";
}

export const statusColors: Record<string, string> = {
  new:       "bg-blue-100 text-blue-700 border-blue-200",
  contacted: "bg-yellow-100 text-yellow-700 border-yellow-200",
  applied:   "bg-purple-100 text-purple-700 border-purple-200",
  approved:  "bg-green-100 text-green-700 border-green-200",
  rejected:  "bg-red-50 text-red-600 border-red-100",
  tenant:    "bg-emerald-100 text-emerald-700 border-emerald-200",
};