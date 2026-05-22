import { useState, useEffect } from "react";

const API = "https://chatter-backend-4i7g.onrender.com";

const tabs = ["Users", "Chats", "Public", "Groups", "Meetings", "Outlook"];

export default function AdminPanel({ token }) {
  const [activeTab, setActiveTab] = useState("Users");
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [outlook, setOutlook] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [publicMessages, setPublicMessages] = useState([]);
  const [editUser, setEditUser] = useState(null);
  const [newUser, setNewUser] = useState(false);
  const [form, setForm] = useState({});
  const [pwdUser, setPwdUser] = useState(null);
  const [pwd, setPwd] = useState("");
  const [toast, setToast] = useState("");

  const h = { headers: { Authorization: `Bearer ${token}` } };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  useEffect(() => { fetchTab(); }, [activeTab]);

  const fetchTab = async () => {
    if (activeTab === "Users") {
      const r = await fetch(`${API}/admin/users`, h);
      setUsers(r.data.users || []);
    } else if (activeTab === "Chats" || activeTab === "Groups") {
      const r = await fetch(`${API}/admin/conversations`, h);
      const type = activeTab === "Groups" ? "group" : "direct";
      setConversations((r.data.conversations || []).filter(c => c.type === type));
      setSelectedConv(null); setMessages([]);
    } else if (activeTab === "Public") {
      const r = await fetch(`${API}/admin/messages/public`, h);
      setPublicMessages(r.data.messages || []);
    } else if (activeTab === "Meetings") {
      const r = await fetch(`${API}/admin/meetings`, h);
      setMeetings(r.data.meetings || []);
    } else if (activeTab === "Outlook") {
      const r = await fetch(`${API}/admin/outlook`, h);
      setOutlook(r.data.events || []);
    }
  };

  const loadMessages = async (convId) => {
    setSelectedConv(convId);
    const r = await fetch(`${API}/admin/messages/${convId}`, h);
    setMessages(r.data.messages || []);
  };

  const deleteMessage = async (messageId, isPub) => {
    await fetch(`${API}/admin/messages/${messageId}`, h);
    showToast("Message deleted");
    if (isPub) setPublicMessages(p => p.filter(m => m.messageId !== messageId));
    else setMessages(p => p.filter(m => m.messageId !== messageId));
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("Delete this user?")) return;
    await fetch(`${API}/admin/users/${userId}`, h);
    setUsers(u => u.filter(x => x._id !== userId));
    showToast("User deleted");
  };

  const saveUser = async () => {
    if (editUser) {
      await fetch(`${API}/admin/users/${editUser._id}`, form, h);
      showToast("User updated");
    } else {
      await fetch(`${API}/admin/users`, form, h);
      showToast("User created");
    }
    setEditUser(null); setNewUser(false); setForm({});
    fetchTab();
  };

  const changePassword = async () => {
    await fetch(`${API}/admin/users/${pwdUser._id}/password`, { password: pwd }, h);
    showToast("Password changed"); setPwdUser(null); setPwd("");
  };

  const deleteMeeting = async (roomId) => {
    await fetch(`${API}/admin/meetings/${roomId}`, h);
    setMeetings(m => m.filter(x => x.roomId !== roomId));
    showToast("Meeting deleted");
  };

  const deleteOutlook = async (id) => {
    await fetch(`${API}/admin/outlook/${id}`, h);
    setOutlook(o => o.filter(x => x._id !== id));
    showToast("Event deleted");
  };

  const deleteConversation = async (convId) => {
    if (!window.confirm("Delete entire conversation?")) return;
    await fetch(`${API}/admin/conversations/${convId}`, h);
    setConversations(c => c.filter(x => x.conversationId !== convId));
    showToast("Conversation deleted");
  };

  const msgBadge = (msg) => {
    const badges = [];
    if (msg.isForwarded) badges.push("↪ Forwarded");
    if (msg.replyToId)   badges.push("↩ Reply");
    if (msg.isEdited)    badges.push("✏ Edited");
    if (msg.pinnedBy)    badges.push("📌 Pinned");
    return badges;
  };

  return (
    <div style={{ fontFamily: "sans-serif", padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, background: "#333", color: "#fff", padding: "10px 20px", borderRadius: 8, zIndex: 9999 }}>
          {toast}
        </div>
      )}

      <h2 style={{ marginBottom: 16 }}>🛡 Admin Panel</h2>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ padding: "8px 18px", borderRadius: 20, border: "none", cursor: "pointer",
              background: activeTab === t ? "#4f46e5" : "#e5e7eb", color: activeTab === t ? "#fff" : "#111" }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── USERS ── */}
      {activeTab === "Users" && (
        <div>
          <button onClick={() => { setNewUser(true); setEditUser(null); setForm({}); }}
            style={{ marginBottom: 12, padding: "8px 16px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
            + Add User
          </button>

          {(newUser || editUser) && (
            <div style={{ background: "#f3f4f6", padding: 16, borderRadius: 10, marginBottom: 16 }}>
              <h4>{editUser ? "Edit User" : "New User"}</h4>
              {["name","email","role","location"].map(f => (
                <input key={f} placeholder={f} value={form[f] || ""}
                  onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                  style={{ display: "block", width: "100%", marginBottom: 8, padding: 8, borderRadius: 6, border: "1px solid #d1d5db" }} />
              ))}
              {!editUser && (
                <input placeholder="password" type="password" value={form.password || ""}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  style={{ display: "block", width: "100%", marginBottom: 8, padding: 8, borderRadius: 6, border: "1px solid #d1d5db" }} />
              )}
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <input type="checkbox" checked={!!form.isAdmin}
                  onChange={e => setForm(p => ({ ...p, isAdmin: e.target.checked }))} />
                Is Admin
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveUser} style={{ padding: "8px 16px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Save</button>
                <button onClick={() => { setEditUser(null); setNewUser(false); setForm({}); }}
                  style={{ padding: "8px 16px", background: "#e5e7eb", border: "none", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          )}

          {pwdUser && (
            <div style={{ background: "#fef9c3", padding: 16, borderRadius: 10, marginBottom: 16 }}>
              <h4>Change Password — {pwdUser.name}</h4>
              <input type="password" placeholder="New password" value={pwd} onChange={e => setPwd(e.target.value)}
                style={{ padding: 8, borderRadius: 6, border: "1px solid #d1d5db", marginRight: 8 }} />
              <button onClick={changePassword} style={{ padding: "8px 16px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Save</button>
              <button onClick={() => setPwdUser(null)} style={{ marginLeft: 8, padding: "8px 16px", background: "#e5e7eb", border: "none", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
            </div>
          )}

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                {["Name","Email","Role","Location","Admin","Actions"].map(h => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 13 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                    {u.profilePicUrl && <img src={u.profilePicUrl} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />}
                    {u.name}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 13 }}>{u.email}</td>
                  <td style={{ padding: "10px 12px", fontSize: 13 }}>{u.role}</td>
                  <td style={{ padding: "10px 12px", fontSize: 13 }}>{u.location}</td>
                  <td style={{ padding: "10px 12px" }}>{u.isAdmin ? "✅" : "—"}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button onClick={() => { setEditUser(u); setNewUser(false); setForm({ name: u.name, email: u.email, role: u.role, location: u.location, isAdmin: u.isAdmin }); }}
                        style={{ padding: "4px 10px", fontSize: 12, background: "#e0e7ff", border: "none", borderRadius: 6, cursor: "pointer" }}>Edit</button>
                      <button onClick={() => setPwdUser(u)}
                        style={{ padding: "4px 10px", fontSize: 12, background: "#fef3c7", border: "none", borderRadius: 6, cursor: "pointer" }}>Password</button>
                      <button onClick={() => deleteUser(u._id)}
                        style={{ padding: "4px 10px", fontSize: 12, background: "#fee2e2", border: "none", borderRadius: 6, cursor: "pointer" }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── CHATS / GROUPS ── */}
      {(activeTab === "Chats" || activeTab === "Groups") && (
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ width: 280, flexShrink: 0 }}>
            {conversations.map(c => (
              <div key={c.conversationId}
                onClick={() => loadMessages(c.conversationId)}
                style={{ padding: "10px 12px", borderRadius: 8, marginBottom: 6, cursor: "pointer",
                  background: selectedConv === c.conversationId ? "#e0e7ff" : "#f3f4f6",
                  display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{c.groupName || c.conversationId}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{c.memberIds?.length} members</div>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteConversation(c.conversationId); }}
                  style={{ padding: "3px 8px", fontSize: 11, background: "#fee2e2", border: "none", borderRadius: 6, cursor: "pointer" }}>Del</button>
              </div>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            {messages.map(m => (
              <div key={m.messageId} style={{ padding: "10px 12px", borderRadius: 8, marginBottom: 6, background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{m.senderName || m.fromName}</span>
                    <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8 }}>{new Date(m.sentAt).toLocaleString()}</span>
                    <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                      {msgBadge(m).map(b => (
                        <span key={b} style={{ fontSize: 10, background: "#e0e7ff", borderRadius: 4, padding: "1px 6px" }}>{b}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => deleteMessage(m.messageId, false)}
                    style={{ padding: "3px 8px", fontSize: 11, background: "#fee2e2", border: "none", borderRadius: 6, cursor: "pointer" }}>Delete</button>
                </div>
                <div style={{ marginTop: 4, fontSize: 13 }}>{m.content}</div>
                {m.fileName && <div style={{ fontSize: 11, color: "#6b7280" }}>📎 {m.fileName}</div>}
              </div>
            ))}
            {selectedConv && messages.length === 0 && <div style={{ color: "#9ca3af" }}>No messages</div>}
            {!selectedConv && <div style={{ color: "#9ca3af" }}>Select a conversation</div>}
          </div>
        </div>
      )}

      {/* ── PUBLIC ── */}
      {activeTab === "Public" && (
        <div>
          {publicMessages.map(m => (
            <div key={m.messageId} style={{ padding: "10px 12px", borderRadius: 8, marginBottom: 6, background: "#f9fafb", border: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{m.senderName || m.fromName}</span>
                  <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 8 }}>{new Date(m.sentAt).toLocaleString()}</span>
                  <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                    {msgBadge(m).map(b => (
                      <span key={b} style={{ fontSize: 10, background: "#e0e7ff", borderRadius: 4, padding: "1px 6px" }}>{b}</span>
                    ))}
                  </div>
                </div>
                <button onClick={() => deleteMessage(m.messageId, true)}
                  style={{ padding: "3px 8px", fontSize: 11, background: "#fee2e2", border: "none", borderRadius: 6, cursor: "pointer" }}>Delete</button>
              </div>
              <div style={{ marginTop: 4, fontSize: 13 }}>{m.content}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── MEETINGS ── */}
      {activeTab === "Meetings" && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              {["Title","Room ID","Host","Scheduled","Duration","Actions"].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 13 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {meetings.map(m => (
              <tr key={m.roomId} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "10px 12px", fontSize: 13 }}>{m.title}</td>
                <td style={{ padding: "10px 12px", fontSize: 12, color: "#6b7280" }}>{m.roomId}</td>
                <td style={{ padding: "10px 12px", fontSize: 13 }}>{m.hostId}</td>
                <td style={{ padding: "10px 12px", fontSize: 12 }}>{m.scheduledAt ? new Date(m.scheduledAt).toLocaleString() : "Instant"}</td>
                <td style={{ padding: "10px 12px", fontSize: 13 }}>{m.durationMinutes}m</td>
                <td style={{ padding: "10px 12px" }}>
                  <button onClick={() => deleteMeeting(m.roomId)}
                    style={{ padding: "4px 10px", fontSize: 12, background: "#fee2e2", border: "none", borderRadius: 6, cursor: "pointer" }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── OUTLOOK ── */}
      {activeTab === "Outlook" && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              {["Subject","User","Start","End","Actions"].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 13 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {outlook.map(e => (
              <tr key={e._id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "10px 12px", fontSize: 13 }}>{e.subject}</td>
                <td style={{ padding: "10px 12px", fontSize: 12, color: "#6b7280" }}>{e.userId}</td>
                <td style={{ padding: "10px 12px", fontSize: 12 }}>{new Date(e.start).toLocaleString()}</td>
                <td style={{ padding: "10px 12px", fontSize: 12 }}>{new Date(e.end).toLocaleString()}</td>
                <td style={{ padding: "10px 12px" }}>
                  <button onClick={() => deleteOutlook(e._id)}
                    style={{ padding: "4px 10px", fontSize: 12, background: "#fee2e2", border: "none", borderRadius: 6, cursor: "pointer" }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}