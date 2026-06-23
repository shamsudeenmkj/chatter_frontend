import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API = 'https://chatter-backend-4i7g.onrender.com';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const fmt = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch { return '—'; }
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  } catch { return '—'; }
};

const ago = (iso) => {
  if (!iso) return '—';
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  } catch { return '—'; }
};

const AVATAR_COLORS = ['#6366F1', '#F59E0B', '#10B981', '#3B82F6', '#EC4899'];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
const initials = (name) =>
  (name ?? '?').split(' ').map((w) => (w ? w[0] : '')).slice(0, 2).join('').toUpperCase();

const NAV_ITEMS = [
  ['overview', '⬡', 'Overview'],
  ['users', '◈', 'Users'],
  ['chats', '◎', 'Direct Chats'],
  ['public', '◉', 'Public Feed'],
  ['groups', '⬡', 'Groups'],
  ['meetings', '◆', 'Meetings'],
  ['outlook', '◇', 'Outlook Events'],
  ['polls', '◈', 'Polls'],
];

const TITLES = {
  overview: 'Overview', users: 'Users', chats: 'Direct Chats',
  public: 'Public Feed', groups: 'Groups', meetings: 'Meetings',
  outlook: 'Outlook Events', polls: 'Polls',
};

const ROLES = ['manager', 'developer', 'designer', 'qa', 'hr', 'sales', 'other'];
const LOCATIONS = ['mumbai', 'chennai'];

/* ─── atoms ─────────────────────────────────────────────────────────────── */
const Avatar = ({ name, url, size = 32 }) => {
  const bg = avatarColor(name);
  const ini = initials(name);
  return url ? (
    <img src={url} alt={ini} onError={(e) => { e.target.style.display = 'none'; }}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 800, fontSize: size * 0.38, flexShrink: 0,
    }}>{ini}</div>
  );
};

const Tag = ({ label, color }) => (
  <span style={{
    display: 'inline-block', padding: '2px 8px', borderRadius: 4,
    fontSize: 10, fontWeight: 800, letterSpacing: 0.8,
    color, background: `${color}1A`, textTransform: 'uppercase',
  }}>{label}</span>
);

const Badge = ({ label, color, bg }) => (
  <span style={{
    display: 'inline-block', padding: '3px 8px', borderRadius: 20,
    fontSize: 9, fontWeight: 800, letterSpacing: 0.8,
    color: color, background: bg, textTransform: 'uppercase',
  }}>{label}</span>
);

const ActionBtn = ({ label, color, onClick }) => (
  <button onClick={onClick} style={{
    border: `1px solid ${color}55`, background: `${color}15`, color,
    borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700,
    cursor: 'pointer', whiteSpace: 'nowrap',
  }}>{label}</button>
);

const Empty = ({ text }) => (
  <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
    <div style={{ fontSize: 32, marginBottom: 8 }}>◎</div>
    <div style={{ fontSize: 13 }}>{text}</div>
  </div>
);

const Th = ({ children }) => (
  <th style={{
    textAlign: 'left', padding: '10px 14px', fontSize: 10, fontWeight: 800,
    letterSpacing: 1, color: '#94A3B8', borderBottom: '1px solid #E2E8F0',
    background: '#F8FAFC', textTransform: 'uppercase', whiteSpace: 'nowrap',
  }}>{children}</th>
);

const Td = ({ children, mono, style: extraStyle }) => (
  <td style={{
    padding: '10px 14px', fontSize: 12.5, color: '#0F172A',
    borderBottom: '1px solid #F1F5F9',
    fontFamily: mono ? 'monospace' : undefined, ...extraStyle,
  }}>{children}</td>
);

const Input = ({ style: s, ...props }) => (
  <input {...props} style={{
    height: 36, borderRadius: 8, border: '1px solid #E2E8F0',
    padding: '0 10px', fontSize: 12, outline: 'none',
    background: '#fff', ...s,
  }} />
);

const Sel = ({ value, onChange, options, style: s }) => (
  <select value={value} onChange={onChange} style={{
    height: 36, borderRadius: 8, border: '1px solid #E2E8F0',
    padding: '0 8px', fontSize: 12, background: '#fff', cursor: 'pointer', ...s,
  }}>
    {options.map((o) => (
      <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
        {typeof o === 'string' ? o : o.label}
      </option>
    ))}
  </select>
);

const DatePicker = ({ label, value, onChange }) => {
  const ref = useRef();
  return (
    <div onClick={() => ref.current?.showPicker?.()} style={{
      height: 36, borderRadius: 8, border: '1px solid #D1D5DB',
      padding: '0 10px', fontSize: 12, background: '#fff', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 6, position: 'relative', minWidth: 130,
    }}>
      <span style={{ fontSize: 13, color: '#64748B' }}>📅</span>
      <span style={{ color: value ? '#0F172A' : '#9CA3AF', fontSize: 12 }}>
        {value ? fmtDate(value) : label}
      </span>
      {value && (
        <span onClick={(e) => { e.stopPropagation(); onChange(null); }}
          style={{ marginLeft: 'auto', color: '#64748B', fontSize: 12, lineHeight: 1, cursor: 'pointer' }}>×</span>
      )}
      <input ref={ref} type="date" value={value || ''} onChange={(e) => onChange(e.target.value || null)}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
    </div>
  );
};

const SearchBox = ({ value, onChange, placeholder }) => (
  <div style={{ position: 'relative', width: 220 }}>
    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: 13 }}>🔍</span>
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={{
        width: '100%', height: 36, borderRadius: 8, border: '1px solid #E2E8F0',
        padding: '0 32px 0 32px', fontSize: 12, outline: 'none', background: '#fff', boxSizing: 'border-box',
      }} />
    {value && (
      <span onClick={() => onChange('')}
        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', cursor: 'pointer', fontSize: 14 }}>×</span>
    )}
  </div>
);

const CountBadge = ({ filtered, total }) => {
  const isFiltered = filtered !== total;
  return (
    <span style={{
      padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
      color: isFiltered ? '#6366F1' : '#64748B',
      background: isFiltered ? '#EEF2FF' : '#F1F5F9',
      border: `1px solid ${isFiltered ? '#C7D2FE' : '#E2E8F0'}`,
    }}>
      {isFiltered ? `${filtered} of ${total}` : `${total} total`}
    </span>
  );
};

const FilterBar = ({ children }) => (
  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', padding: '12px 16px 0' }}>
    {children}
  </div>
);

const ClearBtn = ({ onClick }) => (
  <button onClick={onClick} style={{
    height: 36, borderRadius: 8, border: '1px solid #FCA5A5', background: '#FFF1F2',
    color: '#EF4444', fontSize: 12, fontWeight: 700, padding: '0 12px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 4,
  }}>⊘ Clear</button>
);

const Card = ({ children, style: s }) => (
  <div style={{
    background: '#fff', borderRadius: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
    overflow: 'hidden', ...s,
  }}>{children}</div>
);

const ConfirmDialog = ({ msg, onOk, onCancel }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>Confirm</div>
      <div style={{ fontSize: 13, color: '#475569', marginBottom: 20 }}>{msg}</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={onCancel} style={{ height: 36, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontSize: 13, fontWeight: 700, padding: '0 16px', cursor: 'pointer' }}>Cancel</button>
        <button onClick={onOk} style={{ height: 36, borderRadius: 8, border: 'none', background: '#EF4444', color: '#fff', fontSize: 13, fontWeight: 700, padding: '0 16px', cursor: 'pointer' }}>Confirm</button>
      </div>
    </div>
  </div>
);

/* ─── main ────────────────────────────────────────────────────────────────── */
const AdminPanel = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null); // { msg, onOk }

  const [users, setUsers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [outlook, setOutlook] = useState([]);
  const [convs, setConvs] = useState([]);
  const [groups, setGroups] = useState([]);
  const [polls, setPolls] = useState([]);
  const [pubMsgs, setPubMsgs] = useState([]);

  const [selConv, setSelConv] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [selGrp, setSelGrp] = useState(null);
  const [grpMsgs, setGrpMsgs] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);

  // ── filters ──
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('All');
  const [userLocFilter, setUserLocFilter] = useState('All');

  const [meetingSearch, setMeetingSearch] = useState('');
  const [meetingStatusFilter, setMeetingStatusFilter] = useState('All');
  const [meetingHostFilter, setMeetingHostFilter] = useState('All');
  const [meetingDateFrom, setMeetingDateFrom] = useState(null);
  const [meetingDateTo, setMeetingDateTo] = useState(null);

  const [outlookSearch, setOutlookSearch] = useState('');
  const [outlookUserFilter, setOutlookUserFilter] = useState('All');
  const [outlookDateFrom, setOutlookDateFrom] = useState(null);
  const [outlookDateTo, setOutlookDateTo] = useState(null);

  const [chatSearch, setChatSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [groupMemberFilter, setGroupMemberFilter] = useState('All');

  const [pubSearch, setPubSearch] = useState('');
  const [pubSenderFilter, setPubSenderFilter] = useState('All');
  const [pubKindFilter, setPubKindFilter] = useState('All');

  const [pollSearch, setPollSearch] = useState('');
  const [pollAudienceFilter, setPollAudienceFilter] = useState('All');

  // ── user form ──
  const [showUserForm, setShowUserForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'developer', location: 'chennai', isAdmin: false });
  const [pwdTarget, setPwdTarget] = useState(null);
  const [newPwd, setNewPwd] = useState('');

  const showToast = (text, isError = false) => {
    setToast({ text, isError });
    setTimeout(() => setToast(null), 3500);
  };

  const doConfirm = (msg, onOk) => setConfirm({ msg, onOk });

  /* ── data loading ─────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true); setApiError(null);
    try {
      if (['overview', 'users', 'meetings', 'outlook', 'groups', 'polls'].includes(tab)) {
        const r = await fetch(`${API}/admin/users`, { headers: authHeaders() });
        const d = await r.json();
        if (!d.success) throw new Error(d.message || 'Failed to load users');
        setUsers(d.users || []);
      }
      if (['overview', 'meetings'].includes(tab)) {
        const r = await fetch(`${API}/admin/meetings`, { headers: authHeaders() });
        const d = await r.json();
        if (!d.success) throw new Error(d.message || 'Failed to load meetings');
        setMeetings(d.meetings || []);
      }
      if (['overview', 'outlook'].includes(tab)) {
        const r = await fetch(`${API}/admin/outlook`, { headers: authHeaders() });
        const d = await r.json();
        if (!d.success) throw new Error(d.message || 'Failed to load Outlook events');
        setOutlook(d.events || []);
      }
      if (tab === 'chats') {
        const r = await fetch(`${API}/admin/conversations`, { headers: authHeaders() });
        const d = await r.json();
        if (!d.success) throw new Error(d.message || 'Failed to load conversations');
        setConvs((d.conversations || []).filter((c) => c.type === 'direct'));
        setSelConv(null); setMsgs([]);
      }
      if (tab === 'groups') {
        const r = await fetch(`${API}/admin/conversations`, { headers: authHeaders() });
        const d = await r.json();
        if (!d.success) throw new Error(d.message || 'Failed to load groups');
        setGroups((d.conversations || []).filter((c) => c.type === 'group'));
        setSelGrp(null); setGrpMsgs([]);
      }
      if (['overview', 'polls'].includes(tab)) {
        const r = await fetch(`${API}/polls`, { headers: authHeaders() });
        const d = await r.json();
        if (d.success) setPolls(d.polls || []);
      }
      if (tab === 'public') {
        const r = await fetch(`${API}/admin/messages/public`, { headers: authHeaders() });
        const d = await r.json();
        if (!d.success) throw new Error(d.message || 'Failed to load public messages');
        setPubMsgs(d.messages || []);
      }
    } catch (e) {
      setApiError(e.message);
      showToast(`Error: ${e.message}`, true);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [tab]); // eslint-disable-line

  const userName = (id) => users.find((u) => u._id === id || u._id?.toString() === id)?.name || (id || '').slice(0, 6);

  /* ── filtered lists ──────────────────────────────────────────────────── */
  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase();
    return users.filter((u) =>
      (!q || (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)) &&
      (userRoleFilter === 'All' || u.role === userRoleFilter) &&
      (userLocFilter === 'All' || u.location === userLocFilter));
  }, [users, userSearch, userRoleFilter, userLocFilter]);

  const filteredMeetings = useMemo(() => {
    const q = meetingSearch.toLowerCase();
    return meetings.filter((m) => {
      const hostName = userName(m.hostId).toLowerCase();
      const matchQ = !q || (m.title || '').toLowerCase().includes(q) ||
        (m.roomId || '').toLowerCase().includes(q) || hostName.includes(q);
      const matchStatus = meetingStatusFilter === 'All' ||
        (meetingStatusFilter === 'Active' && m.isActive) ||
        (meetingStatusFilter === 'Done' && !m.isActive);
      const matchHost = meetingHostFilter === 'All' || m.hostId === meetingHostFilter;
      const scheduledAt = m.scheduledAt ? new Date(m.scheduledAt) : null;
      const matchFrom = !meetingDateFrom || (scheduledAt && scheduledAt >= new Date(meetingDateFrom));
      const matchTo = !meetingDateTo || (scheduledAt && scheduledAt <= new Date(meetingDateTo));
      return matchQ && matchStatus && matchHost && matchFrom && matchTo;
    });
  }, [meetings, meetingSearch, meetingStatusFilter, meetingHostFilter, meetingDateFrom, meetingDateTo, users]); // eslint-disable-line

  const filteredOutlook = useMemo(() => {
    const q = outlookSearch.toLowerCase();
    return outlook.filter((e) => {
      const uName = userName(e.userId).toLowerCase();
      const matchQ = !q || (e.subject || '').toLowerCase().includes(q) || uName.includes(q);
      const matchUser = outlookUserFilter === 'All' || e.userId === outlookUserFilter;
      const start = e.start ? new Date(e.start) : null;
      const matchFrom = !outlookDateFrom || (start && start >= new Date(outlookDateFrom));
      const matchTo = !outlookDateTo || (start && start <= new Date(outlookDateTo));
      return matchQ && matchUser && matchFrom && matchTo;
    });
  }, [outlook, outlookSearch, outlookUserFilter, outlookDateFrom, outlookDateTo, users]); // eslint-disable-line

  const filteredConvs = useMemo(() => {
    const q = chatSearch.toLowerCase();
    if (!q) return convs;
    return convs.filter((c) => (c.memberNames || []).join(' ').toLowerCase().includes(q));
  }, [convs, chatSearch]);

  const filteredGroups = useMemo(() => {
    const q = groupSearch.toLowerCase();
    return groups.filter((g) => {
      const matchQ = !q || (g.groupName || '').toLowerCase().includes(q) ||
        (g.memberNames || []).join(' ').toLowerCase().includes(q);
      const matchMember = groupMemberFilter === 'All' ||
        (g.memberIds || []).map((id) => id.toString()).includes(groupMemberFilter);
      return matchQ && matchMember;
    });
  }, [groups, groupSearch, groupMemberFilter]);

  const pubSenders = useMemo(() => {
    const seen = new Set();
    return pubMsgs.reduce((acc, m) => {
      const id = (m.from || m.senderId || '').toString();
      if (id && !seen.has(id)) { seen.add(id); acc.push({ id, name: m.senderName || m.fromName || id }); }
      return acc;
    }, []);
  }, [pubMsgs]);

  const filteredPubMsgs = useMemo(() => {
    const q = pubSearch.toLowerCase();
    return pubMsgs.filter((m) => {
      const matchQ = !q || (m.content || '').toLowerCase().includes(q) ||
        (m.senderName || m.fromName || '').toLowerCase().includes(q);
      const matchSender = pubSenderFilter === 'All' ||
        (m.from || m.senderId || '').toString() === pubSenderFilter;
      const matchKind = pubKindFilter === 'All' || (m.kind || 'text') === pubKindFilter;
      return matchQ && matchSender && matchKind;
    });
  }, [pubMsgs, pubSearch, pubSenderFilter, pubKindFilter, pubSenders]); // eslint-disable-line

  const filteredPolls = useMemo(() => {
    const q = pollSearch.toLowerCase();
    return polls.filter((p) =>
      (!q || (p.title || '').toLowerCase().includes(q) || (p.creatorName || '').toLowerCase().includes(q)) &&
      (pollAudienceFilter === 'All' || p.audienceType === pollAudienceFilter));
  }, [polls, pollSearch, pollAudienceFilter]);

  /* ── actions ──────────────────────────────────────────────────────────── */
  const delMeeting = (roomId) => doConfirm('Delete this meeting?', async () => {
    try {
      const r = await fetch(`${API}/admin/meetings/${roomId}`, { method: 'DELETE', headers: authHeaders() });
      const d = await r.json();
      if (!d.success) throw new Error(d.message || 'Delete failed');
      showToast('Meeting deleted');
      setMeetings((prev) => prev.filter((m) => m.roomId !== roomId));
    } catch (e) { showToast(e.message, true); }
  });

  const delOutlookEvent = (id) => doConfirm('Delete this Outlook event?', async () => {
    try {
      await fetch(`${API}/admin/outlook/${id}`, { method: 'DELETE', headers: authHeaders() });
      showToast('Event deleted');
      setOutlook((prev) => prev.filter((e) => e._id !== id));
    } catch (e) { showToast(e.message, true); }
  });

  const delPoll = (pollId) => doConfirm('Delete this poll? Cannot be undone.', async () => {
    try {
      const r = await fetch(`${API}/polls/${pollId}`, { method: 'DELETE', headers: authHeaders() });
      const d = await r.json();
      if (!d.success) throw new Error(d.message || 'Delete failed');
      showToast('Poll deleted');
      setPolls((prev) => prev.filter((p) => p.pollId !== pollId));
    } catch (e) { showToast(e.message, true); }
  });

  const delPubMsg = (messageId) => doConfirm('Delete this message for everyone?', async () => {
    try {
      const r = await fetch(`${API}/admin/messages/${messageId}`, { method: 'DELETE', headers: authHeaders() });
      if (r.ok) { showToast('Message deleted'); setPubMsgs((p) => p.filter((m) => m.messageId !== messageId)); }
    } catch (e) { showToast(e.message, true); }
  });

  const delConv = (convId) => doConfirm('Delete conversation + all messages?', async () => {
    try {
      await fetch(`${API}/admin/conversations/${convId}`, { method: 'DELETE', headers: authHeaders() });
      showToast('Conversation deleted');
      setConvs((p) => p.filter((c) => c.conversationId !== convId));
      setGroups((p) => p.filter((c) => c.conversationId !== convId));
    } catch (e) { showToast(e.message, true); }
  });

  const loadMsgs = async (convId, isGroup) => {
    setMsgLoading(true);
    if (isGroup) { setSelGrp(convId); setGrpMsgs([]); }
    else { setSelConv(convId); setMsgs([]); }
    try {
      const r = await fetch(`${API}/admin/messages/${convId}`, { headers: authHeaders() });
      const d = await r.json();
      if (isGroup) setGrpMsgs(d.messages || []);
      else setMsgs(d.messages || []);
    } catch { /* ignore */ }
    setMsgLoading(false);
  };

  const delMsg = (messageId, scope) => doConfirm('Delete this message permanently?', async () => {
    try {
      await fetch(`${API}/admin/messages/${messageId}`, { method: 'DELETE', headers: authHeaders() });
      showToast('Message deleted');
      if (scope === 'pub') setPubMsgs((p) => p.filter((m) => m.messageId !== messageId));
      else if (scope === 'grp') setGrpMsgs((p) => p.filter((m) => m.messageId !== messageId));
      else setMsgs((p) => p.filter((m) => m.messageId !== messageId));
    } catch (e) { showToast(e.message, true); }
  });

  const toggleAdmin = async (u) => {
    try {
      const r = await fetch(`${API}/admin/users/${u._id}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ isAdmin: !u.isAdmin }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      showToast(`Admin ${!u.isAdmin ? 'granted' : 'revoked'}`);
      setUsers((prev) => prev.map((x) => x._id === u._id ? { ...x, isAdmin: !u.isAdmin } : x));
    } catch (e) { showToast(e.message, true); }
  };

  const toggleDev = async (u) => {
    try {
      const r = await fetch(`${API}/admin/users/${u._id}/toggle-developer`, {
        method: 'PUT', headers: authHeaders(),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      showToast(`Developer access ${!u.isDeveloper ? 'granted' : 'revoked'}`);
      setUsers((prev) => prev.map((x) => x._id === u._id ? { ...x, isDeveloper: !u.isDeveloper } : x));
    } catch (e) { showToast(e.message, true); }
  };

  const delUser = (id) => doConfirm('Delete this user? Cannot be undone.', async () => {
    try {
      const r = await fetch(`${API}/admin/users/${id}`, { method: 'DELETE', headers: authHeaders() });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      showToast('User deleted');
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (e) { showToast(e.message, true); }
  });

  const saveUser = async () => {
    try {
      if (editUser) {
        const r = await fetch(`${API}/admin/users/${editUser._id}`, {
          method: 'PUT', headers: authHeaders(),
          body: JSON.stringify({ name: form.name, email: form.email, role: form.role, location: form.location, isAdmin: form.isAdmin }),
        });
        const d = await r.json();
        if (!d.success) throw new Error(d.message || 'Update failed');
        showToast('User updated');
      } else {
        const r = await fetch(`${API}/admin/users`, {
          method: 'POST', headers: authHeaders(), body: JSON.stringify(form),
        });
        const d = await r.json();
        if (!d.success) throw new Error(d.message || 'Create failed');
        showToast('User created');
      }
      setShowUserForm(false); setEditUser(null);
      load();
    } catch (e) { showToast(e.message, true); }
  };

  const savePassword = async () => {
    if (!newPwd || newPwd.length < 6) { showToast('Min 6 characters', true); return; }
    try {
      const r = await fetch(`${API}/admin/users/${pwdTarget._id}/password`, {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify({ password: newPwd }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      showToast('Password changed');
      setPwdTarget(null); setNewPwd('');
    } catch (e) { showToast(e.message, true); }
  };

  const openEditUser = (u) => {
    setEditUser(u);
    setForm({ name: u.name || '', email: u.email || '', password: '', role: u.role || 'developer', location: u.location || 'chennai', isAdmin: !!u.isAdmin });
    setShowUserForm(true);
  };

  /* ── renderers ────────────────────────────────────────────────────────── */
  const renderOverview = () => (
    <div style={{ padding: 24 }}>
      {/* stat cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          ['Total Users', users.length, '#6366F1', '◈'],
          ['Admins', users.filter((u) => u.isAdmin).length, '#F59E0B', '★'],
          ['Meetings', meetings.length, '#10B981', '◆'],
          ['Outlook Events', outlook.length, '#3B82F6', '◇'],
          ['Polls', polls.length, '#EC4899', '◉'],
        ].map(([label, val, color, icon]) => (
          <div key={label} style={{
            flex: '1 1 160px', background: '#fff', borderRadius: 10, padding: 20,
            borderTop: `3px solid ${color}`, boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
          }}>
            <div style={{ fontSize: 22, color }}>{icon}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#0F172A', margin: '8px 0 4px' }}>{val}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: 1, textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* recent panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', letterSpacing: 1.5, textTransform: 'uppercase' }}>Recent Users</span>
          </div>
          <div style={{ padding: 12 }}>
            {users.slice(0, 6).map((u) => (
              <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                <Avatar name={u.name} url={u.profilePicUrl} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                </div>
                <Tag label={u.role || '—'} color="#64748B" />
                {u.isAdmin && <Tag label="Admin" color="#F59E0B" />}
                {u.isDeveloper && <Tag label="Dev" color="#22D3EE" />}
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', letterSpacing: 1.5, textTransform: 'uppercase' }}>Recent Meetings</span>
          </div>
          <div style={{ padding: 12 }}>
            {meetings.slice(0, 6).map((m) => (
              <div key={m.roomId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                <span style={{ fontSize: 20, color: '#10B981' }}>◆</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title || 'Untitled'}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>{m.roomId}</div>
                </div>
                <Tag label={m.isActive ? 'Active' : 'Done'} color={m.isActive ? '#10B981' : '#64748B'} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );

  const Toggle = ({ checked, onChange, activeColor = '#6366F1' }) => (
    <div onClick={onChange} style={{
      width: 36, height: 20, borderRadius: 10, cursor: 'pointer', position: 'relative', flexShrink: 0,
      background: checked ? activeColor : '#CBD5E1', transition: 'background 0.2s',
    }}>
      <div style={{
        position: 'absolute', top: 2, left: checked ? 18 : 2,
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  );

  const renderUsers = () => (
    <>
      <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => { setEditUser(null); setForm({ name: '', email: '', password: '', role: 'developer', location: 'chennai', isAdmin: false }); setShowUserForm(true); }}
          style={{ height: 36, borderRadius: 8, border: 'none', background: '#6366F1', color: '#fff', fontSize: 12, fontWeight: 700, padding: '0 16px', cursor: 'pointer' }}>
          + Add User
        </button>
      </div>

      {/* user form inline */}
      {showUserForm && (
        <div style={{ margin: '12px 16px 0', padding: 16, background: '#fff', borderRadius: 10, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>{editUser ? '✏ Edit User' : '+ New User'}</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
            {[['Name', 'name', 'text'], ['Email', 'email', 'email'], ...(!editUser ? [['Password', 'password', 'password']] : [])].map(([label, key, type]) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748B', letterSpacing: 1, textTransform: 'uppercase' }}>{label}</label>
                <Input type={type} value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} style={{ width: 200 }} />
              </div>
            ))}
            {[['Role', 'role', ['manager', 'developer', 'designer', 'qa', 'hr', 'sales', 'other']], ['Location', 'location', ['mumbai', 'chennai']]].map(([label, key, opts]) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748B', letterSpacing: 1, textTransform: 'uppercase' }}>{label}</label>
                <Sel value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} options={opts} style={{ width: 200 }} />
              </div>
            ))}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, marginBottom: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.isAdmin} onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })} />
            Grant Admin Access
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveUser} style={{ height: 34, borderRadius: 8, border: 'none', background: '#6366F1', color: '#fff', fontSize: 12, fontWeight: 700, padding: '0 16px', cursor: 'pointer' }}>Save</button>
            <button onClick={() => { setShowUserForm(false); setEditUser(null); }} style={{ height: 34, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontSize: 12, fontWeight: 700, padding: '0 14px', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* password form */}
      {pwdTarget && (
        <div style={{ margin: '8px 16px 0', padding: 16, background: '#FEFCE8', borderRadius: 10, border: '1px solid #FDE68A' }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>🔑 Change Password — {pwdTarget.name}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Input type="password" placeholder="New password (min 6)" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} style={{ width: 280 }} />
            <button onClick={savePassword} style={{ height: 36, borderRadius: 8, border: 'none', background: '#6366F1', color: '#fff', fontSize: 12, fontWeight: 700, padding: '0 14px', cursor: 'pointer' }}>Save</button>
            <button onClick={() => { setPwdTarget(null); setNewPwd(''); }} style={{ height: 36, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontSize: 12, fontWeight: 700, padding: '0 12px', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      <FilterBar>
        <SearchBox value={userSearch} onChange={setUserSearch} placeholder="Search name or email…" />
        <Sel value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)} options={['All', ...ROLES]} style={{ width: 130 }} />
        <Sel value={userLocFilter} onChange={(e) => setUserLocFilter(e.target.value)} options={['All', ...LOCATIONS]} style={{ width: 120 }} />
        <ClearBtn onClick={() => { setUserSearch(''); setUserRoleFilter('All'); setUserLocFilter('All'); }} />
        <CountBadge filtered={filteredUsers.length} total={users.length} />
      </FilterBar>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px 16px' }}>
        <Card>
          {filteredUsers.length === 0 ? <Empty text="No users match filters" /> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['NAME', 'EMAIL', 'ROLE', 'LOCATION', 'ADMIN', 'DEV', 'ACTIONS'].map((h) => <Th key={h}>{h}</Th>)}</tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u._id} style={{ transition: 'background 0.1s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#FAFAFA'}
                    onMouseLeave={(e) => e.currentTarget.style.background = ''}>
                    <Td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={u.name} url={u.profilePicUrl} size={28} />
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{u.name}</span>
                      </div>
                    </Td>
                    <Td style={{ color: '#64748B' }}>{u.email}</Td>
                    <Td><Tag label={u.role || '—'} color="#6366F1" /></Td>
                    <Td><Tag label={u.location || '—'} color="#10B981" /></Td>
                    <Td><Toggle checked={!!u.isAdmin} onChange={() => toggleAdmin(u)} activeColor="#6366F1" /></Td>
                    <Td><Toggle checked={!!u.isDeveloper} onChange={() => toggleDev(u)} activeColor="#22D3EE" /></Td>
                    <Td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <ActionBtn label="Edit" color="#6366F1" onClick={() => openEditUser(u)} />
                        <ActionBtn label="Pwd" color="#F59E0B" onClick={() => { setPwdTarget(u); setNewPwd(''); }} />
                        <ActionBtn label="Delete" color="#EF4444" onClick={() => delUser(u._id)} />
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );

  const renderChats = () => (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: 16, gap: 16 }}>
      {/* sidebar */}
      <Card style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: 10, borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', letterSpacing: 1.2, textTransform: 'uppercase' }}>Direct Chats</span>
            <span style={{ fontSize: 11, color: '#64748B' }}>{filteredConvs.length}/{convs.length}</span>
          </div>
          <SearchBox value={chatSearch} onChange={setChatSearch} placeholder="Search by member name…" />
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {convs.length === 0 ? <Empty text="No direct chats found" /> :
            filteredConvs.length === 0 ? <Empty text="No chats match search" /> :
              filteredConvs.map((c) => <ConvItem key={c.conversationId} c={c} isGroup={false} selected={selConv === c.conversationId} onSelect={() => loadMsgs(c.conversationId, false)} onDelete={() => delConv(c.conversationId)} />)
          }
        </div>
      </Card>
      <MsgPane msgs={msgs} msgLoading={msgLoading} sel={selConv} isGroup={false} onDel={(id) => delMsg(id, 'dm')} />
    </div>
  );

  const renderGroups = () => (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: 16, gap: 16 }}>
      <Card style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: 10, borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', letterSpacing: 1.2, textTransform: 'uppercase' }}>Groups</span>
            <span style={{ fontSize: 11, color: '#64748B' }}>{filteredGroups.length}/{groups.length}</span>
          </div>
          <SearchBox value={groupSearch} onChange={setGroupSearch} placeholder="Search name or member…" />
          <div style={{ marginTop: 6 }}>
            <Sel value={groupMemberFilter} onChange={(e) => setGroupMemberFilter(e.target.value)}
              options={[{ value: 'All', label: 'All Members' }, ...users.map((u) => ({ value: u._id, label: u.name || u._id }))]}
              style={{ width: '100%' }} />
          </div>
          {(groupSearch || groupMemberFilter !== 'All') && (
            <div style={{ textAlign: 'right', marginTop: 4 }}>
              <ClearBtn onClick={() => { setGroupSearch(''); setGroupMemberFilter('All'); }} />
            </div>
          )}
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {groups.length === 0 ? <Empty text="No groups found" /> :
            filteredGroups.length === 0 ? <Empty text="No groups match filters" /> :
              filteredGroups.map((g) => <ConvItem key={g.conversationId} c={g} isGroup={true} selected={selGrp === g.conversationId} onSelect={() => loadMsgs(g.conversationId, true)} onDelete={() => delConv(g.conversationId)} />)
          }
        </div>
      </Card>
      <MsgPane msgs={grpMsgs} msgLoading={msgLoading} sel={selGrp} isGroup={true} onDel={(id) => delMsg(id, 'grp')} />
    </div>
  );

  const renderPublic = () => (
    <>
      <FilterBar>
        <SearchBox value={pubSearch} onChange={setPubSearch} placeholder="Search content or sender…" />
        <Sel value={pubSenderFilter} onChange={(e) => setPubSenderFilter(e.target.value)}
          options={[{ value: 'All', label: 'All Senders' }, ...pubSenders.map((s) => ({ value: s.id, label: s.name }))]}
          style={{ width: 160 }} />
        <Sel value={pubKindFilter} onChange={(e) => setPubKindFilter(e.target.value)}
          options={['All', 'text', 'image', 'file', 'emoji', 'system']} style={{ width: 120 }} />
        <ClearBtn onClick={() => { setPubSearch(''); setPubSenderFilter('All'); setPubKindFilter('All'); }} />
        <CountBadge filtered={filteredPubMsgs.length} total={pubMsgs.length} />
      </FilterBar>
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px 16px' }}>
        <Card>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#6366F1', fontSize: 16 }}>◉</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Public Feed — {filteredPubMsgs.length} messages shown</span>
          </div>
          <div style={{ padding: 12 }}>
            {filteredPubMsgs.length === 0 ? <Empty text={pubMsgs.length === 0 ? 'No public messages in database' : 'No messages match filters'} /> :
              filteredPubMsgs.map((m) => <MsgBubble key={m.messageId} m={m} scope="pub" onDel={delMsg} />)
            }
          </div>
        </Card>
      </div>
    </>
  );

  const renderMeetings = () => (
    <>
      <FilterBar>
        <SearchBox value={meetingSearch} onChange={setMeetingSearch} placeholder="Search title, room, host…" />
        <Sel value={meetingStatusFilter} onChange={(e) => setMeetingStatusFilter(e.target.value)} options={['All', 'Active', 'Done']} style={{ width: 110 }} />
        <Sel value={meetingHostFilter} onChange={(e) => setMeetingHostFilter(e.target.value)}
          options={[{ value: 'All', label: 'All Hosts' }, ...users.map((u) => ({ value: u._id, label: u.name || u._id }))]}
          style={{ width: 160 }} />
        <DatePicker label="From date" value={meetingDateFrom} onChange={setMeetingDateFrom} />
        <DatePicker label="To date" value={meetingDateTo} onChange={setMeetingDateTo} />
        <ClearBtn onClick={() => { setMeetingSearch(''); setMeetingStatusFilter('All'); setMeetingHostFilter('All'); setMeetingDateFrom(null); setMeetingDateTo(null); }} />
        <CountBadge filtered={filteredMeetings.length} total={meetings.length} />
      </FilterBar>
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px 16px' }}>
        <Card>
          {filteredMeetings.length === 0 ? <Empty text="No meetings match filters" /> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['TITLE', 'ROOM ID', 'HOST', 'SCHEDULED', 'DURATION', 'PARTICIPANTS', 'STATUS', 'ACTIONS'].map((h) => <Th key={h}>{h}</Th>)}</tr>
              </thead>
              <tbody>
                {filteredMeetings.map((m) => {
                  const hostName = userName(m.hostId);
                  const allIds = new Set([
                    ...(m.participants || []).map((p) => p.userId),
                    ...(m.invitedUsers || []).map((u) => u.toString()),
                  ]);
                  allIds.delete('');
                  const names = [...allIds].map((id) => userName(id)).filter(Boolean);
                  return (
                    <tr key={m.roomId} onMouseEnter={(e) => e.currentTarget.style.background = '#FAFAFA'} onMouseLeave={(e) => e.currentTarget.style.background = ''}>
                      <Td><span style={{ fontWeight: 700, fontSize: 13 }}>{m.title || '—'}</span></Td>
                      <Td mono>{m.roomId}</Td>
                      <Td><span style={{ fontWeight: 600 }}>{hostName}</span></Td>
                      <Td>{m.scheduledAt ? fmt(m.scheduledAt) : 'Instant'}</Td>
                      <Td><Tag label={`${m.durationMinutes || 60}m`} color="#6366F1" /></Td>
                      <Td>
                        {names.length === 0 ? '—' : (
                          <span title={names.join(', ')}>{names.length <= 2 ? names.join(', ') : `${names.slice(0, 2).join(', ')} +${names.length - 2}`}</span>
                        )}
                      </Td>
                      <Td><Tag label={m.isActive ? 'Active' : 'Done'} color={m.isActive ? '#10B981' : '#94A3B8'} /></Td>
                      <Td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <ActionBtn label="Report" color="#004ECC" onClick={() => navigate(`/meeting-details/${m.roomId}`)} />
                          <ActionBtn label="Delete" color="#EF4444" onClick={() => delMeeting(m.roomId)} />
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );

  const renderOutlook = () => (
    <>
      <FilterBar>
        <SearchBox value={outlookSearch} onChange={setOutlookSearch} placeholder="Search subject or user…" />
        <Sel value={outlookUserFilter} onChange={(e) => setOutlookUserFilter(e.target.value)}
          options={[{ value: 'All', label: 'All Users' }, ...users.map((u) => ({ value: u._id, label: u.name || u._id }))]}
          style={{ width: 160 }} />
        <DatePicker label="From date" value={outlookDateFrom} onChange={setOutlookDateFrom} />
        <DatePicker label="To date" value={outlookDateTo} onChange={setOutlookDateTo} />
        <ClearBtn onClick={() => { setOutlookSearch(''); setOutlookUserFilter('All'); setOutlookDateFrom(null); setOutlookDateTo(null); }} />
        <CountBadge filtered={filteredOutlook.length} total={outlook.length} />
      </FilterBar>
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px 16px' }}>
        <Card>
          {filteredOutlook.length === 0 ? <Empty text={outlook.length === 0 ? 'No Outlook events found' : 'No events match filters'} /> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['SUBJECT', 'USER', 'START', 'END', 'LOCATION', 'ACTIONS'].map((h) => <Th key={h}>{h}</Th>)}</tr>
              </thead>
              <tbody>
                {filteredOutlook.map((e) => (
                  <tr key={e._id} onMouseEnter={(ev) => ev.currentTarget.style.background = '#FAFAFA'} onMouseLeave={(ev) => ev.currentTarget.style.background = ''}>
                    <Td><span style={{ fontWeight: 700 }}>{e.subject || '—'}</span></Td>
                    <Td><span style={{ fontWeight: 600 }}>{userName(e.userId)}</span></Td>
                    <Td>{fmt(e.start)}</Td>
                    <Td>{fmt(e.end)}</Td>
                    <Td>{e.location || '—'}</Td>
                    <Td><ActionBtn label="Delete" color="#EF4444" onClick={() => delOutlookEvent(e._id)} /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );

  const renderPolls = () => (
    <>
      <FilterBar>
        <SearchBox value={pollSearch} onChange={setPollSearch} placeholder="Search polls…" />
        <Sel value={pollAudienceFilter} onChange={(e) => setPollAudienceFilter(e.target.value)}
          options={['All', 'all', 'specific', 'role', 'location']} style={{ width: 130 }} />
        <CountBadge filtered={filteredPolls.length} total={polls.length} />
      </FilterBar>
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px 16px' }}>
        {filteredPolls.length === 0 ? (
          <Card><Empty text="No polls found" /></Card>
        ) : (
          filteredPolls.map((p) => {
            const options = p.options || [];
            const uniqueVoters = new Set(options.flatMap((o) => o.votes || []));
            const totalVotes = uniqueVoters.size;
            const audienceType = p.audienceType || 'all';
            const isMulti = p.multipleChoice === true;
            return (
              <Card key={p.pollId} style={{ marginBottom: 12 }}>
                {/* header */}
                <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#0F172A' }}>{p.title || '—'}</div>
                    {p.description && <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>{p.description}</div>}
                  </div>
                  <Badge label={audienceType.toUpperCase()} color="#7C3AED" bg="#EDE9FE" />
                  {isMulti && <Badge label="MULTI" color="#16A34A" bg="#DCFCE7" />}
                  <ActionBtn label="Delete" color="#EF4444" onClick={() => delPoll(p.pollId)} />
                </div>
                {/* meta */}
                <div style={{ padding: '0 16px 10px', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>👤 {p.creatorName || '—'}</span>
                  <span style={{ fontSize: 11, color: '#64748B' }}>🗳 {totalVotes} voter{totalVotes !== 1 ? 's' : ''}</span>
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>🕐 {ago(p.createdAt)}</span>
                </div>
                {/* options */}
                <div style={{ padding: '0 16px 14px' }}>
                  {options.map((opt) => {
                    const count = (opt.votes || []).length;
                    const pct = totalVotes === 0 ? 0 : count / totalVotes;
                    return (
                      <div key={opt.optionId} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{opt.label}</span>
                          <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>{count} vote{count !== 1 ? 's' : ''} · {Math.round(pct * 100)}%</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 4, background: '#F1F5F9', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct * 100}%`, background: '#6366F1', borderRadius: 4, transition: 'width 0.3s' }} />
                        </div>
                        {(opt.votes || []).length > 0 && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                            {(opt.votes || []).map((uid) => {
                              const u = users.find((x) => x._id?.toString() === uid.toString());
                              const name = u?.name || `…${uid.toString().slice(-6)}`;
                              return (
                                <span key={uid} style={{ padding: '2px 6px', borderRadius: 10, fontSize: 10, fontWeight: 600, color: '#0369A1', background: '#F0F9FF', border: '1px solid #BAE6FD' }}>{name}</span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* audience footer */}
                {audienceType !== 'all' && (
                  <div style={{ padding: '8px 16px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748B' }}>
                    <span>🔒</span>
                    {audienceType === 'location' && <span>Location: {p.allowedLocation || '—'}</span>}
                    {audienceType === 'role' && <span>Roles: {(p.allowedRoles || []).join(', ')}</span>}
                    {audienceType === 'specific' && <span>Specific users: <b style={{ color: '#0F172A' }}>{(p.allowedUsers || []).map((uid) => userName(uid)).join(', ') || '—'}</b></span>}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </>
  );

  const renderBody = () => {
    switch (tab) {
      case 'overview': return renderOverview();
      case 'users': return renderUsers();
      case 'chats': return renderChats();
      case 'public': return renderPublic();
      case 'groups': return renderGroups();
      case 'meetings': return renderMeetings();
      case 'outlook': return renderOutlook();
      case 'polls': return renderPolls();
      default: return null;
    }
  };

  /* ─── layout ──────────────────────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Montserrat', sans-serif", background: '#F1F5F9' }}>
      {/* sidebar */}
      <div style={{ width: 220, background: '#0F172A', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid #1E293B' }}>
          <div style={{ fontSize: 22, marginBottom: 6 }}>⬡</div>
          <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: 2, fontFamily: 'monospace' }}>
            <span style={{ color: '#F1F5F9' }}>CTRL</span>
            <span style={{ color: '#6366F1' }}>PANEL</span>
          </span>
        </div>
        <div style={{ paddingTop: 8 }}>
          {NAV_ITEMS.map(([id, icon, label]) => {
            const active = tab === id;
            return (
              <div key={id} onClick={() => setTab(id)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
                cursor: 'pointer', background: active ? '#1E293B' : 'transparent',
                borderRight: active ? '3px solid #6366F1' : '3px solid transparent',
                color: active ? '#F1F5F9' : '#64748B', fontSize: 12, fontWeight: 700, letterSpacing: 0.8,
                transition: 'background 0.15s',
              }}>
                <span style={{ fontSize: 14 }}>{icon}</span>{label}
              </div>
            );
          })}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ padding: 16, borderTop: '1px solid #1E293B', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: '#64748B' }}>Admin Session Active</span>
        </div>
      </div>

      {/* main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* topbar */}
        <div style={{ height: 56, background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: 1.2, color: '#0F172A' }}>{TITLES[tab]}</span>
          <div style={{ flex: 1 }} />
          {loading && <span style={{ fontSize: 12, color: '#94A3B8', marginRight: 12 }}>Loading…</span>}
          <button onClick={load} style={{ height: 34, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontSize: 12, fontWeight: 700, padding: '0 14px', cursor: 'pointer', marginRight: 8 }}>↻ Refresh</button>
          <button onClick={() => navigate(-1)} style={{ height: 34, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontSize: 12, fontWeight: 700, padding: '0 14px', cursor: 'pointer' }}>← Back</button>
        </div>

        {/* error banner */}
        {apiError && (
          <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '8px 16px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⚠ {apiError}</span>
            <span onClick={() => setApiError(null)} style={{ marginLeft: 'auto', cursor: 'pointer', fontWeight: 700 }}>×</span>
          </div>
        )}

        {/* body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: tab === 'overview' ? 'auto' : 'hidden' }}>
          {loading && tab !== 'overview'
            ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}><div style={{ fontSize: 24, animation: 'spin 1s linear infinite' }}>⟳</div></div>
            : renderBody()
          }
        </div>
      </div>

      {/* toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, background: toast.isError ? '#EF4444' : '#0F172A',
          color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
          boxShadow: '0 4px 14px rgba(0,0,0,0.22)', zIndex: 200, maxWidth: 340,
        }}>{toast.text}</div>
      )}

      {/* confirm dialog */}
      {confirm && (
        <ConfirmDialog
          msg={confirm.msg}
          onOk={() => { confirm.onOk(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
};

/* ─── sub-components ──────────────────────────────────────────────────────── */
const ConvItem = ({ c, isGroup, selected, onSelect, onDelete }) => {
  const name = isGroup
    ? (c.groupName || c.conversationId)
    : (c.memberNames || []).join(' & ');
  return (
    <div onClick={onSelect} style={{
      margin: '3px 8px', padding: 10, borderRadius: 8, cursor: 'pointer',
      background: selected ? '#EEF2FF' : '#F8FAFC',
      border: `1px solid ${selected ? '#C7D2FE' : 'transparent'}`,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        {isGroup && c.memberIds && (
          <div style={{ fontSize: 11, color: '#94A3B8' }}>{c.memberIds.length} members</div>
        )}
      </div>
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 16, padding: 2, lineHeight: 1 }}>🗑</button>
    </div>
  );
};

const MsgPane = ({ msgs, msgLoading, sel, isGroup, onDel }) => (
  <div style={{ flex: 1, background: '#fff', borderRadius: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', overflow: 'auto' }}>
    {!sel
      ? <Empty text={isGroup ? 'Select a group to view messages' : 'Select a conversation to view messages'} />
      : msgLoading
        ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: '#94A3B8' }}><div style={{ fontSize: 24 }}>⟳</div><span style={{ fontSize: 13 }}>Loading messages…</span></div>
        : msgs.length === 0
          ? <Empty text="No messages in this conversation" />
          : <div style={{ padding: 12 }}>
            {msgs.map((m) => <MsgBubble key={m.messageId} m={m} scope={isGroup ? 'grp' : 'dm'} onDel={onDel} />)}
          </div>
    }
  </div>
);

const MsgBubble = ({ m, scope, onDel }) => {
  const deletedAll = (m.deletedFor || []).includes('__everyone__');
  const deleted = (m.deletedFor || []).length > 0;
  const isForwarded = m.isForwarded === true;
  const isEdited = m.isEdited === true;
  const hasReply = !!m.replyToId;
  const isPinned = !!m.pinnedBy;

  const badges = [];
  if (deletedAll) badges.push({ label: '🗑 Deleted', color: '#EF4444' });
  else if (deleted) badges.push({ label: '🗑 Deleted (some)', color: '#F97316' });
  if (isForwarded) badges.push({ label: '↪ Forwarded', color: '#6366F1' });
  if (hasReply) badges.push({ label: '↩ Reply', color: '#6366F1' });
  if (isEdited) badges.push({ label: '✏ Edited', color: '#6366F1' });
  if (isPinned) badges.push({ label: '📌 Pinned', color: '#6366F1' });

  const bg = deletedAll ? '#FFF5F5' : deleted ? '#FFF8F0' : '#F8FAFC';
  const border = deletedAll ? '#FECACA' : deleted ? '#FED7AA' : '#E2E8F0';
  const senderName = m.senderName || m.fromName || '';

  return (
    <div style={{ marginBottom: 8, padding: 12, background: bg, borderRadius: 10, border: `1px solid ${border}`, opacity: deletedAll ? 0.8 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <Avatar name={senderName} size={26} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#1E293B' }}>{senderName}</div>
          <div style={{ fontSize: 11, color: '#94A3B8' }}>{ago(m.sentAt)}</div>
        </div>
        <button onClick={() => onDel(m.messageId, scope)} style={{
          display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: '#FEE2E2',
          color: '#EF4444', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}>🗑 Delete</button>
      </div>

      {badges.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
          {badges.map((b) => (
            <span key={b.label} style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: b.color, background: `${b.color}1A` }}>{b.label}</span>
          ))}
        </div>
      )}

      {hasReply && m.replyToContent && (
        <div style={{ margin: '6px 0 0', padding: '6px 10px', background: '#F1F5F9', borderRadius: 4, borderLeft: '3px solid #6366F1', fontSize: 12, color: '#64748B' }}>
          <b style={{ color: '#334155' }}>{m.replyToSender}: </b>{m.replyToContent}
        </div>
      )}

      <div style={{ marginTop: 6, fontSize: 13, color: '#334155', lineHeight: 1.5, fontStyle: deletedAll ? 'italic' : 'normal', textDecoration: deletedAll ? 'line-through' : 'none' }}>
        {deletedAll ? 'This message was deleted' : (m.content || '')}
      </div>

      {m.fileName && (
        <div style={{ marginTop: 4, fontSize: 11, color: '#64748B' }}>
          📎 {m.fileName}{m.fileSize ? ` (${(m.fileSize / 1024).toFixed(1)}KB)` : ''}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;