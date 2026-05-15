import React, { useEffect, useState, useCallback } from "react";
import { useSocket } from "../sockets/socket";
import { useNavigate } from "react-router-dom";

const SIGNALING_SERVER = "https://chatter-backend-4i7g.onrender.com";
// const SIGNALING_SERVER = "http://localhost:8000";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const formatDate = (iso) => {
  if (!iso) return "Instant";
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
};

const Avatar = ({ name, size = 28 }) => {
  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  const colors = ["#004ECC","#0EA5E9","#8B5CF6","#EC4899","#10B981","#F59E0B","#EF4444"];
  const bg = colors[name ? name.charCodeAt(0) % colors.length : 0];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 600, fontSize: size * 0.38, flexShrink: 0 }}>
      {initials}
    </div>
  );
};

const MyMeetings = () => {
  const navigate = useNavigate();
  const socketRef = useSocket();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  })();

const fetchMeetings = useCallback(() => {
  const token = localStorage.getItem("token");
  if (!token) { setLoading(false); return; }
  fetch(`${SIGNALING_SERVER}/my-meetings`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((r) => r.json())
    .then((d) => { 
      console.log(d);
      if (d.success) setMeetings(d.meetings); })
    .catch(() => {})
    .finally(() => setLoading(false));
}, []);

// Initial load + ask Flutter to sync Outlook right now
useEffect(() => {
  fetchMeetings();
  // Tell Flutter (via backend) to run syncToBackend immediately
  // so any Outlook events added since the last 30-min poll appear now
  const socket = socketRef?.current;
  if (socket) {
    socket.emit("outlook:request_sync");
  }
}, [fetchMeetings, socketRef]);

// Real-time refresh when Flutter syncs new Outlook events
useEffect(() => {
  const socket = socketRef?.current;
  if (!socket) return;

  const handler = (data) => {
    console.log("[MyMeetings] meetings:refresh received — reloading", data);
    fetchMeetings();
  };

  socket.on("meetings:refresh", handler);
  return () => socket.off("meetings:refresh", handler);
}, [socketRef, fetchMeetings]);

const handleJoin = (meeting) => {
  const isHost = meeting.hostId === currentUser?.id;
  if (isHost) {
    navigate(`/room/${meeting.roomId}`, {
      state: { isScheduledHost: true }
    });
  } else {
    // ✅ Send non-hosts to JoinRoom with roomId pre-filled
    navigate(`/join-room?roomId=${meeting.roomId}`);
  }
};

  const now = new Date();
  const upcoming = meetings.filter(
    (m) => !m.scheduledAt || new Date(m.scheduledAt) >= now
  );
  const past = meetings.filter(
    (m) => m.scheduledAt && new Date(m.scheduledAt) < now
  );

  // CMeeting roomIds are always "xxx-xxx-xxx" (3 groups of 3 lowercase letters)
const isCMeetingRoom = (roomId) => /^[a-z]{3}-[a-z]{3}-[a-z]{3}$/.test(roomId || '');

const MeetingCard = ({ m }) => {
    const isHost = m.hostId === currentUser?.id;
    const isScheduled = !!m.scheduledAt;
    const isPast = isScheduled && new Date(m.scheduledAt) < now;
    const soonMs = isScheduled
      ? new Date(m.scheduledAt) - now
      : Infinity;
    const startsSoon = soonMs > 0 && soonMs < 15 * 60 * 1000;

    return (
      <div style={s.meetingCard}>
        <div style={s.meetingCardLeft}>
          <div style={s.meetingIconWrap}>
            {isScheduled ? <CalIcon /> : <FlashIcon />}
          </div>
          <div style={s.meetingInfo}>
            <div style={s.meetingTitleRow}>
              <p style={s.meetingTitle}>{m.title || "Meeting"}</p>
              {isHost && <span style={s.hostBadge}>Host</span>}
              {startsSoon && <span style={s.soonBadge}>Starting soon</span>}
              {isPast && <span style={s.pastBadge}>Past</span>}
            </div>
            <p style={s.meetingTime}>
              {formatDate(m.scheduledAt)}
              {isScheduled && m.durationMinutes && ` · ${m.durationMinutes} min`}
            </p>
            <p style={s.meetingRoom}>Room: {m.roomId}</p>
            {m.requireApproval && (
              <p style={s.approvalNote}>
                <LockIcon size={11} /> Requires host approval
              </p>
            )}
          </div>
        </div>

        <div style={s.meetingCardRight}>
          {m.invitedUsers?.length > 0 && (
            <div style={s.avatarStack}>
              {m.invitedUsers.slice(0, 4).map((uid, i) => (
                <div key={uid} style={{ ...s.avatarSlot, zIndex: 10 - i, marginLeft: i === 0 ? 0 : -8 }}>
                  <Avatar name={uid.slice(-4)} size={24} />
                </div>
              ))}
              {m.invitedUsers.length > 4 && (
                <div style={s.moreCount}>+{m.invitedUsers.length - 4}</div>
              )}
            </div>
          )}
          {!isPast && isCMeetingRoom(m.roomId) && (
            <button
              style={s.joinBtn}
              onClick={() => handleJoin(m)}
            >
              {isHost ? (isScheduled ? "Start" : "Join") : "Join"}
            </button>
          )}
          {!isPast && !isCMeetingRoom(m.roomId) && (
            <span style={s.outlookOnlyLabel}>Outlook only</span>
          )}
          {isPast && (
            <span style={s.endedLabel}>Ended</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={s.page}>
      <div style={s.container}>
        {/* header */}
        <div style={s.header}>
          <div>
            <h1 style={s.pageTitle}>My Meetings</h1>
            <p style={s.pageSubtitle}>Your scheduled and instant meetings</p>
          </div>
          <button style={s.newBtn} onClick={() => navigate("/create-room")}>
            + New Meeting
          </button>
        </div>

        {loading ? (
          <p style={s.loadingText}>Loading meetings…</p>
        ) : meetings.length === 0 ? (
          <div style={s.emptyState}>
            <div style={s.emptyIcon}><CalIcon size={36} /></div>
            <p style={s.emptyTitle}>No meetings yet</p>
            <p style={s.emptySub}>Create your first meeting to get started</p>
            <button style={s.emptyBtn} onClick={() => navigate("/create-room")}>
              Create Meeting
            </button>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section style={s.section}>
                <h2 style={s.sectionTitle}>Upcoming</h2>
                {upcoming.map((m) => <MeetingCard key={m._id} m={m} />)}
              </section>
            )}
            {past.length > 0 && (
              <section style={s.section}>
                <h2 style={s.sectionTitle}>Past</h2>
                {past.map((m) => <MeetingCard key={m._id} m={m} />)}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/* ─── Icons ─────────────────────────────────────────────────────────────────── */
const CalIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const FlashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const LockIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }}>
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

/* ─── Styles ─────────────────────────────────────────────────────────────────── */
const s = {
  page: { minHeight: "100vh", background: "#F5F7FB", padding: "40px 16px 60px", fontFamily: "Montserrat, sans-serif" },
  container: { maxWidth: 680, margin: "0 auto" },
  header: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32 },
  pageTitle: { fontSize: 26, fontWeight: 700, color: "#111827", margin: 0 },
  pageSubtitle: { fontSize: 13, color: "#6B7280", margin: "4px 0 0" },
  newBtn: {
    background: "#004ECC", color: "#fff", border: "none", borderRadius: 8,
    padding: "10px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer",
    fontFamily: "Montserrat, sans-serif",
  },
  loadingText: { textAlign: "center", color: "#9CA3AF", marginTop: 60 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },
  meetingCard: {
    background: "#FFFFFF", borderRadius: 12, padding: "16px 18px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: 10, boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
    border: "1px solid #F3F4F6",
  },
  meetingCardLeft: { display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 },
  meetingIconWrap: {
    width: 40, height: 40, borderRadius: 10, background: "#EFF6FF",
    color: "#004ECC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  meetingInfo: { flex: 1, minWidth: 0 },
  meetingTitleRow: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  meetingTitle: { fontSize: 15, fontWeight: 700, color: "#111827", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  meetingTime: { fontSize: 12, color: "#6B7280", margin: "3px 0 2px" },
  meetingRoom: { fontSize: 11, color: "#9CA3AF", margin: 0, fontFamily: "monospace" },
  approvalNote: { fontSize: 11, color: "#6B7280", margin: "4px 0 0" },
  hostBadge: { background: "#EFF6FF", color: "#004ECC", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700 },
  soonBadge: { background: "#FFF7ED", color: "#D97706", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700 },
  pastBadge: { background: "#F3F4F6", color: "#9CA3AF", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600 },
  meetingCardRight: { display: "flex", alignItems: "center", gap: 12, flexShrink: 0, marginLeft: 12 },
  avatarStack: { display: "flex", alignItems: "center" },
  avatarSlot: { position: "relative", borderRadius: "50%", border: "2px solid #fff" },
  moreCount: { fontSize: 11, color: "#6B7280", marginLeft: 6, fontWeight: 600 },
  joinBtn: {
    background: "#004ECC", color: "#fff", border: "none", borderRadius: 8,
    padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer",
    fontFamily: "Montserrat, sans-serif", whiteSpace: "nowrap",
  },
  endedLabel: { fontSize: 12, color: "#9CA3AF", fontWeight: 600 },
  outlookOnlyLabel: { fontSize: 11, color: "#8B5CF6", fontWeight: 600, background: "#F5F3FF", borderRadius: 6, padding: "4px 10px" },
  emptyState: { textAlign: "center", paddingTop: 60 },
  emptyIcon: { color: "#D1D5DB", marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 700, color: "#374151", margin: "0 0 6px" },
  emptySub: { fontSize: 14, color: "#9CA3AF", margin: "0 0 24px" },
  emptyBtn: {
    background: "#004ECC", color: "#fff", border: "none", borderRadius: 8,
    padding: "11px 22px", fontWeight: 700, fontSize: 14, cursor: "pointer",
    fontFamily: "Montserrat, sans-serif",
  },
};

export default MyMeetings;