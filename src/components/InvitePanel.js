// src/components/InvitePanel.js
import React, { useEffect, useState, useCallback } from 'react';

const SIGNALING_SERVER = 'https://chatter-backend-4i7g.onrender.com';

// Props:
//   socketRef        — shared socket ref from SocketProvider
//   roomId           — current meeting room id
//   onClose          — fn to close the panel
//   onlineUserIds    — Set<string> of DB userIds online RIGHT NOW (from MeetingSection state)
//   inMeetingAuthIds — Set<string> of authIds already inside this room (from MeetingSection state)
const InvitePanel = ({ socketRef, roomId, onClose, onlineUserIds = new Set(), inMeetingAuthIds = new Set() }) => {
  const [allUsers, setAllUsers] = useState([]);
  const [invited, setInvited]   = useState(new Set());
  const [loading, setLoading]   = useState(true);

  // ── Fetch registered users once ───────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${SIGNALING_SERVER}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { if (d.success) setAllUsers(d.users); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── On mount: re-emit presence:join so the server re-broadcasts users:list.
  //    MeetingSection's listener catches it → updates onlineUserIds → re-renders here.
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      if (u.id) socket.emit('presence:join', { userId: u.id, name: u.name, status: 'online' });
    } catch (_) {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Send invite ────────────────────────────────────────────────────────────
  const handleInvite = useCallback((user) => {
    const socket = socketRef.current;
    if (!socket) return;
    let senderName = 'Someone';
    try { senderName = JSON.parse(localStorage.getItem('user') || '{}').name || 'Someone'; } catch (_) {}
    socket.emit('meeting:invite', {
      to:           user._id,
      fromName:     senderName,
      fromUserName: senderName,  // Flutter's VideoCallInvite.fromJson reads fromUserName
      roomId,
      title:        'Video Call',
    });
    setInvited(prev => new Set([...prev, user._id]));
  }, [socketRef, roomId]);

  // ── Derived lists — re-computed every render as onlineUserIds prop changes ─
  const invitableUsers = allUsers.filter(u =>
    onlineUserIds.has(u._id) && !inMeetingAuthIds.has(u._id)
  );
  const offlineUsers = allUsers.filter(u =>
    !onlineUserIds.has(u._id) && !inMeetingAuthIds.has(u._id)
  );

  const avatarColor = (name = '') => {
    const p = ['#6366f1','#06b6d4','#8b5cf6','#f59e0b','#ec4899','#10b981','#3b82f6'];
    return p[(name.charCodeAt(0) || 0) % p.length];
  };
  const initials = (name = '') =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: '#111118', borderLeft: '1px solid rgba(255,255,255,0.08)',
      fontFamily: 'Montserrat, sans-serif',
    }}>
      {/* ── Header ── */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(99,102,241,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>📩</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>Invite People</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              {invitableUsers.length} online · not in meeting
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8',
          width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: 60, color: '#64748b', fontSize: 13 }}>
            Loading users…
          </div>
        ) : invitableUsers.length === 0 && offlineUsers.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 60 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🎉</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>Everyone is already in the meeting!</div>
          </div>
        ) : (
          <>
            {invitableUsers.length > 0 && (
              <>
                <SectionLabel>Online — not in meeting</SectionLabel>
                {invitableUsers.map((u, i) => (
                  <UserRow key={u._id} user={u} online
                    alreadyInvited={invited.has(u._id)}
                    onInvite={() => handleInvite(u)}
                    avatarColor={avatarColor} initials={initials} index={i} />
                ))}
              </>
            )}
            {offlineUsers.length > 0 && (
              <>
                <SectionLabel style={{ paddingTop: 12 }}>Offline</SectionLabel>
                {offlineUsers.map((u, i) => (
                  <UserRow key={u._id} user={u} online={false} alreadyInvited={false}
                    onInvite={null} avatarColor={avatarColor} initials={initials} index={i} />
                ))}
              </>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
};

const SectionLabel = ({ children, style }) => (
  <div style={{
    fontSize: 10, fontWeight: 700, color: '#64748b',
    letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 0 2px', ...style,
  }}>{children}</div>
);

const UserRow = ({ user, online, alreadyInvited, onInvite, avatarColor, initials, index }) => {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
      animation: `fadeInUp 0.25s ease ${index * 0.04}s both`,
    }}>
      {/* Avatar + online dot */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%', background: avatarColor(user.name),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0, position: 'relative',
      }}>
        {initials(user.name)}
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: 10, height: 10, borderRadius: '50%',
          background: online ? '#22c55e' : '#475569',
          border: '2px solid #111118',
        }} />
      </div>

      {/* Name + role */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.name}
        </div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
          {user.role} · {user.location}
        </div>
      </div>

      {/* Invite button (online users only) */}
      {online && onInvite && (
        <button onClick={onInvite} disabled={alreadyInvited}
          onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
          style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            fontFamily: 'Montserrat, sans-serif', transition: 'all 0.15s ease', whiteSpace: 'nowrap',
            cursor: alreadyInvited ? 'default' : 'pointer',
            border: alreadyInvited ? '1px solid rgba(100,116,139,0.3)' : '1px solid rgba(99,102,241,0.5)',
            background: alreadyInvited
              ? 'rgba(100,116,139,0.1)'
              : hovered ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.15)',
            color: alreadyInvited ? '#64748b' : '#a5b4fc',
          }}>
          {alreadyInvited ? '✓ Invited' : '📩 Invite'}
        </button>
      )}
    </div>
  );
};

export default InvitePanel;