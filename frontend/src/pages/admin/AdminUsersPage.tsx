import React, { useState, useEffect } from "react";
import {
  Copy,
  Check,
  RefreshCw,
  Mail,
  Building2,
  Link as LinkIcon,
  Shield,
  User,
  Edit2,
  Save,
  X,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

interface Building {
  id: number;
  name: string;
  address?: string;
  city?: string;
  assigned_admin_id?: number;
}

interface AdminUser {
  id: number;
  username: string;
  role: string;
  email: string | null;
  booking_token: string | null;
  buildings: { id: number; name: string }[];
}

const AdminUsersPage: React.FC = () => {
  const { isSuperAdmin } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<number | null>(null);
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [editingEmail, setEditingEmail] = useState<number | null>(null);
  const [emailDraft, setEmailDraft] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  const token = localStorage.getItem("prism_token");
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [usersRes, buildingsRes] = await Promise.all([
        fetch("/admin/users/", { headers: authHeaders }),
        fetch("/admin/users/buildings", { headers: authHeaders }),
      ]);
      if (usersRes.ok) setUsers(await usersRes.json());
      if (buildingsRes.ok) setBuildings(await buildingsRes.json());
    } catch {}
    setLoading(false);
  };

  const handleCopyLink = (user: AdminUser) => {
    if (!user.booking_token) return;
    const url = `${window.location.origin}/book/u/${user.booking_token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(user.id);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleRegenerateToken = async (userId: number) => {
    if (!confirm("Regenerate token? The old meeting link will stop working immediately.")) return;
    setRegenerating(userId);
    try {
      const res = await fetch(`/admin/users/${userId}/regenerate-token`, {
        method: "POST",
        headers: authHeaders,
      });
      if (res.ok) await fetchAll();
    } catch {}
    setRegenerating(null);
  };

  const handleAssignBuilding = async (buildingId: number, adminId: number | null) => {
    if (!isSuperAdmin) return;
    try {
      await fetch(`/admin/users/${adminId}/buildings`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ building_id: buildingId }),
      });
      await fetchAll();
    } catch {}
  };

  const handleSaveEmail = async (userId: number) => {
    if (!isSuperAdmin) return;
    setSavingEmail(true);
    try {
      const res = await fetch(`/admin/users/${userId}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ email: emailDraft }),
      });
      if (res.ok) {
        await fetchAll();
        setEditingEmail(null);
      }
    } catch {}
    setSavingEmail(false);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 animate-pulse">
        Loading users...
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col font-sans">
      <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
            <p className="text-slate-500 mt-1">
              {isSuperAdmin
                ? "Manage agent buildings, meeting links, and email notifications."
                : "View agent assignments and meeting links. Contact a superadmin to make changes."}
            </p>
            {!isSuperAdmin && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-medium text-amber-700">
                <Shield className="w-3.5 h-3.5" /> Read-only — superadmin access required to edit
              </div>
            )}
          </div>

          {/* Buildings overview */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" /> Buildings
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {buildings.map((b) => {
                const owner = users.find((u) => u.id === b.assigned_admin_id);
                return (
                  <div key={b.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <div className="font-medium text-slate-800 text-sm">{b.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{b.city}</div>
                    </div>
                    {isSuperAdmin ? (
                      <select
                        value={b.assigned_admin_id ?? ""}
                        onChange={(e) => handleAssignBuilding(b.id, e.target.value ? Number(e.target.value) : null)}
                        className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      >
                        <option value="">Unassigned</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>{u.username}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm font-medium text-slate-600">
                        {owner ? owner.username : <span className="text-slate-400 italic">Unassigned</span>}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Users list */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {users.map((u) => (
                <div key={u.id} className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{u.username}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            u.role === "superadmin"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-slate-100 text-slate-600"
                          }`}>
                            {u.role}
                          </span>
                        </div>
                        {/* Email */}
                        <div className="mt-1.5 flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {editingEmail === u.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="email"
                                value={emailDraft}
                                onChange={(e) => setEmailDraft(e.target.value)}
                                className="text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-zinc-900 w-56"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveEmail(u.id)}
                                disabled={savingEmail}
                                className="text-emerald-600 hover:text-emerald-700"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingEmail(null)}
                                className="text-slate-400 hover:text-slate-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className={`text-sm ${u.email ? "text-slate-600" : "text-slate-400 italic"}`}>
                                {u.email ?? "No email set"}
                              </span>
                              {!u.email && (
                                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                  Won't receive notifications
                                </span>
                              )}
                              {isSuperAdmin && (
                                <button
                                  onClick={() => { setEditingEmail(u.id); setEmailDraft(u.email ?? ""); }}
                                  className="text-slate-400 hover:text-slate-600 ml-1"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Buildings assigned */}
                    <div className="text-right">
                      <div className="text-xs text-slate-500 mb-1">Assigned buildings</div>
                      {u.buildings.length > 0 ? (
                        <div className="flex flex-wrap gap-1 justify-end">
                          {u.buildings.map((b) => (
                            <span key={b.id} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-lg font-medium">
                              {b.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">None assigned</span>
                      )}
                    </div>
                  </div>

                  {/* Meeting link */}
                  <div className="mt-4 flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <LinkIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-xs text-slate-500 font-mono flex-1 truncate">
                      {u.booking_token
                        ? `${window.location.origin}/book/u/${u.booking_token}`
                        : "No token"}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleCopyLink(u)}
                        disabled={!u.booking_token}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-slate-700 disabled:opacity-40"
                      >
                        {copiedToken === u.id ? (
                          <><Check className="w-3.5 h-3.5 text-emerald-500" /> Copied</>
                        ) : (
                          <><Copy className="w-3.5 h-3.5" /> Copy</>
                        )}
                      </button>
                      {isSuperAdmin && (
                        <button
                          onClick={() => handleRegenerateToken(u.id)}
                          disabled={regenerating === u.id}
                          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors text-slate-600 disabled:opacity-40"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${regenerating === u.id ? "animate-spin" : ""}`} />
                          Regenerate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminUsersPage;