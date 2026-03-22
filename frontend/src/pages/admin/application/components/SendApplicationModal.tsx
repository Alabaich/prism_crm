import React, { useState, useEffect, useRef } from "react";
import {
    Send,
    X,
    Search,
    UserPlus,
    Trash2,
    AlertCircle,
    Loader2,
} from "lucide-react";
import type { LeadSearchResult } from "../types";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSend: (data: {
        lead_id: number;
        signers: { name: string; email: string }[];
        building?: string;
        unit_number?: string;
        lease_start?: string;       
        monthly_rent?: string;
    }) => Promise<void>;
}

const SendApplicationModal: React.FC<Props> = ({ isOpen, onClose, onSend }) => {
    // Lead search
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<LeadSearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedLead, setSelectedLead] = useState<LeadSearchResult | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Form fields
    const [building, setBuilding] = useState("");
    const [unitNumber, setUnitNumber] = useState("");
    const [leaseStart, setLeaseStart] = useState("");
    const [monthlyRent, setMonthlyRent] = useState("");
    const [signers, setSigners] = useState([{ name: "", email: "" }]);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    // Debounced search
    useEffect(() => {
        if (!searchQuery.trim() || searchQuery.length < 2) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }

        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        searchTimeout.current = setTimeout(async () => {
            setSearching(true);
            try {
                const params = new URLSearchParams({
                    search: searchQuery,
                    limit: "8",
                    skip: "0",
                });
                const res = await fetch(`/get_leads/?${params}`);
                if (res.ok) {
                    const data = await res.json();
                    setSearchResults(data);
                    setShowDropdown(data.length > 0);
                }
            } catch {
                // Silently fail
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => {
            if (searchTimeout.current) clearTimeout(searchTimeout.current);
        };
    }, [searchQuery]);

    const handleSelectLead = (lead: LeadSearchResult) => {
        setSelectedLead(lead);
        setSearchQuery("");
        setShowDropdown(false);
        // Auto-fill first signer with lead's info
        if (signers.length === 1 && !signers[0].name && !signers[0].email) {
            setSigners([{ name: lead.prospect_name || "", email: lead.email || "" }]);
        }
    };

    const handleClearLead = () => {
        setSelectedLead(null);
        setSearchQuery("");
    };

    const addSigner = () => {
        if (signers.length >= 5) return;
        setSigners([...signers, { name: "", email: "" }]);
    };

    const removeSigner = (index: number) => {
        if (signers.length <= 1) return;
        setSigners(signers.filter((_, i) => i !== index));
    };

    const updateSigner = (index: number, field: "name" | "email", value: string) => {
        setSigners(signers.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
    };

    const handleSubmit = async () => {
        setError("");

        if (!selectedLead) {
            setError("Please select a lead");
            return;
        }

        const validSigners = signers.filter((s) => s.name.trim() && s.email.trim());
        if (validSigners.length === 0) {
            setError("At least one signer with name and email is required");
            return;
        }

        setSending(true);
        try {
            await onSend({
                lead_id: selectedLead.id,
                signers: validSigners,
                building: building.trim() || undefined,
                unit_number: unitNumber.trim() || undefined,
                lease_start: leaseStart || undefined,       
                monthly_rent: monthlyRent || undefined,
            });
            // Reset form
            setSelectedLead(null);
            setSearchQuery("");
            setBuilding("");
            setUnitNumber("");
            setLeaseStart("");
            setMonthlyRent("");
            setSigners([{ name: "", email: "" }]);

            onClose();
        } catch (err: any) {
            setError(err.message || "Failed to send application");
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />

            <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <Send className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Send Application</h2>
                            <p className="text-xs text-slate-500">Create and send signing links to applicants</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-5">
                    {error && (
                        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Lead Search */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Find Lead</label>

                        {selectedLead ? (
                            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-blue-50 border border-blue-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                                        {selectedLead.prospect_name?.charAt(0) || "?"}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">
                                            {selectedLead.prospect_name || "Unknown"}
                                        </p>
                                        <p className="text-xs text-slate-500">{selectedLead.email} · ID #{selectedLead.id}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleClearLead}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="relative" ref={dropdownRef}>
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by name or email..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition text-sm"
                                    onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                                />
                                {searching && (
                                    <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                                )}

                                {showDropdown && (
                                    <div className="absolute z-10 w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-lg max-h-60 overflow-y-auto">
                                        {searchResults.map((lead) => (
                                            <button
                                                key={lead.id}
                                                onClick={() => handleSelectLead(lead)}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition text-left border-b border-slate-100 last:border-0"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                                                    {lead.prospect_name?.charAt(0) || "?"}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800 truncate">
                                                        {lead.prospect_name || "Unknown"}
                                                    </p>
                                                    <p className="text-xs text-slate-500 truncate">{lead.email}</p>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                                                    #{lead.id}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Building & Unit */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Building</label>
                            <input
                                type="text"
                                value={building}
                                onChange={(e) => setBuilding(e.target.value)}
                                placeholder="e.g. 80 Bond St E"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Unit #</label>
                            <input
                                type="text"
                                value={unitNumber}
                                onChange={(e) => setUnitNumber(e.target.value)}
                                placeholder="e.g. 204"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition text-sm"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Lease Start Date</label>
                            <input
                                type="date"
                                value={leaseStart}
                                onChange={(e) => setLeaseStart(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Monthly Rent</label>
                            <input
                                type="text"
                                value={monthlyRent}
                                onChange={(e) => setMonthlyRent(e.target.value)}
                                placeholder="e.g. 2200"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition text-sm"
                            />
                        </div>
                    </div>

                    {/* Signers */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-semibold text-slate-700">
                                Signers ({signers.length}/5)
                            </label>
                            {signers.length < 5 && (
                                <button
                                    onClick={addSigner}
                                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
                                >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    Add Signer
                                </button>
                            )}
                        </div>

                        <div className="space-y-3">
                            {signers.map((signer, i) => (
                                <div key={i} className="flex items-start gap-2">
                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            value={signer.name}
                                            onChange={(e) => updateSigner(i, "name", e.target.value)}
                                            placeholder="Full name"
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition text-sm"
                                        />
                                        <input
                                            type="email"
                                            value={signer.email}
                                            onChange={(e) => updateSigner(i, "email", e.target.value)}
                                            placeholder="Email address"
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition text-sm"
                                        />
                                    </div>
                                    {signers.length > 1 && (
                                        <button
                                            onClick={() => removeSigner(i)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition mt-0.5"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={sending}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-bold hover:bg-zinc-800 transition disabled:opacity-50 shadow-sm"
                    >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Send Application
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SendApplicationModal;