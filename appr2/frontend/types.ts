// ... existing code ...
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
  documents: DocumentItem[];
  prefill?: Partial<FormData> | null;
  total_documents: number;
  signed_documents: number;
  all_signed: boolean;
  requires_otp: boolean;
  otp_verified: boolean;
  revision_notes?: string | null;
}

export interface FormData {
// ... existing code ...