import { useState, useEffect, useRef } from "react";

const API = "https://chatter-backend-4i7g.onrender.com";

const NAV = [
  { id: "overview",  label: "Overview",       icon: "⬡" },
  { id: "users",     label: "Users",           icon: "◈" },
  { id: "chats",     label: "Direct Chats",    icon: "◎" },
  { id: "public",    label: "Public Feed",     icon: "◉" },
  { id: "groups",    label: "Groups",          icon: "⬡" },
  { id: "meetings",  label: "Meetings",        icon: "◆" },
  { id: "outlook",   label: "Outlook Events",  icon: "◇" },
];

/* ─── tiny helpers ─── */
const fmt   = (d) => d ? new Date(d).toLocaleString() : "—";
const ago   = (d) => {
  if (!d) return "—";
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
};

export default function AdminPanel({ token }) {
  const [tab, setTab]         = useState("overview");
  const [toast, setToast]     = useState(null);
  const [confirm, setConfirm] = useState(null); // { msg, onOk }
  const [sideOpen, setSide]   = useState(false);

  /* ── data stores ── */
  const [users,    setUsers]    = useState([]);
  const [convs,    setConvs]    = useState([]);
  const [msgs,     setMsgs]     = useState([]);
  const [selConv,  setSelConv]  = useState(null);
  const [pubMsgs,  setPubMsgs]  = useState([]);
  const [groups,   setGroups]   = useState([]);
  const [grpMsgs,  setGrpMsgs]  = useState([]);
  const [selGrp,   setSelGrp]   = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [outlook,  setOutlook]  = useState([]);
  const [loading,  setLoading]  = useState(false);

  /* ── user form ── */
  const [editUser,   setEditUser]   = useState(null);
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState({});
  const [pwdTarget,  setPwdTarget]  = useState(null);
  const [newPwd,     setNewPwd]     = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [convSearch, setConvSearch] = useState("");

  const h = { headers: { Authorization: `Bearer ${token}` } };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const ask = (msg, onOk) => setConfirm({ msg, onOk });

  /* ─── fetch ─── */
  useEffect(() => { load(); }, [tab]);

async function load() {
  setLoading(true);
  try {
    if (tab === "overview" || tab === "users") {
      const r = await fetch(`${API}/admin/users`, h);
      const d = await r.json();  // ← add this
      setUsers(d.users || []);
    }
    if (tab === "overview" || tab === "meetings") {
      const r = await fetch(`${API}/admin/meetings`, h);
      const d = await r.json();  // ← add this
      setMeetings(d.meetings || []);
    }
    if (tab === "overview" || tab === "outlook") {
      const r = await fetch(`${API}/admin/outlook`, h);
      const d = await r.json();  // ← add this
      setOutlook(d.events || []);
    }
    if (tab === "chats") {
      const r = await fetch(`${API}/admin/conversations`, h);
      const d = await r.json();  // ← add this
      setConvs((d.conversations || []).filter(c => c.type === "direct"));
      setSelConv(null); setMsgs([]);
    }
    if (tab === "groups") {
      const r = await fetch(`${API}/admin/conversations`, h);
      const d = await r.json();  // ← add this
      setGroups((d.conversations || []).filter(c => c.type === "group"));
      setSelGrp(null); setGrpMsgs([]);
    }
    if (tab === "public") {
      const r = await fetch(`${API}/admin/messages/public`, h);
      const d = await r.json();  // ← add this
      setPubMsgs(d.messages || []);
    }
  } catch (e) {
    showToast("Fetch error: " + e.message, "error");
  }
  setLoading(false);
}

async function loadMsgs(convId, isGroup) {
  const r = await fetch(`${API}/admin/messages/${convId}`, h);
  const d = await r.json();  // ← add this
  console.log('[loadMsgs] convId:', convId, 'response:', d); // ← add this
  if (isGroup) { setSelGrp(convId); setGrpMsgs(d.messages || []); }
  else         { setSelConv(convId); setMsgs(d.messages || []); }
}

  /* ─── mutations ─── */
  async function delMsg(id, scope) {
    ask(`Delete this message permanently?`, async () => {
      await fetch(`${API}/admin/messages/${id}`, { method: "DELETE", ...h });
      showToast("Message deleted");
      if (scope === "pub")   setPubMsgs(p => p.filter(m => m.messageId !== id));
      else if (scope === "grp") setGrpMsgs(p => p.filter(m => m.messageId !== id));
      else                   setMsgs(p => p.filter(m => m.messageId !== id));
    });
  }

  async function delUser(uid) {
    ask("Delete this user? This cannot be undone.", async () => {
      await fetch(`${API}/admin/users/${uid}`, { method: "DELETE", ...h });
      setUsers(u => u.filter(x => x._id !== uid));
      showToast("User deleted");
    });
  }

async function saveUser() {
  const url    = editUser ? `${API}/admin/users/${editUser._id}` : `${API}/admin/users`;
  const method = editUser ? "PUT" : "POST";
  const r = await fetch(url, {
    method, 
    headers: { ...h.headers, "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });
  const d = await r.json();  // ← add this
  if (!d.success) return showToast(d.message || "Error", "error");
  showToast(editUser ? "User updated" : "User created");
  setShowForm(false); setEditUser(null); setForm({});
  load();
}

async function savePwd() {
  if (newPwd.length < 6) return showToast("Min 6 characters", "error");
  const r = await fetch(`${API}/admin/users/${pwdTarget._id}/password`, {
    method: "PUT",
    headers: { ...h.headers, "Content-Type": "application/json" },
    body: JSON.stringify({ password: newPwd }),
  });
  const d = await r.json();  // ← add this
  d.success ? showToast("Password changed") : showToast(d.message, "error");
  setPwdTarget(null); setNewPwd("");
}
  async function delMeeting(roomId) {
    ask("Delete this meeting?", async () => {
      await fetch(`${API}/admin/meetings/${roomId}`, { method: "DELETE", ...h });
      setMeetings(m => m.filter(x => x.roomId !== roomId));
      showToast("Meeting deleted");
    });
  }

  async function delOutlook(id) {
    ask("Delete this Outlook event?", async () => {
      await fetch(`${API}/admin/outlook/${id}`, { method: "DELETE", ...h });
      setOutlook(o => o.filter(x => x._id !== id));
      showToast("Event deleted");
    });
  }

  async function delConv(convId) {
    ask("Delete entire conversation + all messages?", async () => {
      await fetch(`${API}/admin/conversations/${convId}`, { method: "DELETE", ...h });
      setConvs(c => c.filter(x => x.conversationId !== convId));
      setGroups(c => c.filter(x => x.conversationId !== convId));
      showToast("Conversation deleted");
    });
  }

  async function toggleAdmin(u) {
    const r = await fetch(`${API}/admin/users/${u._id}`, {
      method: "PUT", ...h,
      headers: { ...h.headers, "Content-Type": "application/json" },
      body: JSON.stringify({ isAdmin: !u.isAdmin }),
    });
    const d = await r.json();
    if (d.success) {
      setUsers(prev => prev.map(x => x._id === u._id ? { ...x, isAdmin: !u.isAdmin } : x));
      showToast(`Admin ${!u.isAdmin ? "granted" : "revoked"}`);
    }
  }

  /* ── filter helpers ── */
  const filteredUsers = users.filter(u =>
    !userSearch ||
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredConvs = convs.filter(c =>
    !convSearch || c.memberNames?.join(" ").toLowerCase().includes(convSearch.toLowerCase())
  );

  const filteredGroups = groups.filter(g =>
    !convSearch || g.groupName?.toLowerCase().includes(convSearch.toLowerCase())
  );

  /* ── stats for overview ── */
  const admins  = users.filter(u => u.isAdmin).length;
  const active  = meetings.filter(m => m.isActive).length;

  return (
    <div style={s.shell}>
      {/* ── grid noise bg ── */}
      <div style={s.gridBg} />

      {/* ── sidebar ── */}
      <aside style={{ ...s.sidebar, transform: sideOpen || window.innerWidth > 900 ? "translateX(0)" : "translateX(-100%)" }}>
        <div style={s.brand}>
          <span style={s.brandDot} />
          <span style={s.brandText}>CTRL<span style={s.brandAccent}>PANEL</span></span>
        </div>
        <div style={s.divider} />
        {NAV.map(n => (
          <button key={n.id} onClick={() => { setTab(n.id); setSide(false); }}
            style={{ ...s.navBtn, ...(tab === n.id ? s.navActive : {}) }}>
            <span style={s.navIcon}>{n.icon}</span>
            <span>{n.label}</span>
            {tab === n.id && <span style={s.navPip} />}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={s.sideFooter}>
          <span style={s.footerDot} />
          <span style={{ fontSize: 11, color: "#64748b" }}>Admin Session Active</span>
        </div>
      </aside>

      {/* ── main ── */}
      <main style={s.main}>
        {/* topbar */}
        <div style={s.topbar}>
          <button style={s.menuBtn} onClick={() => setSide(v => !v)}>☰</button>
          <h1 style={s.pageTitle}>{NAV.find(n => n.id === tab)?.label}</h1>
          <div style={s.topRight}>
            {loading && <span style={s.spinner}>⟳</span>}
            <button style={s.refreshBtn} onClick={load}>↻ Refresh</button>
          </div>
        </div>

        <div style={s.content}>

          {/* ══ OVERVIEW ══════════════════════════════════════════════════ */}
          {tab === "overview" && (
            <div>
              <div style={s.statGrid}>
                {[
                  { label: "Total Users",    val: users.length,    color: "#6366f1", icon: "◈" },
                  { label: "Admins",         val: admins,          color: "#f59e0b", icon: "★" },
                  { label: "Meetings",       val: meetings.length, color: "#10b981", icon: "◆" },
                  { label: "Outlook Events", val: outlook.length,  color: "#3b82f6", icon: "◇" },
                ].map(st => (
                  <div key={st.label} style={{ ...s.statCard, borderTopColor: st.color }}>
                    <div style={{ ...s.statIcon, color: st.color }}>{st.icon}</div>
                    <div style={s.statVal}>{st.val}</div>
                    <div style={s.statLabel}>{st.label}</div>
                  </div>
                ))}
              </div>

              <div style={s.overviewGrid}>
                <div style={s.panel}>
                  <div style={s.panelHead}>Recent Users</div>
                  {users.slice(0, 6).map(u => (
                    <div key={u._id} style={s.overviewRow}>
                      <Avatar name={u.name} pic={u.profilePicUrl} size={30} />
                      <div style={{ marginLeft: 10, flex: 1, minWidth: 0 }}>
                        <div style={s.overviewName}>{u.name}</div>
                        <div style={s.overviewSub}>{u.email}</div>
                      </div>
                      <Tag label={u.role} />
                      {u.isAdmin && <Tag label="Admin" color="#f59e0b" />}
                    </div>
                  ))}
                </div>

                <div style={s.panel}>
                  <div style={s.panelHead}>Recent Meetings</div>
                  {meetings.slice(0, 6).map(m => (
                    <div key={m.roomId} style={s.overviewRow}>
                      <span style={{ fontSize: 18, color: "#10b981" }}>◆</span>
                      <div style={{ marginLeft: 10, flex: 1 }}>
                        <div style={s.overviewName}>{m.title || "Untitled"}</div>
                        <div style={s.overviewSub}>{m.roomId} · {ago(m.createdAt)}</div>
                      </div>
                      <Tag label={m.isActive ? "Active" : "Done"} color={m.isActive ? "#10b981" : "#64748b"} />
                    </div>
                  ))}
                  {meetings.length === 0 && <Empty />}
                </div>
              </div>
            </div>
          )}

          {/* ══ USERS ══════════════════════════════════════════════════ */}
          {tab === "users" && (
            <div>
              <div style={s.toolbar}>
                <input style={s.searchInput} placeholder="Search users…"
                  value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                <button style={s.primaryBtn} onClick={() => { setShowForm(true); setEditUser(null); setForm({}); }}>
                  + Add User
                </button>
              </div>

              {/* ── Add/Edit Form ── */}
              {showForm && (
                <div style={s.formCard}>
                  <div style={s.formTitle}>{editUser ? "✏ Edit User" : "+ New User"}</div>
                  <div style={s.formGrid}>
                    {[["name","Name"],["email","Email"],["role","Role"],["location","Location"]].map(([k,l]) => (
                      <div key={k}>
                        <label style={s.label}>{l}</label>
                        {k === "role" ? (
                          <select style={s.input} value={form[k] || ""} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}>
                            <option value="">Select…</option>
                            {["manager","developer","designer","qa","hr","sales","other"].map(r =>
                              <option key={r} value={r}>{r}</option>)}
                          </select>
                        ) : k === "location" ? (
                          <select style={s.input} value={form[k] || ""} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}>
                            <option value="">Select…</option>
                            <option value="mumbai">Mumbai</option>
                            <option value="chennai">Chennai</option>
                          </select>
                        ) : (
                          <input style={s.input} placeholder={l} value={form[k] || ""}
                            onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} />
                        )}
                      </div>
                    ))}
                    {!editUser && (
                      <div>
                        <label style={s.label}>Password</label>
                        <input type="password" style={s.input} placeholder="Password"
                          value={form.password || ""} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                      </div>
                    )}
                  </div>
                  <label style={{ ...s.label, display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                    <input type="checkbox" checked={!!form.isAdmin}
                      onChange={e => setForm(p => ({ ...p, isAdmin: e.target.checked }))} />
                    Grant Admin Access
                  </label>
                  <div style={s.formActions}>
                    <button style={s.primaryBtn} onClick={saveUser}>Save</button>
                    <button style={s.ghostBtn} onClick={() => { setShowForm(false); setEditUser(null); setForm({}); }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* ── Change Password Modal ── */}
              {pwdTarget && (
                <div style={s.formCard}>
                  <div style={s.formTitle}>🔑 Change Password — {pwdTarget.name}</div>
                  <input type="password" style={{ ...s.input, marginBottom: 12 }} placeholder="New password (min 6)"
                    value={newPwd} onChange={e => setNewPwd(e.target.value)} />
                  <div style={s.formActions}>
                    <button style={s.primaryBtn} onClick={savePwd}>Save Password</button>
                    <button style={s.ghostBtn} onClick={() => { setPwdTarget(null); setNewPwd(""); }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* ── Users Table ── */}
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {["User","Email","Role","Location","Admin","Joined","Actions"].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u._id} style={s.tr}>
                        <td style={s.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Avatar name={u.name} pic={u.profilePicUrl} size={32} />
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</span>
                          </div>
                        </td>
                        <td style={s.td}><span style={s.mono}>{u.email}</span></td>
                        <td style={s.td}><Tag label={u.role} /></td>
                        <td style={s.td}><Tag label={u.location} color="#3b82f6" /></td>
                        <td style={s.td}>
                          <button style={{ ...s.pillToggle, background: u.isAdmin ? "#fef3c7" : "#f1f5f9", color: u.isAdmin ? "#d97706" : "#64748b" }}
                            onClick={() => toggleAdmin(u)}>
                            {u.isAdmin ? "✓ Admin" : "— User"}
                          </button>
                        </td>
                        <td style={s.td}><span style={{ fontSize: 12, color: "#64748b" }}>{ago(u.createdAt)}</span></td>
                        <td style={s.td}>
                          <div style={s.actions}>
                            <Btn icon="✏" label="Edit" color="#6366f1" onClick={() => {
                              setEditUser(u); setShowForm(true);
                              setForm({ name: u.name, email: u.email, role: u.role, location: u.location, isAdmin: u.isAdmin });
                            }} />
                            <Btn icon="🔑" label="Pwd" color="#f59e0b" onClick={() => setPwdTarget(u)} />
                            <Btn icon="✕" label="Del" color="#ef4444" onClick={() => delUser(u._id)} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && <Empty />}
              </div>
            </div>
          )}

          {/* ══ DIRECT CHATS ══════════════════════════════════════════════ */}
          {tab === "chats" && (
            <div style={s.splitPane}>
              <div style={s.paneLeft}>
                <input style={{ ...s.searchInput, marginBottom: 10 }} placeholder="Search…"
                  value={convSearch} onChange={e => setConvSearch(e.target.value)} />
                {filteredConvs.map(c => (
                  <div key={c.conversationId}
                    style={{ ...s.convItem, ...(selConv === c.conversationId ? s.convActive : {}) }}
                    onClick={() => loadMsgs(c.conversationId, false)}>
                    <div style={s.convName}>{c.memberNames?.join(" & ") || c.conversationId}</div>
                    <div style={s.convSub}>{ago(c.updatedAt)}</div>
                    <button style={s.delSmall} onClick={e => { e.stopPropagation(); delConv(c.conversationId); }}>✕</button>
                  </div>
                ))}
                {filteredConvs.length === 0 && <Empty text="No chats" />}
              </div>
              <div style={s.paneRight}>
                {selConv ? (
                  msgs.length ? msgs.map(m => <MsgBubble key={m.messageId} m={m} onDel={() => delMsg(m.messageId, "dm")} />)
                  : <Empty text="No messages" />
                ) : <Empty text="Select a conversation" />}
              </div>
            </div>
          )}

          {/* ══ PUBLIC FEED ══════════════════════════════════════════════ */}
          {tab === "public" && (
            <div>
              <div style={s.panelHead}>Public Channel — {pubMsgs.length} messages</div>
              {pubMsgs.map(m => <MsgBubble key={m.messageId} m={m} onDel={() => delMsg(m.messageId, "pub")} />)}
              {pubMsgs.length === 0 && <Empty />}
            </div>
          )}

          {/* ══ GROUPS ══════════════════════════════════════════════════ */}
          {tab === "groups" && (
            <div style={s.splitPane}>
              <div style={s.paneLeft}>
                <input style={{ ...s.searchInput, marginBottom: 10 }} placeholder="Search groups…"
                  value={convSearch} onChange={e => setConvSearch(e.target.value)} />
                {filteredGroups.map(g => (
                  <div key={g.conversationId}
                    style={{ ...s.convItem, ...(selGrp === g.conversationId ? s.convActive : {}) }}
                    onClick={() => loadMsgs(g.conversationId, true)}>
                    <div style={s.convName}>{g.groupName || g.conversationId}</div>
                    <div style={s.convSub}>{g.memberIds?.length} members · {ago(g.updatedAt)}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                      {g.memberNames?.slice(0,3).join(", ")}{g.memberNames?.length > 3 ? "…" : ""}
                    </div>
                    <button style={s.delSmall} onClick={e => { e.stopPropagation(); delConv(g.conversationId); }}>✕</button>
                  </div>
                ))}
                {filteredGroups.length === 0 && <Empty text="No groups" />}
              </div>
              <div style={s.paneRight}>
                {selGrp ? (
                  grpMsgs.length ? grpMsgs.map(m => <MsgBubble key={m.messageId} m={m} onDel={() => delMsg(m.messageId, "grp")} />)
                  : <Empty text="No messages" />
                ) : <Empty text="Select a group" />}
              </div>
            </div>
          )}

          {/* ══ MEETINGS ══════════════════════════════════════════════════ */}
          {tab === "meetings" && (
            <div>
              <div style={s.panelHead}>{meetings.length} total meetings</div>
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {["Title","Room ID","Host","Scheduled","Duration","Participants","Status","Actions"].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {meetings.map(m => (
                      <tr key={m.roomId} style={s.tr}>
                        <td style={s.td}><b style={{ fontSize: 13 }}>{m.title || "Untitled"}</b></td>
                        <td style={s.td}><span style={s.mono}>{m.roomId}</span></td>
                        <td style={s.td}><span style={{ fontSize: 12 }}>{m.hostId?.slice(0,8)}…</span></td>
                        <td style={s.td}><span style={{ fontSize: 12 }}>{m.scheduledAt ? fmt(m.scheduledAt) : "Instant"}</span></td>
                        <td style={s.td}><Tag label={`${m.durationMinutes}m`} color="#6366f1" /></td>
                        <td style={s.td}><Tag label={`${m.participants?.length || 0} ppl`} /></td>
                        <td style={s.td}><Tag label={m.isActive ? "Active" : "Done"} color={m.isActive ? "#10b981" : "#64748b"} /></td>
                        <td style={s.td}>
                          <Btn icon="✕" label="Delete" color="#ef4444" onClick={() => delMeeting(m.roomId)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {meetings.length === 0 && <Empty />}
              </div>
            </div>
          )}

          {/* ══ OUTLOOK ══════════════════════════════════════════════════ */}
          {tab === "outlook" && (
            <div>
              <div style={s.panelHead}>{outlook.length} synced events</div>
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {["Subject","User","Start","End","Location","Actions"].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {outlook.map(e => (
                      <tr key={e._id} style={s.tr}>
                        <td style={s.td}><b style={{ fontSize: 13 }}>{e.subject || "—"}</b></td>
                        <td style={s.td}><span style={s.mono}>{e.userId?.slice(0,10)}…</span></td>
                        <td style={s.td}><span style={{ fontSize: 12 }}>{fmt(e.start)}</span></td>
                        <td style={s.td}><span style={{ fontSize: 12 }}>{fmt(e.end)}</span></td>
                        <td style={s.td}><span style={{ fontSize: 12 }}>{e.location || "—"}</span></td>
                        <td style={s.td}>
                          <Btn icon="✕" label="Delete" color="#ef4444" onClick={() => delOutlook(e._id)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {outlook.length === 0 && <Empty />}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── Toast ── */}
      {toast && (
        <div style={{ ...s.toast, background: toast.type === "error" ? "#ef4444" : "#10b981" }}>
          {toast.type === "error" ? "✕ " : "✓ "}{toast.msg}
        </div>
      )}

      {/* ── Confirm Dialog ── */}
      {confirm && (
        <div style={s.overlay}>
          <div style={s.dialog}>
            <div style={s.dialogIcon}>⚠</div>
            <div style={s.dialogMsg}>{confirm.msg}</div>
            <div style={s.dialogActions}>
              <button style={s.dangerBtn} onClick={() => { confirm.onOk(); setConfirm(null); }}>Confirm</button>
              <button style={s.ghostBtn} onClick={() => setConfirm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ─── */
function Avatar({ name, pic, size = 36 }) {
  const colors = ["#6366f1","#f59e0b","#10b981","#3b82f6","#ef4444","#8b5cf6"];
  const bg = colors[(name?.charCodeAt(0) || 0) % colors.length];
  const initials = name?.split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase() || "?";
  return pic
    ? <img src={pic} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: size * 0.38, flexShrink: 0, fontFamily: "monospace" }}>{initials}</div>;
}

function Tag({ label, color = "#64748b" }) {
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, background: color + "1a", color, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {label}
    </span>
  );
}

function Btn({ icon, label, color, onClick }) {
  return (
    <button onClick={onClick} title={label}
      style={{ padding: "4px 10px", fontSize: 12, background: color + "15", border: `1px solid ${color}33`, color, borderRadius: 6, cursor: "pointer", fontWeight: 600, transition: "all .15s" }}
      onMouseEnter={e => e.currentTarget.style.background = color + "30"}
      onMouseLeave={e => e.currentTarget.style.background = color + "15"}>
      {icon} {label}
    </button>
  );
}

function MsgBubble({ m, onDel }) {
  const badges = [];
  if (m.deletedForEveryone)  badges.push({ label: "🗑 Deleted", color: "#ef4444" });
  else if (m.isDeleted)      badges.push({ label: "🗑 Deleted (some)", color: "#f97316" });
  if (m.isForwarded)         badges.push({ label: "↪ Forwarded", color: "#6366f1" });
  if (m.replyToId)           badges.push({ label: "↩ Reply", color: "#6366f1" });
  if (m.isEdited)            badges.push({ label: "✏ Edited", color: "#6366f1" });
  if (m.pinnedBy)            badges.push({ label: "📌 Pinned", color: "#6366f1" });

  return (
    <div style={{
      padding: "10px 14px", borderRadius: 10, marginBottom: 6,
      background: m.deletedForEveryone ? "#fff5f5" : m.isDeleted ? "#fff8f0" : "#f8fafc",
      border: `1px solid ${m.deletedForEveryone ? "#fecaca" : m.isDeleted ? "#fed7aa" : "#e2e8f0"}`,
      position: "relative", opacity: m.deletedForEveryone ? 0.75 : 1,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Avatar name={m.senderName || m.fromName} size={26} />
          <div>
            <span style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>
              {m.senderName || m.fromName}
            </span>
            <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 8 }}>
              {ago(m.sentAt)}
            </span>
          </div>
        </div>
        <button onClick={onDel} style={{
          padding: "2px 8px", fontSize: 11, background: "#fee2e2",
          border: "1px solid #fca5a5", color: "#ef4444",
          borderRadius: 5, cursor: "pointer", fontWeight: 700,
        }}>✕ Delete</button>
      </div>

      {/* ── Badges ── */}
      {badges.length > 0 && (
        <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
          {badges.map(b => (
            <span key={b.label} style={{
              display: "inline-block", padding: "2px 8px", borderRadius: 4,
              background: b.color + "1a", color: b.color,
              fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
            }}>
              {b.label}
            </span>
          ))}
        </div>
      )}

      {/* ── Reply preview ── */}
      {m.replyToId && m.replyToContent && (
        <div style={{
          margin: "6px 0 4px", padding: "6px 10px",
          background: "#f1f5f9", borderLeft: "3px solid #6366f1",
          borderRadius: 4, fontSize: 12, color: "#64748b",
        }}>
          <span style={{ fontWeight: 700 }}>{m.replyToSender}: </span>
          {m.replyToContent}
        </div>
      )}

      {/* ── Message content ── */}
      <div style={{
        marginTop: 6, fontSize: 13, color: "#334155",
        lineHeight: 1.5, wordBreak: "break-word",
        textDecoration: m.deletedForEveryone ? "line-through" : "none",
        fontStyle: m.deletedForEveryone ? "italic" : "normal",
      }}>
        {m.deletedForEveryone ? "This message was deleted" : m.content}
      </div>

      {/* ── File attachment ── */}
      {m.fileName && (
        <div style={{ marginTop: 4, fontSize: 11, color: "#64748b" }}>
          📎 {m.fileName} {m.fileSize ? `(${(m.fileSize / 1024).toFixed(1)}KB)` : ""}
        </div>
      )}

      {/* ── deletedFor list (admin only info) ── */}
      {m.isDeleted && !m.deletedForEveryone && m.deletedFor?.length > 0 && (
        <div style={{ marginTop: 4, fontSize: 10, color: "#94a3b8" }}>
          Hidden for: {m.deletedFor.join(", ")}
        </div>
      )}
    </div>
  );
}

function Empty({ text = "No data to display" }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8", fontSize: 13 }}>
      <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>◎</div>
      {text}
    </div>
  );
}

/* ─── Styles ─── */
const s = {
  shell: {
    display: "flex", height: "100vh", overflow: "hidden",
    background: "#f1f5f9", fontFamily: "'DM Mono', 'Courier New', monospace",
    position: "relative",
  },
  gridBg: {
    position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
    backgroundImage: `linear-gradient(rgba(99,102,241,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,.04) 1px, transparent 1px)`,
    backgroundSize: "40px 40px",
  },
  sidebar: {
    width: 220, background: "#0f172a", display: "flex", flexDirection: "column",
    padding: "0 0 16px", zIndex: 100, flexShrink: 0,
    transition: "transform .25s", position: "relative",
  },
  brand: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "20px 20px 16px", borderBottom: "1px solid #1e293b",
  },
  brandDot: {
    width: 8, height: 8, borderRadius: "50%", background: "#6366f1",
    boxShadow: "0 0 8px #6366f1",
  },
  brandText: { fontSize: 15, fontWeight: 900, color: "#f1f5f9", letterSpacing: "0.12em" },
  brandAccent: { color: "#6366f1" },
  divider: { height: 1, background: "#1e293b", margin: "4px 0 8px" },
  navBtn: {
    display: "flex", alignItems: "center", gap: 10, padding: "10px 20px",
    background: "none", border: "none", color: "#64748b", cursor: "pointer",
    fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textAlign: "left",
    width: "100%", transition: "all .15s", position: "relative",
    fontFamily: "inherit",
  },
  navActive: { color: "#f1f5f9", background: "#1e293b" },
  navIcon: { fontSize: 14, width: 18, textAlign: "center" },
  navPip: {
    position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
    width: 3, height: 20, background: "#6366f1", borderRadius: "2px 0 0 2px",
  },
  sideFooter: {
    display: "flex", alignItems: "center", gap: 8, padding: "12px 20px 0",
    borderTop: "1px solid #1e293b", marginTop: 8,
  },
  footerDot: {
    width: 6, height: 6, borderRadius: "50%", background: "#10b981",
    boxShadow: "0 0 6px #10b981",
  },
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 1 },
  topbar: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "14px 24px", background: "#fff",
    borderBottom: "1px solid #e2e8f0", flexShrink: 0,
    boxShadow: "0 1px 4px rgba(0,0,0,.06)",
  },
  menuBtn: {
    display: "none", background: "none", border: "none", fontSize: 20,
    cursor: "pointer", color: "#64748b", padding: "4px 8px",
    "@media (max-width:900px)": { display: "block" },
  },
  pageTitle: { fontSize: 15, fontWeight: 800, color: "#0f172a", letterSpacing: "0.08em", margin: 0, flex: 1 },
  topRight: { display: "flex", alignItems: "center", gap: 10 },
  spinner: { fontSize: 18, color: "#6366f1", animation: "spin 1s linear infinite" },
  refreshBtn: {
    padding: "6px 14px", background: "#f1f5f9", border: "1px solid #e2e8f0",
    borderRadius: 6, fontSize: 12, cursor: "pointer", fontWeight: 600,
    color: "#475569", fontFamily: "inherit",
  },
  content: { flex: 1, overflow: "auto", padding: 24 },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 16, marginBottom: 24 },
  statCard: {
    background: "#fff", borderRadius: 10, padding: "16px 20px",
    borderTop: "3px solid #6366f1", boxShadow: "0 1px 6px rgba(0,0,0,.06)",
  },
  statIcon: { fontSize: 20, marginBottom: 8 },
  statVal: { fontSize: 28, fontWeight: 900, color: "#0f172a", lineHeight: 1 },
  statLabel: { fontSize: 11, color: "#94a3b8", marginTop: 4, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" },
  overviewGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  panel: { background: "#fff", borderRadius: 10, padding: 16, boxShadow: "0 1px 6px rgba(0,0,0,.06)" },
  panelHead: { fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, padding: "0 0 8px", borderBottom: "1px solid #f1f5f9" },
  overviewRow: { display: "flex", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f8fafc" },
  overviewName: { fontSize: 13, fontWeight: 600, color: "#1e293b" },
  overviewSub: { fontSize: 11, color: "#94a3b8" },
  toolbar: { display: "flex", gap: 10, marginBottom: 16, alignItems: "center" },
  searchInput: {
    flex: 1, padding: "8px 14px", border: "1px solid #e2e8f0", borderRadius: 8,
    fontSize: 13, outline: "none", background: "#fff", fontFamily: "inherit",
    color: "#1e293b",
  },
  primaryBtn: {
    padding: "8px 16px", background: "#6366f1", color: "#fff", border: "none",
    borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
    fontFamily: "inherit", letterSpacing: "0.05em", whiteSpace: "nowrap",
  },
  ghostBtn: {
    padding: "8px 16px", background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0",
    borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
  },
  dangerBtn: {
    padding: "8px 16px", background: "#ef4444", color: "#fff", border: "none",
    borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
  },
  formCard: {
    background: "#fff", borderRadius: 10, padding: 20, marginBottom: 16,
    border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,.08)",
  },
  formTitle: { fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 14, letterSpacing: "0.05em" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 },
  label: { display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" },
  input: {
    width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6,
    fontSize: 13, outline: "none", background: "#f8fafc", fontFamily: "inherit",
    color: "#1e293b", boxSizing: "border-box",
  },
  formActions: { display: "flex", gap: 8, marginTop: 14 },
  tableWrap: { background: "#fff", borderRadius: 10, overflow: "auto", boxShadow: "0 1px 6px rgba(0,0,0,.06)" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 800,
    color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase",
    background: "#f8fafc", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap",
  },
  tr: { borderBottom: "1px solid #f1f5f9", transition: "background .1s" },
  td: { padding: "10px 14px", verticalAlign: "middle" },
  mono: { fontFamily: "monospace", fontSize: 12, color: "#64748b", background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 },
  pillToggle: {
    padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
    border: "none", cursor: "pointer", fontFamily: "inherit",
  },
  actions: { display: "flex", gap: 4, flexWrap: "wrap" },
  splitPane: { display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, height: "calc(100vh - 120px)" },
  paneLeft: {
    background: "#fff", borderRadius: 10, padding: 12, overflow: "auto",
    boxShadow: "0 1px 6px rgba(0,0,0,.06)",
  },
  paneRight: {
    background: "#fff", borderRadius: 10, padding: 12, overflow: "auto",
    boxShadow: "0 1px 6px rgba(0,0,0,.06)",
  },
  convItem: {
    padding: "10px 12px", borderRadius: 8, marginBottom: 4, cursor: "pointer",
    background: "#f8fafc", position: "relative", transition: "background .1s",
    border: "1px solid transparent",
  },
  convActive: { background: "#eef2ff", border: "1px solid #c7d2fe" },
  convName: { fontSize: 13, fontWeight: 700, color: "#1e293b", paddingRight: 24 },
  convSub: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  delSmall: {
    position: "absolute", top: 8, right: 8, background: "#fee2e2",
    border: "none", color: "#ef4444", cursor: "pointer", borderRadius: 4,
    fontSize: 10, padding: "2px 5px", fontWeight: 700,
  },
  toast: {
    position: "fixed", bottom: 24, right: 24, padding: "12px 20px",
    borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 13,
    zIndex: 9999, boxShadow: "0 4px 14px rgba(0,0,0,.2)",
    fontFamily: "inherit",
  },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(15,23,42,.6)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9998,
    backdropFilter: "blur(3px)",
  },
  dialog: {
    background: "#fff", borderRadius: 14, padding: 28, maxWidth: 360, width: "90%",
    boxShadow: "0 20px 60px rgba(0,0,0,.25)", textAlign: "center",
  },
  dialogIcon: { fontSize: 32, marginBottom: 12, color: "#f59e0b" },
  dialogMsg: { fontSize: 14, color: "#1e293b", marginBottom: 20, lineHeight: 1.6 },
  dialogActions: { display: "flex", gap: 10, justifyContent: "center" },
};