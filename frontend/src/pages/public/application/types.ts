// ── Types ────────────────────────────────────────────────────────────────────

export interface DocumentInfo {
  id: number;
  document_type: string;
  display_name: string;
  sort_order: number;
  signed: boolean;
}

export interface SessionData {
  session_id: number;
  signer_name: string;
  signer_email: string;
  signer_index: number; 
  status: string;
  consent_given: boolean;
  expires_at: string | null;
  building: string | null;
  unit_number: string | null;
  lease_start: string | null;      
  monthly_rent: string | null; 
  documents: DocumentInfo[];
  prefill: Record<string, any> | null;
  total_documents: number;
  signed_documents: number;
  all_signed: boolean;
  requires_otp: boolean;      
  otp_verified: boolean;  
}

export interface FormData {
  building: string;
  unit_number: string;
  lease_start: string;
  monthly_rent: string;
  // Personal
  prospect_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  sin_number: string;
  drivers_license: string;
 
  // Employment
  employer_name: string;
  employment_type: string;
  monthly_income: string;
  position_held: string;
  length_of_employment: string;
  business_address: string;
  business_phone: string;
  supervisor_name: string;
 
  // Prior Employment
  prior_employer_name: string;
  prior_position_held: string;
  prior_length_of_employment: string;
  prior_business_address: string;
  prior_business_phone: string;
  prior_supervisor: string;
  prior_salary: string;
 
  // Banking
  bank_name: string;
  bank_branch: string;
  bank_address: string;
  chequing_account: string;
  savings_account: string;
 
  // Financial Obligations — [{to, amount}]
  financial_obligations: { to: string; amount: string }[];
 
  // Additional
  has_pet: boolean;
  pet_details: string;
  parking_requested: boolean;
 
  // References
  reference_1_name: string;
  reference_1_phone: string;
  reference_1_address: string;
  reference_1_acquaintance: string;
  reference_1_occupation: string;
  reference_2_name: string;
  reference_2_phone: string;
  reference_2_address: string;
  reference_2_acquaintance: string;
  reference_2_occupation: string;
 
  // Automobiles — [{make, model, year, licence}]
  automobiles: { make: string; model: string; year: string; licence: string }[];
 
  // Previous addresses
  previous_addresses: any[];
 
  // Vacating
  vacating_reason: string;
}

export const INITIAL_FORM_DATA: FormData = {
  building: "",
  unit_number: "",
  lease_start: "",
  monthly_rent: "",
  prospect_name: "",
  email: "",
  phone: "",
  date_of_birth: "",
  sin_number: "",
  drivers_license: "",
  employer_name: "",
  employment_type: "",
  monthly_income: "",
  position_held: "",
  length_of_employment: "",
  business_address: "",
  business_phone: "",
  supervisor_name: "",
  prior_employer_name: "",
  prior_position_held: "",
  prior_length_of_employment: "",
  prior_business_address: "",
  prior_business_phone: "",
  prior_supervisor: "",
  prior_salary: "",
  bank_name: "",
  bank_branch: "",
  bank_address: "",
  chequing_account: "",
  savings_account: "",
  financial_obligations: [],
  has_pet: false,
  pet_details: "",
  parking_requested: false,
  reference_1_name: "",
  reference_1_phone: "",
  reference_1_address: "",
  reference_1_acquaintance: "",
  reference_1_occupation: "",
  reference_2_name: "",
  reference_2_phone: "",
  reference_2_address: "",
  reference_2_acquaintance: "",
  reference_2_occupation: "",
  automobiles: [],
  previous_addresses: [],
  vacating_reason: "",
};

// ── Required fields ──────────────────────────────────────────────────────────

export const REQUIRED_FIELDS: { key: keyof FormData; label: string }[] = [
  { key: "prospect_name", label: "Full Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "employer_name", label: "Employer Name" },
  { key: "employment_type", label: "Employment Type" },
  { key: "monthly_income", label: "Monthly Income" },
  { key: "position_held", label: "Position" },
];

export const isRequired = (key: string): boolean =>
  REQUIRED_FIELDS.some((f) => f.key === key);

export const validateForm = (formData: FormData): string | null => {
  for (const field of REQUIRED_FIELDS) {
    const value = formData[field.key];
    if (!value || (typeof value === "string" && !value.trim())) {
      return `${field.label} is required`;
    }
  }
  return null;
};

// ── Tab config ───────────────────────────────────────────────────────────────

import { Shield, FileText, Upload, PenTool, CheckCircle2 } from "lucide-react";

export const TABS = [
  { key: "consent" as const, label: "Consent", icon: Shield },
  { key: "form" as const, label: "Application", icon: FileText },
  { key: "documents" as const, label: "Documents", icon: Upload },
  { key: "sign" as const, label: "Sign", icon: PenTool },
  { key: "done" as const, label: "Complete", icon: CheckCircle2 },
];

export type TabKey = (typeof TABS)[number]["key"];

// ── Styling helpers ──────────────────────────────────────────────────────────

export const inputClass =
  "w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition text-sm bg-white";

export const labelClass = "block text-sm font-medium text-zinc-700 mb-1.5";