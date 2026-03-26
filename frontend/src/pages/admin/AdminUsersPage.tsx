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
  Plus,
  Trash2,
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

const API_URL = import.meta.env.VITE_API_URL || "";

const AdminUsersPage: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States for interactive UI
  const [copiedToken, setCopiedToken] = useState<number | null>(null);
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [editingEmail, setEditingEmail] = useState<number | null>(null);
  const [emailDraft, setEmailDraft] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  // States for Modals
  const [isAddBuildingOpen, setIsAddBuildingOpen] = useState(false);
  const [buildingForm, setBuildingForm] = useState({ name: "", address: "", city: "" });

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [userForm, setUserForm] = useState({ username: "", email: "", password: "", role: "admin" });

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
        fetch(`${API_URL}/admin/users/`, { headers: authHeaders }),
        fetch(`${API_URL}/admin/users/buildings`, { headers: authHeaders }),
      ]);
      if (usersRes.ok) setUsers(await usersRes.json());
      if (buildingsRes.ok) setBuildings(await buildingsRes.json());
    } catch (err) {
      console.error("Failed to load data", err);
    }
    setLoading(false);
  };

  // --- Handlers: Buildings ---
  const handleAddBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/admin/users/buildings`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(buildingForm),
      });
      if (res.ok) {
        setIsAddBuildingOpen(false);
        setBuildingForm({ name: "", address: "", city: "" });
        fetchAll();
      } else {
        const data = await res.json();
        alert(data.detail || "Failed to add building");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBuilding = async (id: number) => {
    if (!confirm("Are you sure you want to delete this building? This cannot be undone.")) return;
    try {
      const res = await fetch(`${API_URL}/admin/users/buildings/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (res.ok) {
        fetchAll();
      } else {
        const data = await res.json();
        alert(data.detail || "Cannot delete building. It may have existing bookings.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignBuilding = async (buildingId: number, adminId: number | null) => {
    if (!isSuperAdmin) return;
    try {
      await fetch(`${API_URL}/admin/users/${adminId}/buildings`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ building_id: buildingId }),
      });
      await fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  // --- Handlers: Users ---
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/admin/users/`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(userForm),
      });
      if (res.ok) {
        setIsAddUserOpen(false);
        setUserForm({ username: "", email: "", password: "", role: "admin" });
        fetchAll();
      } else {
        const data = await res.json();
        alert(data.detail || "Failed to create user");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeactivateUser = async (userId: number) => {
    if (!confirm("Deactivate this user? They will no longer be able to log in.")) return;
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (res.ok) {
        fetchAll();
      } else {
        const data = await res.json();
        alert(data.detail || "Failed to deactivate user");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveEmail = async (userId: number) => {
    if (!isSuperAdmin) return;
    setSavingEmail(true);
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ email: emailDraft }),
      });
      if (res.ok) {
        await fetchAll();
        setEditingEmail(null);
      }
    } catch (err) {
      console.error(err);
    }
    setSavingEmail(false);
  };

  const handleRegenerateToken = async (userId: number) => {
    if (!confirm("Regenerate token? The old meeting link will stop working immediately.")) return;
    setRegenerating(userId);
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/regenerate-token`, {
        method: "POST",
        headers: authHeaders,
      });
      if (res.ok) await fetchAll();
    } catch (err) {
      console.error(err);
    }
    setRegenerating(null);
  };

  const handleCopyLink = (targetUser: AdminUser) => {
    if (!targetUser.booking_token) return;
    const url = `${window.location.origin}/book/u/${targetUser.booking_token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(targetUser.id);
    setTimeout(() => setCopiedToken(null), 2000);
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

          {/* BUILDINGS OVERVIEW */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" /> Buildings
              </h2>
              {isSuperAdmin && (
                <button
                  onClick={() => setIsAddBuildingOpen(true)}
                  className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Location
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {buildings.map((b) => {
                const owner = users.find((u) => u.id === b.assigned_admin_id);
                return (
                  <div key={b.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <div className="font-medium text-slate-800 text-sm">{b.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{b.city || "No city set"}</div>
                    </div>
                    <div className="flex items-center gap-3">
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

                      {isSuperAdmin && (
                        <button
                          onClick={() => handleDeleteBuilding(b.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete Building"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {buildings.length === 0 && (
                <div className="col-span-full p-4 text-center text-sm text-slate-500">No buildings available.</div>
              )}
            </div>
          </div>

          {/* USERS LIST */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" /> Admin Agents
              </h2>
              {isSuperAdmin && (
                <button
                  onClick={() => setIsAddUserOpen(true)}
                  className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Agent
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {users.map((u) => (
                <div key={u.id} className="p-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
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

                      {/* Email Editing UI */}
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

                      {/* Meeting link */}
                      <div className="mt-3 flex items-center gap-3">
                        <LinkIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-xs text-slate-500 font-mono">
                          {u.booking_token ? `/book/u/${u.booking_token.substring(0, 8)}...` : "No token"}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyLink(u)}
                            disabled={!u.booking_token}
                            className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40"
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
                              className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded border border-slate-200 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-600 disabled:opacity-40"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${regenerating === u.id ? "animate-spin" : ""}`} />
                              Regenerate
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right side Actions */}
                  <div className="flex flex-col sm:items-end justify-between pl-14 sm:pl-0">
                    <div className="text-right mb-3 sm:mb-0">
                      <div className="text-xs text-slate-500 mb-1">Assigned buildings</div>
                      {u.buildings.length > 0 ? (
                        <div className="flex flex-wrap gap-1 justify-start sm:justify-end">
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

                    {isSuperAdmin && user?.id !== u.id && (
                      <button
                        onClick={() => handleDeactivateUser(u.id)}
                        className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1 mt-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Deactivate User
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* --- ADD BUILDING MODAL --- */}
      {isAddBuildingOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Add New Building</h3>
              <button onClick={() => setIsAddBuildingOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleAddBuilding} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Building Name</label>
                <input required type="text" value={buildingForm.name} onChange={e => setBuildingForm({...buildingForm, name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="e.g. 80 Bond St E" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input type="text" value={buildingForm.address} onChange={e => setBuildingForm({...buildingForm, address: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Street Address" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                <input type="text" value={buildingForm.city} onChange={e => setBuildingForm({...buildingForm, city: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="e.g. Oshawa" />
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">Save Location</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD USER MODAL --- */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Add New Agent</h3>
              <button onClick={() => setIsAddUserOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleAddUser} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <input required type="text" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input required type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Password</label>
                <input required type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  <option value="admin">Standard Admin (Agent)</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminUsersPage;