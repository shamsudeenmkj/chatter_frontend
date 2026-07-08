import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const SIGNALING_SERVER = "https://chatter-backend-4i7g.onrender.com";
// const SIGNALING_SERVER = "http://localhost:8000";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
};

const formatTime = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

const formatDuration = (mins) => {
  if (mins === null || mins === undefined) return "—";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const formatDurationSec = (secs) => {
  if (secs === null || secs === undefined) return "—";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

const formatFileSize = (bytes) => {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const endReasonLabel = (reason) => ({
  'host-ended': 'Ended by host',
  'last-left': 'Everyone left',
  'timeout': 'Timed out',
}[reason] || null);

const pairKey = (a, b) => [a, b].sort().join('__');

/* ─── Avatar ──────────────────────────────────────────────────────────────── */
const Avatar = ({ name, size = 36 }) => {
  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  const palette = ["#004ECC", "#0EA5E9", "#8B5CF6", "#EC4899", "#10B981", "#F59E0B", "#EF4444"];
  const bg = palette[name ? name.charCodeAt(0) % palette.length : 0];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 700, fontSize: size * 0.36, flexShrink: 0,
      border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
    }}>
      {initials}
    </div>
  );
};

/* ─── Icons ───────────────────────────────────────────────────────────────── */
const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const LinkIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);
const CopyIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const ClockIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const UsersIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const ChatIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);
const PollIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const PeakIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
  </svg>
);
const MicOnIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" />
  </svg>
);
const MicOffIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12v-2M19 10v2a7 7 0 0 1-.11 1.23" /><line x1="12" y1="19" x2="12" y2="23" />
  </svg>
);
const CamOnIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);
const CamOffIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" /><path d="M9 5h5a2 2 0 0 1 2 2v3.5l4.553-2.276A1 1 0 0 1 22 9.118v5.764a1 1 0 0 1-1.447.894L16 13.5" /><line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const GlobeIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);
const LockIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const MailIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="2 7 12 13 22 7" />
  </svg>
);
const FileGenericIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
  </svg>
);
const DownloadIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const ChevronDown = ({ size = 14, open }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

/* ─── Empty row ───────────────────────────────────────────────────────────── */
const EmptyTab = ({ icon, text }) => (
  <div style={s.emptyTab}>
    <div style={s.emptyTabIcon}>{icon}</div>
    <span>{text}</span>
  </div>
);

/* ─── File attachment block (shared by chat + files tab) ───────────────────── */
const FileAttachment = ({ msg }) => {
  const isImage = (msg.kind === 'image') || (msg.fileMimeType || '').startsWith('image/');
  return (
    <div style={s.fileBlock}>
      {isImage ? (
        <a href={msg.fileUrl} target="_blank" rel="noreferrer" style={s.fileThumbLink}>
          <img src={msg.fileUrl} alt={msg.fileName || 'image'} style={s.fileThumb} />
        </a>
      ) : (
        <div style={s.fileIconWrap}><FileGenericIcon /></div>
      )}
      <div style={s.fileInfo}>
        <span style={s.fileName}>{msg.fileName || msg.content || 'Attachment'}</span>
        <span style={s.fileSize}>{formatFileSize(msg.fileSize)}</span>
      </div>
      {msg.fileUrl && (
        <a
          href={msg.fileUrl.replace('/file/', '/download/')}
          download={msg.fileName || 'file'}
          style={s.downloadBtn}
          title={`Download ${msg.fileName || 'file'}`}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#004ECC'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#004ECC'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#004ECC'; e.currentTarget.style.borderColor = '#DBEAFE'; }}
        >
          <DownloadIcon size={13} />
        </a>
      )}
    </div>
  );
};

/* ─── Chat transcript row ────────────────────────────────────────────────── */
const ChatRow = ({ msg, rightLabel }) => {
  const hasFile = !!msg.fileUrl;
  return (
    <div style={s.chatRow}>
      <Avatar name={msg.senderName || msg.fromName} size={30} />
      <div style={s.chatRowBody}>
        <div style={s.chatRowHead}>
          <span style={s.chatSender}>{msg.senderName || msg.fromName || "Unknown"}</span>
          {rightLabel && <span style={s.chatRecipient}>{rightLabel}</span>}
          <span style={s.chatTime}>{formatTime(msg.sentAt)}</span>
        </div>
        {hasFile ? <FileAttachment msg={msg} /> : <p style={s.chatText}>{msg.content}</p>}
      </div>
    </div>
  );
};

/* ─── Poll card ──────────────────────────────────────────────────────────── */
const PollCard = ({ poll }) => {
  const totalVotes = (poll.options || []).reduce((acc, o) => acc + (o.votes?.length || 0), 0);
  return (
    <div style={s.pollCard}>
      <div style={s.pollHead}>
        <span style={s.pollQuestion}>{poll.question}</span>
        <span style={{ ...s.pollStatus, ...(poll.closedAt ? s.pollClosed : s.pollOpen) }}>
          {poll.closedAt ? "Closed" : "Open"}
        </span>
      </div>
      <p style={s.pollMeta}>By {poll.creatorName} · {formatDate(poll.createdAt)}</p>
      <div style={s.pollOptions}>
        {(poll.options || []).map((opt) => {
          const votes = opt.votes?.length || 0;
          const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          return (
            <div key={opt.optionId} style={s.pollOptionRow}>
              <div style={s.pollOptionTop}>
                <span style={s.pollOptionLabel}>{opt.label}</span>
                <span style={s.pollOptionVotes}>{votes} {votes === 1 ? "vote" : "votes"} · {pct}%</span>
              </div>
              <div style={s.pollBarTrack}>
                <div style={{ ...s.pollBarFill, width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <p style={s.pollTotal}>{totalVotes} total vote{totalVotes === 1 ? "" : "s"}</p>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────────── */
const MeetingDetails = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [activeTab, setActiveTab] = useState("participants");
  const [openConvs, setOpenConvs] = useState({});
  const [openParticipants, setOpenParticipants] = useState({});

  const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  useEffect(() => {
    setLoading(true);
    setErrorMsg(null);
    fetch(`${SIGNALING_SERVER}/meeting-report/${roomId}`, { headers: authHeaders() })
      .then((r) => r.json().then((d) => ({ status: r.status, body: d })))
      .then(({ status, body }) => {
        if (status === 403) { setErrorMsg("You don't have permission to view this meeting's details."); return; }
        if (!body.success) { setErrorMsg(body.message || "Meeting report not found."); return; }
        setReport(body.report);
      })
      .catch(() => setErrorMsg("Couldn't reach the server. Please try again."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
    });
  };

  const joinLink = `${window.location.origin}/join/${roomId}`;

  /* ── Loading state ─────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div style={s.page}>
        <div style={s.container}>
          <div style={s.loadingWrap}>
            <div style={s.spinner} />
            <p style={s.loadingText}>Loading meeting details…</p>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ── Error / not-found state ───────────────────────────────────────────── */
  if (errorMsg || !report) {
    return (
      <div style={s.page}>
        <div style={s.container}>
          <div style={s.header}>
            <button style={s.backBtn} onClick={() => navigate(-1)}><BackIcon /></button>
            <div>
              <h1 style={s.pageTitle}>Meeting Details</h1>
            </div>
          </div>
          <div style={s.emptyState}>
            <div style={s.emptyIconWrap}><ChatIcon size={26} /></div>
            <h3 style={s.emptyTitle}>{errorMsg || "Meeting report not found."}</h3>
            <p style={s.emptySub}>Room ID: <span style={s.codeTag}>{roomId}</span></p>
          </div>
        </div>
      </div>
    );
  }

  const isLive = !report.endAt;

  // Prefer the server-resolved host name (always correct). Fall back to
  // matching participants[] only for older, unpatched backends.
  const hostEntry = (report.participants || []).find(p => p.userId === report.hostId);
  const hostName = report.hostName || hostEntry?.name || "Unknown host";

  // Collapse repeated join/exit sessions into one row per real person.
  // Prefers the server-computed groupedParticipants (dedupes by userId);
  // falls back to grouping client-side for older backends.
  const groupedParticipants = report.groupedParticipants || (() => {
    const byUser = new Map();
    (report.participants || []).forEach((p) => {
      const key = p.userId || p.socketId;
      if (!byUser.has(key)) byUser.set(key, { userId: p.userId, name: p.name, isGuest: p.isGuest, sessions: [] });
      const entry = byUser.get(key);
      entry.name = p.name || entry.name;
      entry.sessions.push({ socketId: p.socketId, joinedAt: p.joinedAt, exitAt: p.exitAt, durationSec: p.durationSec, micOn: p.micOn, camOn: p.camOn });
    });
    return [...byUser.values()].map((u) => {
      const sorted = [...u.sessions].sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt));
      const latest = sorted[sorted.length - 1];
      return {
        ...u, sessions: sorted, sessionCount: sorted.length,
        firstJoinedAt: sorted[0]?.joinedAt, lastExitAt: latest?.exitAt,
        stillIn: sorted.some((s) => !s.exitAt),
        totalDurationSec: sorted.reduce((acc, s) => acc + (s.durationSec || 0), 0),
        micOn: latest?.micOn, camOn: latest?.camOn,
      };
    });
  })();

  const uniqueParticipantCount = report.uniqueParticipantCount ?? groupedParticipants.length;

  const sortedParticipants = [...groupedParticipants].sort((a, b) => {
    if (a.userId === report.hostId) return -1;
    if (b.userId === report.hostId) return 1;
    return new Date(a.firstJoinedAt) - new Date(b.firstJoinedAt);
  });

  const publicChat = [...(report.publicChat || [])].sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
  const privateChat = [...(report.privateChat || [])].sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
  const polls = [...(report.polls || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Group private chat into conversation pairs
  const convGroups = {};
  privateChat.forEach((m) => {
    const key = pairKey(m.fromId, m.toId);
    if (!convGroups[key]) convGroups[key] = { key, names: {}, messages: [] };
    convGroups[key].names[m.fromId] = m.fromName;
    convGroups[key].names[m.toId] = m.toName;
    convGroups[key].messages.push(m);
  });
  const conversations = Object.values(convGroups).map((c) => {
    const ids = Object.keys(c.names);
    const label = ids.map((id) => c.names[id]).join(" ↔ ");
    return { ...c, label, lastAt: c.messages[c.messages.length - 1]?.sentAt };
  }).sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));

  // Aggregate all downloadable files (public + private)
  const allFiles = [
    ...publicChat.filter((m) => m.fileUrl).map((m) => ({ ...m, scope: "Public" })),
    ...privateChat.filter((m) => m.fileUrl).map((m) => ({ ...m, scope: "Private", senderName: m.fromName, recipient: m.toName })),
  ].sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

  const toggleConv = (key) => setOpenConvs((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleParticipant = (key) => setOpenParticipants((prev) => ({ ...prev, [key]: !prev[key] }));

  // Builds a mailto: link with a prefilled subject/body so clicking it opens
  // the user's default mail client (Outlook, Mail app, etc.) with an
  // invite ready to send — recipient is left blank for the user to fill in.
  const buildMailtoInvite = () => {
    const meetingTitle = report.title || "Meeting";
    const subject = `Invitation: ${meetingTitle}`;
    const bodyLines = [
      `You're invited to join "${meetingTitle}".`,
      "",
      `Host: ${hostName}`,
      isLive ? "The meeting is live now — join using the link below:" : "Use the link below to join:",
      joinLink,
      "",
      `Room ID: ${report.roomId}`,
    ];
    const body = bodyLines.join("\n");
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const tabs = [
    { key: "participants", label: "Participants", count: sortedParticipants.length },
    { key: "public", label: "Public Chat", count: publicChat.length },
    { key: "private", label: "Private Chat", count: privateChat.length },
    { key: "files", label: "Files", count: allFiles.length },
    { key: "polls", label: "Polls", count: polls.length },
  ];

  return (
    <div style={s.page}>
      <div style={s.container}>
        {/* ── Header ── */}
        <div style={s.header}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button style={s.backBtn} onClick={() => navigate(-1)}><BackIcon /></button>
            <div>
              <h1 style={s.pageTitle}>{report.title || "Meeting"}</h1>
              <p style={s.pageSubtitle}>Hosted by {hostName}</p>
            </div>
          </div>
          <span style={{ ...s.statusPill, ...(isLive ? s.statusLive : s.statusEnded) }}>
            <span style={{ ...s.statusDot, background: isLive ? "#10B981" : "#9CA3AF" }} />
            {isLive ? "Live" : "Ended"}
          </span>
        </div>

        {/* ── Two-column split: left = overview/stats, right = tabs/content ── */}
        <div className='roomIdAndDetailsAndParticipantsWholeCnt' style={s.splitLayout}>
          <div className='roomIdCardCnt' style={s.leftCol}>
            {/* ── Overview Card ── */}
        <div style={s.overviewCard}>
          <div style={s.overviewRow}>
            <span style={s.overviewLabel}>Room ID</span>
            <div style={s.copyRowVal}>
              <span style={s.codeTag}>{report.roomId}</span>
              <button style={s.copyBtn} onClick={() => copyToClipboard(report.roomId, "room")}>
                <CopyIcon /> {copiedKey === "room" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div style={s.overviewRow}>
            <span style={s.overviewLabel}>Meeting Link</span>
            <div style={s.copyRowVal}>
              <span className='meetingLinkTxt' style={s.linkText}>{joinLink}</span>
              <button style={s.copyBtnPrimary} onClick={() => copyToClipboard(joinLink, "link")}>
                <LinkIcon /> {copiedKey === "link" ? "Copied!" : "Copy meet link"}
              </button>
              <a href={buildMailtoInvite()} style={{ ...s.copyBtn, textDecoration: "none" }} title="Opens Outlook with the invite pre-filled — requires Outlook to be set as your default mail app">
                <MailIcon /> Invite via Outlook
              </a>
            </div>
          </div>
          <p style={s.inviteHint}>Opens Outlook with the invite ready to send — needs Outlook set as your default mail app.</p>

          <div style={s.divider} />

          <div style={s.metaGrid}>
            <div style={s.metaItem}>
              <span style={s.metaLabel}>Started</span>
              <span style={s.metaValue}>{formatDate(report.startAt)}</span>
            </div>
            <div style={s.metaItem}>
              <span style={s.metaLabel}>{isLive ? "Status" : "Ended"}</span>
              <span style={s.metaValue}>{isLive ? "In progress" : formatDate(report.endAt)}</span>
            </div>
            <div style={s.metaItem}>
              <span style={s.metaLabel}>Duration</span>
              <span style={s.metaValue}>{formatDuration(report.durationMinutes)}</span>
            </div>
            {!isLive && endReasonLabel(report.endReason) && (
              <div style={s.metaItem}>
                <span style={s.metaLabel}>End reason</span>
                <span style={s.metaValue}>{endReasonLabel(report.endReason)}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className='countCardsWholeCnt' style={s.statsRow}>
          <div className='countCardsCnt' style={s.statCard}>
            <div style={{ ...s.statIconWrap, color: "#004ECC", background: "#EFF6FF" }}><UsersIcon size={15} /></div>
            <span style={s.statValue}>{uniqueParticipantCount}</span>
            <span style={s.statLabel}>
              People Joined
              {report.totalParticipants > uniqueParticipantCount && (
                <span style={s.statSubLabel}> · {report.totalParticipants} sessions</span>
              )}
            </span>
          </div>
          <div className='countCardsCnt' style={s.statCard}>
            <div style={{ ...s.statIconWrap, color: "#10B981", background: "#ECFDF5" }}><PeakIcon size={15} /></div>
            <span style={s.statValue}>{report.peakConcurrent ?? 0}</span>
            <span style={s.statLabel}>Peak Concurrent</span>
          </div>
          <div className='countCardsCnt' style={s.statCard}>
            <div style={{ ...s.statIconWrap, color: "#8B5CF6", background: "#F5F3FF" }}><ChatIcon size={15} /></div>
            <span style={s.statValue}>{publicChat.length + privateChat.length}</span>
            <span style={s.statLabel}>Chat Messages</span>
          </div>
          <div className='countCardsCnt' style={s.statCard}>
            <div style={{ ...s.statIconWrap, color: "#F59E0B", background: "#FFF7ED" }}><PollIcon size={15} /></div>
            <span style={s.statValue}>{polls.length}</span>
            <span style={s.statLabel}>Polls Created</span>
          </div>
        </div>

          </div>

          <div className='detailedParticipantsCnt' style={s.rightCol}>
            {/* ── Tab bar ── */}
        <div className='tabsOfDetailsCnt' style={s.tabBar}>
          {tabs.map((t) => (
            <button
              key={t.key}
              style={{ ...s.tabBtn, ...(activeTab === t.key ? s.tabBtnActive : {}) }}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
              <span style={{ ...s.tabCount, ...(activeTab === t.key ? s.tabCountActive : {}) }}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* ── Tab: Participants ── */}
        {activeTab === "participants" && (
          sortedParticipants.length === 0 ? (
            <EmptyTab icon={<UsersIcon size={20} />} text="No participant data recorded for this meeting." />
          ) : (
            <div style={s.participantList}>
              {sortedParticipants.map((p, i) => {
                const isHost = p.userId === report.hostId;
                const key = p.userId || i;
                const hasMultipleSessions = p.sessionCount > 1;
                const open = !!openParticipants[key];
                return (
                  <div key={key} style={s.participantCard}>
                    <div className='individuallyJoinedPInfoCnt'
                      style={{ ...s.participantCardHead, cursor: hasMultipleSessions ? "pointer" : "default" }}
                      onClick={hasMultipleSessions ? () => toggleParticipant(key) : undefined}
                    >
                      <Avatar name={p.name} size={38} />
                      <div style={s.participantInfo}>
                        <div style={s.participantNameRow}>
                          <span style={s.participantName}>{p.name || "Unknown"}</span>
                          {isHost && <span style={s.hostTag}>Host</span>}
                          {p.isGuest && <span style={s.guestTag}>Guest</span>}
                          {hasMultipleSessions && <span style={s.sessionTag}>{p.sessionCount}× joined</span>}
                        </div>
                        <div style={s.participantMetaRow}>
                          <ClockIcon size={11} />
                          <span>First joined {formatDate(p.firstJoinedAt)}</span>
                          <span style={s.metaSep}>·</span>
                          <span>
                            {p.stillIn
                              ? "Still in meeting"
                              : hasMultipleSessions
                                ? `In meeting for ${formatDurationSec(p.totalDurationSec)} total`
                                : `In meeting for ${formatDurationSec(p.totalDurationSec)}`}
                          </span>
                        </div>
                      </div>
                      <div style={s.deviceIcons}>
                        <span style={{ ...s.deviceIcon, color: p.micOn ? "#10B981" : "#EF4444" }} title={p.micOn ? "Mic on" : "Mic off"}>
                          {p.micOn ? <MicOnIcon /> : <MicOffIcon />}
                        </span>
                        <span style={{ ...s.deviceIcon, color: p.camOn ? "#10B981" : "#EF4444" }} title={p.camOn ? "Camera on" : "Camera off"}>
                          {p.camOn ? <CamOnIcon /> : <CamOffIcon />}
                        </span>
                        {hasMultipleSessions && <ChevronDown open={open} />}
                      </div>
                    </div>
                    {hasMultipleSessions && open && (
                      <div style={s.sessionList}>
                        {p.sessions.map((sess, si) => {
                          const sessStillIn = !sess.exitAt;
                          return (
                            <div key={sess.socketId || si} style={s.sessionRow}>
                              <span style={s.sessionIndex}>#{si + 1}</span>
                              <span style={s.sessionTime}>{formatDate(sess.joinedAt)}</span>
                              <span style={s.metaSep}>→</span>
                              <span style={s.sessionTime}>{sessStillIn ? "now" : formatDate(sess.exitAt)}</span>
                              <span style={s.sessionDuration}>
                                {sessStillIn ? "ongoing" : formatDurationSec(sess.durationSec)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ── Tab: Public Chat ── */}
        {activeTab === "public" && (
          publicChat.length === 0 ? (
            <EmptyTab icon={<GlobeIcon size={18} />} text="No public chat messages were sent in this meeting." />
          ) : (
            <div style={s.chatPanel}>
              {publicChat.map((m, i) => <ChatRow key={m.messageId || i} msg={m} />)}
            </div>
          )
        )}

        {/* ── Tab: Private Chat ── */}
        {activeTab === "private" && (
          conversations.length === 0 ? (
            <EmptyTab icon={<LockIcon size={18} />} text="No private messages were sent in this meeting." />
          ) : (
            <div style={s.convList}>
              {conversations.map((c) => {
                const open = !!openConvs[c.key];
                return (
                  <div key={c.key} style={s.convCard}>
                    <button style={s.convHead} onClick={() => toggleConv(c.key)}>
                      <LockIcon size={14} />
                      <span style={s.convLabel}>{c.label}</span>
                      <span style={s.convCount}>{c.messages.length}</span>
                      <ChevronDown open={open} />
                    </button>
                    {open && (
                      <div style={s.chatPanelInner}>
                        {c.messages.map((m, i) => (
                          <ChatRow key={m.messageId || i} msg={m} rightLabel={`→ ${m.toName}`} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ── Tab: Files ── */}
        {activeTab === "files" && (
          allFiles.length === 0 ? (
            <EmptyTab icon={<FileGenericIcon size={18} />} text="No files were shared during this meeting." />
          ) : (
            <div style={s.fileList}>
              {allFiles.map((m, i) => (
                <div key={m.messageId || i} style={s.fileListRow}>
                  <FileAttachment msg={m} />
                  <div style={s.fileListMeta}>
                    <span style={{ ...s.scopeTag, ...(m.scope === "Public" ? s.scopePublic : s.scopePrivate) }}>
                      {m.scope === "Public" ? <GlobeIcon size={10} /> : <LockIcon size={10} />} {m.scope}
                    </span>
                    <span style={s.fileListSender}>
                      {m.senderName}{m.recipient ? ` → ${m.recipient}` : ""}
                    </span>
                    <span style={s.fileListTime}>{formatDate(m.sentAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── Tab: Polls ── */}
        {activeTab === "polls" && (
          polls.length === 0 ? (
            <EmptyTab icon={<PollIcon size={18} />} text="No polls were created during this meeting." />
          ) : (
            <div style={s.pollList}>
              {polls.map((p) => <PollCard key={p.pollId} poll={p} />)}
            </div>
          )
        )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const s = {
  page: {
    minHeight: "100vh",
    background: "#F5F7FB",
    padding: "32px 32px 60px",
    fontFamily: "Montserrat, sans-serif",
    boxSizing: "border-box",
  },
  container: { width: "100%", maxWidth: "100%", margin: "0 auto" },

  // Two-column split (full width)
  splitLayout: {
    display: "flex",
    gap: 24,
    alignItems: "flex-start",
  },
  leftCol: {
    flex: "0 0 360px",
    maxWidth: 360,
    position: "sticky",
    top: 24,
    display: "flex",
    flexDirection: "column",
  },
  rightCol: {
    flex: "1 1 auto",
    minWidth: 0,
  },

  // Loading
  loadingWrap: { display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 100 },
  spinner: {
    width: 36, height: 36, border: "3px solid #E5E7EB", borderTop: "3px solid #004ECC",
    borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 16,
  },
  loadingText: { fontSize: 13, color: "#6B7280" },

  // Header
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: 24, flexWrap: "wrap", gap: 12,
  },
  backBtn: {
    background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8,
    width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color: "#374151", flexShrink: 0,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  pageTitle: { fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 },
  pageSubtitle: { fontSize: 13, color: "#6B7280", margin: "3px 0 0" },
  statusPill: {
    display: "inline-flex", alignItems: "center", gap: 6,
    fontSize: 12, fontWeight: 700, borderRadius: 20, padding: "6px 12px",
  },
  statusLive: { background: "#ECFDF5", color: "#059669" },
  statusEnded: { background: "#F3F4F6", color: "#6B7280" },
  statusDot: { width: 7, height: 7, borderRadius: "50%" },

  // Overview card
  overviewCard: {
    background: "#fff", borderRadius: 14, padding: "18px 20px",
    boxShadow: "0 1px 8px rgba(0,0,0,0.05)", border: "1px solid #F3F4F6",
    marginBottom: 20,
  },
  overviewRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 12, padding: "8px 0", flexWrap: "wrap",
  },
  overviewLabel: { fontSize: 12, fontWeight: 600, color: "#9CA3AF", minWidth: 100 },
  copyRowVal: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  linkText: {
    fontSize: 12, color: "#374151", fontFamily: "monospace",
    maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  codeTag: {
    fontFamily: "monospace", background: "#F3F4F6",
    borderRadius: 6, padding: "3px 8px", fontSize: 12, color: "#374151", fontWeight: 600,
  },
  copyBtn: {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 7,
    padding: "6px 11px", fontSize: 12, fontWeight: 700, color: "#374151",
    cursor: "pointer", fontFamily: "Montserrat, sans-serif",
  },
  copyBtnPrimary: {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: "#004ECC", border: "none", borderRadius: 7,
    padding: "7px 13px", fontSize: 12, fontWeight: 700, color: "#fff",
    cursor: "pointer", fontFamily: "Montserrat, sans-serif",
  },
  inviteHint: { fontSize: 11, color: "#9CA3AF", margin: "0 0 4px", lineHeight: 1.5 },
  divider: { height: 1, background: "#F3F4F6", margin: "10px 0" },
  metaGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16,
  },
  metaItem: { display: "flex", flexDirection: "column", gap: 3 },
  metaLabel: { fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.4 },
  metaValue: { fontSize: 13, fontWeight: 600, color: "#111827" },

  // Stats
  statsRow: {
    display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 0,
  },
  statCard: {
    background: "#fff", borderRadius: 12, padding: "14px 12px",
    boxShadow: "0 1px 6px rgba(0,0,0,0.05)", border: "1px solid #F3F4F6",
    display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start",
  },
  statIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  statValue: { fontSize: 19, fontWeight: 800, color: "#111827" },
  statLabel: { fontSize: 10.5, color: "#9CA3AF", fontWeight: 600 },
  statSubLabel: { fontSize: 10.5, color: "#C4CAD3", fontWeight: 600 },

  // Tab bar
  tabBar: {
    display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap",
    background: "#fff", padding: 5, borderRadius: 12,
    border: "1px solid #F3F4F6", boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
  },
  tabBtn: {
    display: "inline-flex", alignItems: "center", gap: 7,
    background: "transparent", border: "none", borderRadius: 8,
    padding: "8px 13px", fontSize: 12.5, fontWeight: 700, color: "#6B7280",
    cursor: "pointer", fontFamily: "Montserrat, sans-serif",
  },
  tabBtnActive: { background: "#EFF6FF", color: "#004ECC" },
  tabCount: {
    fontSize: 10.5, fontWeight: 700, color: "#9CA3AF", background: "#F3F4F6",
    borderRadius: 20, padding: "1px 6px", minWidth: 16, textAlign: "center",
  },
  tabCountActive: { color: "#004ECC", background: "#DBEAFE" },

  // Empty tab
  emptyTab: {
    background: "#fff", borderRadius: 12, padding: "32px 20px", textAlign: "center",
    color: "#9CA3AF", fontSize: 13, border: "1px solid #F3F4F6",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
  },
  emptyTabIcon: {
    width: 44, height: 44, borderRadius: 12, background: "#F3F4F6", color: "#9CA3AF",
    display: "flex", alignItems: "center", justifyContent: "center",
  },

  // Participant list
  participantList: { display: "flex", flexDirection: "column", gap: 10 },
  participantCard: {
    background: "#fff", borderRadius: 12,
    boxShadow: "0 1px 6px rgba(0,0,0,0.05)", border: "1px solid #F3F4F6",
    overflow: "hidden",
  },
  participantCardHead: {
    padding: "12px 16px",
    display: "flex", alignItems: "center", gap: 14,
  },
  participantInfo: { flex: 1, minWidth: 0 },
  participantNameRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" },
  participantName: {
    fontSize: 13.5, fontWeight: 700, color: "#111827",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  hostTag: {
    fontSize: 10, fontWeight: 700, color: "#004ECC",
    background: "#EFF6FF", borderRadius: 20, padding: "1px 7px", flexShrink: 0,
  },
  guestTag: {
    fontSize: 10, fontWeight: 700, color: "#9333EA",
    background: "#F5F3FF", borderRadius: 20, padding: "1px 7px", flexShrink: 0,
  },
  sessionTag: {
    fontSize: 10, fontWeight: 700, color: "#B45309",
    background: "#FFF7ED", borderRadius: 20, padding: "1px 7px", flexShrink: 0,
  },
  participantMetaRow: {
    display: "flex", alignItems: "center", gap: 5,
    fontSize: 11.5, color: "#9CA3AF", flexWrap: "wrap",
  },
  metaSep: { color: "#D1D5DB" },
  deviceIcons: { display: "flex", gap: 8, alignItems: "center", flexShrink: 0 },
  deviceIcon: {
    width: 26, height: 26, borderRadius: 7, background: "#F9FAFB",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  sessionList: {
    display: "flex", flexDirection: "column", gap: 6,
    padding: "10px 16px 14px 64px", borderTop: "1px solid #F3F4F6",
  },
  sessionRow: {
    display: "flex", alignItems: "center", gap: 8,
    fontSize: 11.5, color: "#6B7280",
  },
  sessionIndex: { fontWeight: 700, color: "#9CA3AF", minWidth: 22 },
  sessionTime: { color: "#374151", fontWeight: 600 },
  sessionDuration: { marginLeft: "auto", color: "#9CA3AF", fontWeight: 600 },


  // Chat panel (public)
  chatPanel: {
    background: "#fff", borderRadius: 12, padding: "14px 16px",
    boxShadow: "0 1px 6px rgba(0,0,0,0.05)", border: "1px solid #F3F4F6",
    display: "flex", flexDirection: "column", gap: 14,
    maxHeight: 480, overflowY: "auto",
  },
  chatPanelInner: {
    display: "flex", flexDirection: "column", gap: 14,
    padding: "12px 16px 6px", borderTop: "1px solid #F3F4F6",
  },
  chatRow: { display: "flex", gap: 10, alignItems: "flex-start" },
  chatRowBody: { flex: 1, minWidth: 0 },
  chatRowHead: { display: "flex", alignItems: "baseline", gap: 7, marginBottom: 3, flexWrap: "wrap" },
  chatSender: { fontSize: 12.5, fontWeight: 700, color: "#111827" },
  chatRecipient: { fontSize: 11, color: "#9CA3AF", fontWeight: 600 },
  chatTime: { fontSize: 10.5, color: "#9CA3AF", marginLeft: "auto" },
  chatText: { fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.5, wordBreak: "break-word" },

  // Private chat conversations
  convList: { display: "flex", flexDirection: "column", gap: 10 },
  convCard: {
    background: "#fff", borderRadius: 12, overflow: "hidden",
    boxShadow: "0 1px 6px rgba(0,0,0,0.05)", border: "1px solid #F3F4F6",
  },
  convHead: {
    width: "100%", display: "flex", alignItems: "center", gap: 9,
    background: "transparent", border: "none", padding: "13px 16px",
    cursor: "pointer", fontFamily: "Montserrat, sans-serif", color: "#374151",
  },
  convLabel: { fontSize: 13, fontWeight: 700, color: "#111827", flex: 1, textAlign: "left" },
  convCount: {
    fontSize: 10.5, fontWeight: 700, color: "#9333EA", background: "#F5F3FF",
    borderRadius: 20, padding: "1px 7px",
  },

  // Files
  fileList: { display: "flex", flexDirection: "column", gap: 10 },
  fileListRow: {
    background: "#fff", borderRadius: 12, padding: "12px 16px",
    boxShadow: "0 1px 6px rgba(0,0,0,0.05)", border: "1px solid #F3F4F6",
    display: "flex", flexDirection: "column", gap: 8,
  },
  fileListMeta: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingLeft: 2 },
  scopeTag: {
    display: "inline-flex", alignItems: "center", gap: 4,
    fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "2px 7px",
  },
  scopePublic: { color: "#004ECC", background: "#EFF6FF" },
  scopePrivate: { color: "#9333EA", background: "#F5F3FF" },
  fileListSender: { fontSize: 11.5, color: "#6B7280", fontWeight: 600 },
  fileListTime: { fontSize: 11, color: "#9CA3AF", marginLeft: "auto" },

  // File attachment block
  fileBlock: {
    display: "flex", alignItems: "center", gap: 10,
    background: "#F9FAFB", border: "1px solid #F3F4F6", borderRadius: 10,
    padding: "8px 10px",
  },
  fileThumbLink: { flexShrink: 0 },
  fileThumb: { width: 40, height: 40, borderRadius: 8, objectFit: "cover", display: "block" },
  fileIconWrap: {
    width: 40, height: 40, borderRadius: 8, background: "#EFF6FF", color: "#004ECC",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  fileInfo: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 },
  fileName: {
    fontSize: 12.5, fontWeight: 700, color: "#111827",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  fileSize: { fontSize: 11, color: "#9CA3AF" },
  downloadBtn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, width: 32, height: 32, borderRadius: "50%",
    background: "#EFF6FF", color: "#004ECC", textDecoration: "none",
    border: "1px solid #DBEAFE", transition: "background 0.15s, color 0.15s",
  },

  // Polls
  pollList: { display: "flex", flexDirection: "column", gap: 12 },
  pollCard: {
    background: "#fff", borderRadius: 12, padding: "16px 18px",
    boxShadow: "0 1px 6px rgba(0,0,0,0.05)", border: "1px solid #F3F4F6",
  },
  pollHead: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  pollQuestion: { fontSize: 14, fontWeight: 700, color: "#111827" },
  pollStatus: { fontSize: 10.5, fontWeight: 700, borderRadius: 20, padding: "2px 9px", flexShrink: 0 },
  pollOpen: { color: "#059669", background: "#ECFDF5" },
  pollClosed: { color: "#6B7280", background: "#F3F4F6" },
  pollMeta: { fontSize: 11.5, color: "#9CA3AF", margin: "4px 0 14px" },
  pollOptions: { display: "flex", flexDirection: "column", gap: 10 },
  pollOptionRow: { display: "flex", flexDirection: "column", gap: 5 },
  pollOptionTop: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 },
  pollOptionLabel: { fontSize: 12.5, fontWeight: 600, color: "#374151" },
  pollOptionVotes: { fontSize: 11, color: "#9CA3AF", flexShrink: 0 },
  pollBarTrack: { height: 7, borderRadius: 20, background: "#F3F4F6", overflow: "hidden" },
  pollBarFill: { height: "100%", borderRadius: 20, background: "#004ECC" },
  pollTotal: { fontSize: 11, color: "#9CA3AF", margin: "14px 0 0", textAlign: "right" },

  // Empty state (page-level error)
  emptyState: { textAlign: "center", paddingTop: 60 },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 16,
    background: "#F3F4F6", color: "#9CA3AF",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 20px",
  },
  emptyTitle: { fontSize: 16, fontWeight: 700, color: "#374151", margin: "0 0 8px" },
  emptySub: { fontSize: 13, color: "#9CA3AF", margin: "0 auto", maxWidth: 340, lineHeight: 1.6 },
};

export default MeetingDetails;