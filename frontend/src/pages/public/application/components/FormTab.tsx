import React from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Briefcase,
  Users,
  Home,
  Car,
  PawPrint,
  User,
  Loader2,
  CreditCard,
  DollarSign,
  Plus,
  Trash2,
  MapPin,
} from "lucide-react";
import type { FormData } from "../types";
import { inputClass, labelClass, validateForm } from "../types";

interface Props {
  formData: FormData;
  submitting: boolean;
  signerIndex: number;   // 0 = applicant 1 (full form), 1 = applicant 2 (their section only)
  onChange: (field: string, value: any) => void;
  onSave: () => void;
  onError: (msg: string) => void;
}

const RequiredMark = () => <span className="text-red-500 ml-0.5">*</span>;

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2 mb-4">
    {icon}
    {title}
  </h3>
);

const FormTab: React.FC<Props> = ({ formData, submitting, signerIndex, onChange, onSave, onError }) => {
  const isApplicant1 = signerIndex === 0;
  const isApplicant2 = signerIndex === 1;

  const handleSave = () => {
    // Only validate required fields for applicant 1
    if (isApplicant1) {
      const err = validateForm(formData);
      if (err) {
        onError(err);
        return;
      }
    } else {
      // Applicant 2 — just needs name
      if (!formData.prospect_name?.trim()) {
        onError("Full Name is required");
        return;
      }
    }
    onSave();
  };

  // ── Dynamic list helpers ──
  const addObligation = () => {
    onChange("financial_obligations", [...formData.financial_obligations, { to: "", amount: "" }]);
  };
  const removeObligation = (i: number) => {
    onChange("financial_obligations", formData.financial_obligations.filter((_: any, idx: number) => idx !== i));
  };
  const updateObligation = (i: number, field: string, value: string) => {
    onChange("financial_obligations", formData.financial_obligations.map((o: any, idx: number) => idx === i ? { ...o, [field]: value } : o));
  };

  const addAuto = () => {
    onChange("automobiles", [...formData.automobiles, { make: "", model: "", year: "", licence: "" }]);
  };
  const removeAuto = (i: number) => {
    onChange("automobiles", formData.automobiles.filter((_: any, idx: number) => idx !== i));
  };
  const updateAuto = (i: number, field: string, value: string) => {
    onChange("automobiles", formData.automobiles.map((a: any, idx: number) => idx === i ? { ...a, [field]: value } : a));
  };

  const addAddress = () => {
    onChange("previous_addresses", [
      ...formData.previous_addresses,
      { address: "", from: "", to: "", landlord_name: "", landlord_phone: "" }
    ]);
  };
  const removeAddress = (i: number) => {
    onChange("previous_addresses", formData.previous_addresses.filter((_: any, idx: number) => idx !== i));
  };
  const updateAddress = (i: number, field: string, value: string) => {
    onChange("previous_addresses", formData.previous_addresses.map((a: any, idx: number) =>
      idx === i ? { ...a, [field]: value } : a
    ));
  };

  return (
    <motion.div
      key="form"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            {isApplicant2 ? "Co-Applicant Information" : "Rental Application"}
          </h2>
          <p className="text-xs text-zinc-500">
            {isApplicant2 ? "Applicant #2 — Please fill in your details" : "Form 410 — Ontario Standard"}
          </p>
        </div>
      </div>

      <div className="space-y-8">
        

        {/* ═══════════════════════════════════════════════
            PERSONAL INFO (both applicants)
            ═══════════════════════════════════════════════ */}
            {isApplicant1 && (
  <div>
    <SectionTitle icon={<MapPin className="w-4 h-4 text-zinc-400" />} title="Property Details" />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className={labelClass}>Building Address</label>
        <input type="text" value={formData.building} onChange={(e) => onChange("building", e.target.value)} className={inputClass} placeholder="e.g. 80 Bond St E" />
      </div>
      <div>
        <label className={labelClass}>Unit #</label>
        <input type="text" value={formData.unit_number} onChange={(e) => onChange("unit_number", e.target.value)} className={inputClass} placeholder="e.g. 714" />
      </div>
      <div>
        <label className={labelClass}>Lease Start Date</label>
        <input type="date" value={formData.lease_start} onChange={(e) => onChange("lease_start", e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Monthly Rent</label>
        <input type="text" value={formData.monthly_rent} onChange={(e) => onChange("monthly_rent", e.target.value)} className={inputClass} placeholder="$2200" />
      </div>
    </div>
  </div>
)}
        <div>
          <SectionTitle icon={<User className="w-4 h-4 text-zinc-400" />} title={isApplicant2 ? "Your Information" : "Applicant Information"} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass}>Full Name <RequiredMark /></label>
              <input type="text" value={formData.prospect_name} onChange={(e) => onChange("prospect_name", e.target.value)} className={inputClass} placeholder="Legal full name" />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={formData.email} onChange={(e) => onChange("email", e.target.value)} className={inputClass} placeholder="email@example.com" />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input type="tel" value={formData.phone} onChange={(e) => onChange("phone", e.target.value)} className={inputClass} placeholder="(416) 555-0100" />
            </div>
            <div>
              <label className={labelClass}>Date of Birth</label>
              <input type="date" value={formData.date_of_birth} onChange={(e) => onChange("date_of_birth", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Driver's License No.</label>
              <input type="text" value={formData.drivers_license} onChange={(e) => onChange("drivers_license", e.target.value)} className={inputClass} placeholder="License number" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>SIN Number <span className="text-zinc-400 text-xs">(Optional)</span></label>
              <input type="text" value={formData.sin_number} onChange={(e) => onChange("sin_number", e.target.value)} className={inputClass} placeholder="Optional — for credit check" />
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            CURRENT EMPLOYMENT (both applicants)
            ═══════════════════════════════════════════════ */}
        <div>
          <SectionTitle icon={<Briefcase className="w-4 h-4 text-zinc-400" />} title="Current Employment" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Employer Name {isApplicant1 && <RequiredMark />}</label>
              <input type="text" value={formData.employer_name} onChange={(e) => onChange("employer_name", e.target.value)} className={inputClass} placeholder="Company name" />
            </div>
            <div>
              <label className={labelClass}>Position Held {isApplicant1 && <RequiredMark />}</label>
              <input type="text" value={formData.position_held} onChange={(e) => onChange("position_held", e.target.value)} className={inputClass} placeholder="Job title" />
            </div>
            {isApplicant1 && (
              <div>
                <label className={labelClass}>Employment Type <RequiredMark /></label>
                <select value={formData.employment_type} onChange={(e) => onChange("employment_type", e.target.value)} className={inputClass}>
                  <option value="">Select...</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Self-employed">Self-employed</option>
                  <option value="Contract">Contract</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}
            <div>
              <label className={labelClass}>Monthly Salary {isApplicant1 && <RequiredMark />}</label>
              <input type="text" value={formData.monthly_income} onChange={(e) => onChange("monthly_income", e.target.value)} className={inputClass} placeholder="$0.00" />
            </div>
            <div>
              <label className={labelClass}>Length of Employment</label>
              <input type="text" value={formData.length_of_employment} onChange={(e) => onChange("length_of_employment", e.target.value)} className={inputClass} placeholder="e.g. 2 years" />
            </div>
            <div>
              <label className={labelClass}>Supervisor Name</label>
              <input type="text" value={formData.supervisor_name} onChange={(e) => onChange("supervisor_name", e.target.value)} className={inputClass} placeholder="Supervisor's full name" />
            </div>
            <div>
              <label className={labelClass}>Business Address</label>
              <input type="text" value={formData.business_address} onChange={(e) => onChange("business_address", e.target.value)} className={inputClass} placeholder="Office address" />
            </div>
            <div>
              <label className={labelClass}>Business Phone</label>
              <input type="tel" value={formData.business_phone} onChange={(e) => onChange("business_phone", e.target.value)} className={inputClass} placeholder="Office phone" />
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            PRIOR EMPLOYMENT (both applicants)
            ═══════════════════════════════════════════════ */}
        <div>
          <SectionTitle icon={<Briefcase className="w-4 h-4 text-zinc-400" />} title="Prior Employment" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Previous Employer</label>
              <input type="text" value={formData.prior_employer_name} onChange={(e) => onChange("prior_employer_name", e.target.value)} className={inputClass} placeholder="Company name" />
            </div>
            <div>
              <label className={labelClass}>Position Held</label>
              <input type="text" value={formData.prior_position_held} onChange={(e) => onChange("prior_position_held", e.target.value)} className={inputClass} placeholder="Job title" />
            </div>
            <div>
              <label className={labelClass}>Length of Employment</label>
              <input type="text" value={formData.prior_length_of_employment} onChange={(e) => onChange("prior_length_of_employment", e.target.value)} className={inputClass} placeholder="e.g. 3 years" />
            </div>
            <div>
              <label className={labelClass}>Salary Range</label>
              <input type="text" value={formData.prior_salary} onChange={(e) => onChange("prior_salary", e.target.value)} className={inputClass} placeholder="$0.00" />
            </div>
            <div>
              <label className={labelClass}>Supervisor Name</label>
              <input type="text" value={formData.prior_supervisor} onChange={(e) => onChange("prior_supervisor", e.target.value)} className={inputClass} placeholder="Supervisor's name" />
            </div>
            <div>
              <label className={labelClass}>Business Address</label>
              <input type="text" value={formData.prior_business_address} onChange={(e) => onChange("prior_business_address", e.target.value)} className={inputClass} placeholder="Office address" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Business Phone</label>
              <input type="tel" value={formData.prior_business_phone} onChange={(e) => onChange("prior_business_phone", e.target.value)} className={inputClass} placeholder="Office phone" />
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            PREVIOUS ADDRESSES (both applicants)
            ═══════════════════════════════════════════════ */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle icon={<MapPin className="w-4 h-4 text-zinc-400" />} title="Previous Addresses" />
            {formData.previous_addresses.length < 2 && (
              <button type="button" onClick={addAddress} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition">
                <Plus className="w-3.5 h-3.5" /> Add Address
              </button>
            )}
          </div>
          {formData.previous_addresses.length === 0 ? (
            <p className="text-xs text-zinc-400 italic">No previous addresses added. Click "Add Address" to add your last two residences.</p>
          ) : (
            <div className="space-y-6">
              {formData.previous_addresses.map((addr: any, i: number) => (
                <div key={i} className="bg-zinc-50 rounded-xl p-4 relative">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      {i === 0 ? "Present Address" : "Prior Address"}
                    </p>
                    <button type="button" onClick={() => removeAddress(i)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Address</label>
                      <input type="text" value={addr.address || ""} onChange={(e) => updateAddress(i, "address", e.target.value)} className={inputClass} placeholder="Full address" />
                    </div>
                    <div>
                      <label className={labelClass}>From</label>
                      <input type="text" value={addr.from || ""} onChange={(e) => updateAddress(i, "from", e.target.value)} className={inputClass} placeholder="e.g. 2022-01" />
                    </div>
                    <div>
                      <label className={labelClass}>To</label>
                      <input type="text" value={addr.to || ""} onChange={(e) => updateAddress(i, "to", e.target.value)} className={inputClass} placeholder="e.g. 2025-12 or Present" />
                    </div>
                    <div>
                      <label className={labelClass}>Landlord Name</label>
                      <input type="text" value={addr.landlord_name || ""} onChange={(e) => updateAddress(i, "landlord_name", e.target.value)} className={inputClass} placeholder="Landlord's name" />
                    </div>
                    <div>
                      <label className={labelClass}>Landlord Phone</label>
                      <input type="tel" value={addr.landlord_phone || ""} onChange={(e) => updateAddress(i, "landlord_phone", e.target.value)} className={inputClass} placeholder="Phone number" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════
            APPLICANT 1 ONLY SECTIONS BELOW
            ═══════════════════════════════════════════════════════ */}

        {isApplicant1 && (
          <>
            {/* ── Banking ── */}
            <div>
              <SectionTitle icon={<CreditCard className="w-4 h-4 text-zinc-400" />} title="Banking Information" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Bank Name</label>
                  <input type="text" value={formData.bank_name} onChange={(e) => onChange("bank_name", e.target.value)} className={inputClass} placeholder="e.g. TD Canada Trust" />
                </div>
                <div>
                  <label className={labelClass}>Branch</label>
                  <input type="text" value={formData.bank_branch} onChange={(e) => onChange("bank_branch", e.target.value)} className={inputClass} placeholder="Branch name" />
                </div>
                <div>
                  <label className={labelClass}>Bank Address</label>
                  <input type="text" value={formData.bank_address} onChange={(e) => onChange("bank_address", e.target.value)} className={inputClass} placeholder="Branch address" />
                </div>
                <div>
                  <label className={labelClass}>Chequing Account #</label>
                  <input type="text" value={formData.chequing_account} onChange={(e) => onChange("chequing_account", e.target.value)} className={inputClass} placeholder="Account number" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Savings Account #</label>
                  <input type="text" value={formData.savings_account} onChange={(e) => onChange("savings_account", e.target.value)} className={inputClass} placeholder="Account number" />
                </div>
              </div>
            </div>

            {/* ── Financial Obligations ── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <SectionTitle icon={<DollarSign className="w-4 h-4 text-zinc-400" />} title="Financial Obligations" />
                <button type="button" onClick={addObligation} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition">
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
              {formData.financial_obligations.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">No financial obligations added.</p>
              ) : (
                <div className="space-y-3">
                  {formData.financial_obligations.map((ob: any, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <input type="text" value={ob.to} onChange={(e) => updateObligation(i, "to", e.target.value)} className={inputClass} placeholder="Payments to (e.g. VISA, Car Loan)" />
                        </div>
                        <input type="text" value={ob.amount} onChange={(e) => updateObligation(i, "amount", e.target.value)} className={inputClass} placeholder="$ Amount" />
                      </div>
                      <button type="button" onClick={() => removeObligation(i)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition mt-0.5">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Pets & Parking ── */}
            <div>
              <SectionTitle icon={<Home className="w-4 h-4 text-zinc-400" />} title="Additional Info" />
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={formData.has_pet} onChange={(e) => onChange("has_pet", e.target.checked)} className="w-4 h-4 rounded border-zinc-300 accent-zinc-900" />
                  <PawPrint className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm text-zinc-700">I have a pet</span>
                </label>
                {formData.has_pet && (
                  <div className="ml-7">
                    <input type="text" value={formData.pet_details} onChange={(e) => onChange("pet_details", e.target.value)} className={inputClass} placeholder="Breed, weight, count..." />
                  </div>
                )}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={formData.parking_requested} onChange={(e) => onChange("parking_requested", e.target.checked)} className="w-4 h-4 rounded border-zinc-300 accent-zinc-900" />
                  <Car className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm text-zinc-700">I need a parking spot</span>
                </label>
              </div>
            </div>

            {/* ── Personal References ── */}
            <div>
              <SectionTitle icon={<Users className="w-4 h-4 text-zinc-400" />} title="Personal References" />
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Reference 1</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className={labelClass}>Name</label><input type="text" value={formData.reference_1_name} onChange={(e) => onChange("reference_1_name", e.target.value)} className={inputClass} placeholder="Full name" /></div>
                    <div><label className={labelClass}>Phone</label><input type="tel" value={formData.reference_1_phone} onChange={(e) => onChange("reference_1_phone", e.target.value)} className={inputClass} placeholder="Phone number" /></div>
                    <div className="sm:col-span-2"><label className={labelClass}>Address</label><input type="text" value={formData.reference_1_address} onChange={(e) => onChange("reference_1_address", e.target.value)} className={inputClass} placeholder="Address" /></div>
                    <div><label className={labelClass}>Length of Acquaintance</label><input type="text" value={formData.reference_1_acquaintance} onChange={(e) => onChange("reference_1_acquaintance", e.target.value)} className={inputClass} placeholder="e.g. 5 years" /></div>
                    <div><label className={labelClass}>Occupation</label><input type="text" value={formData.reference_1_occupation} onChange={(e) => onChange("reference_1_occupation", e.target.value)} className={inputClass} placeholder="Their occupation" /></div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Reference 2</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className={labelClass}>Name</label><input type="text" value={formData.reference_2_name} onChange={(e) => onChange("reference_2_name", e.target.value)} className={inputClass} placeholder="Full name" /></div>
                    <div><label className={labelClass}>Phone</label><input type="tel" value={formData.reference_2_phone} onChange={(e) => onChange("reference_2_phone", e.target.value)} className={inputClass} placeholder="Phone number" /></div>
                    <div className="sm:col-span-2"><label className={labelClass}>Address</label><input type="text" value={formData.reference_2_address} onChange={(e) => onChange("reference_2_address", e.target.value)} className={inputClass} placeholder="Address" /></div>
                    <div><label className={labelClass}>Length of Acquaintance</label><input type="text" value={formData.reference_2_acquaintance} onChange={(e) => onChange("reference_2_acquaintance", e.target.value)} className={inputClass} placeholder="e.g. 3 years" /></div>
                    <div><label className={labelClass}>Occupation</label><input type="text" value={formData.reference_2_occupation} onChange={(e) => onChange("reference_2_occupation", e.target.value)} className={inputClass} placeholder="Their occupation" /></div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Automobiles ── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <SectionTitle icon={<Car className="w-4 h-4 text-zinc-400" />} title="Automobile(s)" />
                {formData.automobiles.length < 2 && (
                  <button type="button" onClick={addAuto} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition">
                    <Plus className="w-3.5 h-3.5" /> Add Vehicle
                  </button>
                )}
              </div>
              {formData.automobiles.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">No vehicles added.</p>
              ) : (
                <div className="space-y-3">
                  {formData.automobiles.map((auto: any, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="flex-1 grid grid-cols-4 gap-2">
                        <input type="text" value={auto.make} onChange={(e) => updateAuto(i, "make", e.target.value)} className={inputClass} placeholder="Make" />
                        <input type="text" value={auto.model} onChange={(e) => updateAuto(i, "model", e.target.value)} className={inputClass} placeholder="Model" />
                        <input type="text" value={auto.year} onChange={(e) => updateAuto(i, "year", e.target.value)} className={inputClass} placeholder="Year" />
                        <input type="text" value={auto.licence} onChange={(e) => updateAuto(i, "licence", e.target.value)} className={inputClass} placeholder="Licence #" />
                      </div>
                      <button type="button" onClick={() => removeAuto(i)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition mt-0.5">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Vacating Reason ── */}
            <div>
              <label className={labelClass}>Reason for Vacating Current Residence</label>
              <textarea
                value={formData.vacating_reason}
                onChange={(e) => onChange("vacating_reason", e.target.value)}
                className={`${inputClass} resize-none`}
                rows={3}
                placeholder="Optional"
              />
            </div>
          </>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={submitting}
        className="w-full mt-8 bg-zinc-900 text-white rounded-xl p-3 font-medium disabled:opacity-40 hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Save & Continue to Documents
      </button>
    </motion.div>
  );
};

export default FormTab;