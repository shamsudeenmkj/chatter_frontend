import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

const SIGNALING_SERVER = "https://chatter-backend-4i7g.onrender.com";
// const SIGNALING_SERVER = "http://localhost:8000";

/* ─── tiny helpers ─────────────────────────────────────────────────────────── */
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const toLocalInputValue = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear() + "-" +
    pad(d.getMonth() + 1) + "-" +
    pad(d.getDate()) + "T" +
    pad(d.getHours()) + ":" +
    pad(d.getMinutes())
  );
};

const localToISO = (datetimeLocalValue) => {
  if (!datetimeLocalValue) return null;
  const [datePart, timePart] = datetimeLocalValue.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute]     = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute).toISOString();
};

const DURATIONS = [
  { label: "30 min", value: 30 },
  { label: "1 hr",   value: 60 },
  { label: "1.5 hr", value: 90 },
  { label: "2 hr",   value: 120 },
  { label: "3 hr",   value: 180 },
];

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/* ─── Avatar initials ───────────────────────────────────────────────────────── */
const Avatar = ({ name, size = 32, style = {} }) => {
  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  const colors = [
    "#004ECC", "#0EA5E9", "#8B5CF6", "#EC4899",
    "#10B981", "#F59E0B", "#EF4444",
  ];
  const bg = colors[name ? name.charCodeAt(0) % colors.length : 0];
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%", background: bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 600, fontSize: size * 0.38, flexShrink: 0,
        ...style,
      }}
    >
      {initials}
    </div>
  );
};

/* ─── Conflict confirm modal ────────────────────────────────────────────────── */
const ConflictModal = ({ user, conflicts, onConfirm, onCancel }) => (
  <div style={styles.modalOverlay}>
    <div style={styles.modalBox}>
      <div style={styles.modalIcon}>⚠️</div>
      <h3 style={styles.modalTitle}>Scheduling Conflict</h3>
      <p style={styles.modalBody}>
        <strong>{user.name}</strong> already has{" "}
        {conflicts.length === 0
          ? "another event"
          : conflicts.length === 1
          ? "an event"
          : `${conflicts.length} events`}{" "}
        during this time:
      </p>
      {conflicts.length > 0 ? (
        <div style={styles.conflictList}>
          {conflicts.map((c, i) => (
            <div key={i} style={styles.conflictItem}>
              <span style={styles.conflictDot} />
              <div>
                <p style={styles.conflictTitle}>{c.title}</p>
                <p style={styles.conflictTime}>
                  {fmtTime(c.start)} – {fmtTime(c.end)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.conflictList}>
          <div style={styles.conflictItem}>
            <span style={styles.conflictDot} />
            <div>
              <p style={styles.conflictTitle}>They have an event at this time</p>
              <p style={styles.conflictTime}>Details unavailable</p>
            </div>
          </div>
        </div>
      )}
      <p style={styles.modalQuestion}>Add them anyway?</p>
      <div style={styles.modalActions}>
        <button style={styles.modalCancel} onClick={onCancel}>No, skip</button>
        <button style={styles.modalConfirm} onClick={onConfirm}>Yes, add anyway</button>
      </div>
    </div>
  </div>
);

/* ─── Self Conflict Banner ──────────────────────────────────────────────────── */
const SelfConflictBanner = ({ conflicts }) => {
  if (!conflicts || conflicts.length === 0) return null;
  return (
    <div style={styles.selfConflictBanner}>
      <div style={styles.selfConflictHeader}>
        <span style={{ marginRight: 6 }}>⚠️</span>
        You have {conflicts.length} conflict{conflicts.length > 1 ? "s" : ""} during this time
      </div>
      {conflicts.map((c, i) => (
        <div key={i} style={styles.selfConflictItem}>
          <span style={styles.selfConflictDot} />
          <div>
            <p style={styles.selfConflictTitle}>{c.title}</p>
            <p style={styles.selfConflictTime}>
              {fmtTime(c.start)} – {fmtTime(c.end)}
              {c.source === "outlook" && (
                <span style={styles.sourceBadge}>Outlook</span>
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ─── Main Component ────────────────────────────────────────────────────────── */
const CreateMeeting = () => {
  const navigate = useNavigate();

  /* form state */
  const [title, setTitle]                   = useState("");
  const [meetingType, setMeetingType]       = useState("instant");
  const [scheduledAt, setScheduledAt]       = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [requireApproval, setRequireApproval] = useState(false);
  const [selectedUsers, setSelectedUsers]   = useState([]);
  const [hasVideo, setHasVideo]             = useState(true);
  const [hasAudio, setHasAudio]             = useState(true);

  /* data state */
  const [allUsers, setAllUsers]       = useState([]);
  const [busyMap, setBusyMap]         = useState({});
  const [loadingUsers, setLoadingUsers]   = useState(false);
  const [loadingAvail, setLoadingAvail]   = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState("");
  const [searchQuery, setSearchQuery]     = useState("");

  /* ── NEW: self-conflict state ─────────────────────────────────────────────── */
  const [selfConflicts, setSelfConflicts] = useState([]);
  const [loadingSelf, setLoadingSelf]     = useState(false);

  /* conflict modal state */
  const [pendingConflict, setPendingConflict] = useState(null);

  /* ── Fetch all users once ─────────────────────────────────────────────────── */
  useEffect(() => {
    setLoadingUsers(true);
    fetch(`${SIGNALING_SERVER}/users`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => { if (d.success) setAllUsers(d.users); })
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  }, []);

  /* ── Check OTHER users' availability ─────────────────────────────────────── */
const checkAvailability = useCallback(() => {
  let start, end;

  if (meetingType === "instant") {
    start = new Date().toISOString();
    end   = new Date(Date.now() + 60 * 60000).toISOString();
  } else if (scheduledAt) {
    const startISO = localToISO(scheduledAt);
    start = startISO;
    end   = new Date(
      new Date(startISO).getTime() + durationMinutes * 60000
    ).toISOString();
  } else {
    setBusyMap({});
    return;
  }

  console.log('Checking availability:', start, '→', end); // ← add this temporarily

  setLoadingAvail(true);
  fetch(
    `${SIGNALING_SERVER}/users/availability?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
    { headers: authHeaders() }
  )
    .then((r) => r.json())
    .then((d) => {
      console.log('Availability response:', JSON.stringify(d, null, 2)); // ← add this
      if (d.success) {
        const map = {};
        d.users.forEach((u) => {
          map[u._id] = { busy: u.busy, conflicts: u.conflicts || [] };
        });
        setBusyMap(map);
      }
    })
    .catch(() => {})
    .finally(() => setLoadingAvail(false));
}, [scheduledAt, durationMinutes, meetingType]);
  /* ── NEW: Check YOUR OWN availability ────────────────────────────────────── */
  const checkSelfAvailability = useCallback(() => {
    let start, end;
    if (meetingType === "instant") {
      start = new Date().toISOString();
      end   = new Date(Date.now() + 60 * 60000).toISOString();
    } else if (scheduledAt) {
      const startISO = localToISO(scheduledAt);
      start = startISO;
      end   = new Date(new Date(startISO).getTime() + durationMinutes * 60000).toISOString();
    } else {
      setSelfConflicts([]);
      return;
    }

    setLoadingSelf(true);
    fetch(
      `${SIGNALING_SERVER}/my/availability?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      { headers: authHeaders() }
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSelfConflicts(d.conflicts || []);
      })
      .catch(() => {})
      .finally(() => setLoadingSelf(false));
  }, [scheduledAt, durationMinutes, meetingType]);

  useEffect(() => { checkAvailability(); },     [checkAvailability]);
  useEffect(() => { checkSelfAvailability(); }, [checkSelfAvailability]);

  /* ── Toggle user selection ─────────────────────────────────────────────────  */
  const toggleUser = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers((prev) => prev.filter((id) => id !== userId));
      return;
    }
    const info   = busyMap[userId];
    const isBusy = info?.busy;
    if (isBusy) {
      const user = allUsers.find((u) => u._id === userId);
      setPendingConflict({ user, conflicts: info.conflicts || [], userId });
      return;
    }
    setSelectedUsers((prev) => [...prev, userId]);
  };

  const confirmConflict = () => {
    if (pendingConflict) setSelectedUsers((prev) => [...prev, pendingConflict.userId]);
    setPendingConflict(null);
  };
  const cancelConflict = () => setPendingConflict(null);

  /* ── Submit ───────────────────────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) { setError("Meeting title is required."); return; }
    if (meetingType === "scheduled" && !scheduledAt) {
      setError("Please pick a date and time.");
      return;
    }

    setSubmitting(true);

    if (meetingType === "instant") {
      const token = localStorage.getItem("token");
      const user  = JSON.parse(localStorage.getItem("user") || "{}");
      const socket = io(SIGNALING_SERVER, { auth: { token } });

      socket.on("connect", () => {
        socket.emit(
          "create-room",
          { name: user.name || "Host", hasVideo, hasAudio, title, invitedUsers: selectedUsers, requireApproval },
          ({ success, roomId }) => {
            socket.disconnect();
            if (success) {
              navigate(`/room/${roomId}`);
            } else {
              setError("Failed to create room. Please try again.");
              setSubmitting(false);
            }
          }
        );
      });

      socket.on("connect_error", () => {
        setError("Could not connect to server. Please try again.");
        setSubmitting(false);
      });
      return;
    }

    /* scheduled */
    try {
      const res = await fetch(`${SIGNALING_SERVER}/schedule-meeting`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          title,
          scheduledAt:     localToISO(scheduledAt),
          durationMinutes,
          invitedUsers:    selectedUsers,
          requireApproval,
        }),
      });
      const data = await res.json();
      if (data.success) {
        navigate("/my-meetings");
      } else {
        setError(data.message || "Failed to schedule meeting.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Filtered user list ───────────────────────────────────────────────────── */
  const filteredUsers = allUsers.filter((u) =>
    (u.name + u.email).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const nowLocal = toLocalInputValue(new Date());

  /* ═══════════════════════════ RENDER ════════════════════════════════════════ */
  return (
    <div style={styles.page}>
      {/* Conflict confirmation modal */}
      {pendingConflict && (
        <ConflictModal
          user={pendingConflict.user}
          conflicts={pendingConflict.conflicts}
          onConfirm={confirmConflict}
          onCancel={cancelConflict}
        />
      )}

      <div style={styles.card}>
        {/* ── Header ── */}
        <div style={styles.cardHeader}>
          <button style={styles.backBtn} onClick={() => navigate(-1)} title="Back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div>
            <h1 style={styles.cardTitle}>New Meeting</h1>
            <p style={styles.cardSubtitle}>Set up an instant or scheduled meeting</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* ── Meeting Title ── */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Meeting Title</label>
            <input
              style={styles.input}
              type="text"
              placeholder="e.g. Team Weekly Sync"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* ── Type Toggle ── */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Type</label>
            <div style={styles.toggleRow}>
              {["instant", "scheduled"].map((t) => (
                <button
                  key={t} type="button"
                  style={{ ...styles.toggleBtn, ...(meetingType === t ? styles.toggleBtnActive : {}) }}
                  onClick={() => setMeetingType(t)}
                >
                  {t === "instant" ? <><CalIcon /> Instant</> : <><ClockIcon /> Schedule</>}
                </button>
              ))}
            </div>
          </div>

          {/* ── Scheduled fields ── */}
          {meetingType === "scheduled" && (
            <>
              <div style={styles.twoCol}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Date & Time</label>
                  <input
                    style={styles.input}
                    type="datetime-local"
                    min={nowLocal}
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </div>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Duration</label>
                  <select
                    style={styles.input}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  >
                    {DURATIONS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {scheduledAt && (
                <div style={styles.timeWindow}>
                  <CalIcon size={14} />
                  <span>
                    {new Date(localToISO(scheduledAt)).toLocaleString("en-US", {
                      weekday: "short", month: "short", day: "numeric",
                      hour: "numeric", minute: "2-digit",
                    })}
                    {" → "}
                    {new Date(
                      new Date(localToISO(scheduledAt)).getTime() + durationMinutes * 60000
                    ).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </span>
                  {(loadingAvail || loadingSelf) && (
                    <span style={styles.loadingDot}>Checking availability…</span>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Media toggles (instant only) ── */}
          {meetingType === "instant" && (
            <div style={styles.mediaRow}>
              <MediaToggle icon={<MicIcon />} label="Microphone" active={hasAudio} onToggle={() => setHasAudio((v) => !v)} />
              <MediaToggle icon={<CamIcon />} label="Camera"     active={hasVideo} onToggle={() => setHasVideo((v) => !v)} />
            </div>
          )}

          {/* ── NEW: Self-conflict banner ── */}
          <SelfConflictBanner conflicts={selfConflicts} />

          {/* ── Require Approval ── */}
          <div style={styles.fieldGroup}>
            <div style={styles.approvalRow}>
              <div>
                <p style={styles.approvalTitle}>Require Host Approval</p>
                <p style={styles.approvalSub}>Participants wait in lobby until admitted</p>
              </div>
              <button
                type="button"
                style={{ ...styles.switchTrack, background: requireApproval ? "#004ECC" : "#D1D5DB" }}
                onClick={() => setRequireApproval((v) => !v)}
                aria-checked={requireApproval}
                role="switch"
              >
                <span style={{ ...styles.switchThumb, transform: requireApproval ? "translateX(22px)" : "translateX(2px)" }} />
              </button>
            </div>
          </div>

          {/* ── Invite Users ── */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              Invite Participants
              {selectedUsers.length > 0 && (
                <span style={styles.badge}>{selectedUsers.length} selected</span>
              )}
            </label>

            <input
              style={{ ...styles.input, marginBottom: 8 }}
              type="text"
              placeholder="Search by name or email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div style={styles.userList}>
              {loadingUsers ? (
                <p style={styles.emptyText}>Loading users…</p>
              ) : filteredUsers.length === 0 ? (
                <p style={styles.emptyText}>No users found</p>
              ) : (
                filteredUsers.map((u) => {
                  const info     = busyMap[u._id];
                  const busy     = info?.busy;
                  const selected = selectedUsers.includes(u._id);
                  return (
                    <div
                      key={u._id}
                      style={{
                        ...styles.userRow,
                        background: selected ? "#EFF6FF" : "transparent",
                        cursor: "pointer",
                      }}
                      onClick={() => toggleUser(u._id)}
                    >
                      <Avatar name={u.name} size={34} />
                      <div style={styles.userInfo}>
                        <p style={styles.userName}>{u.name}</p>
                        <p style={styles.userEmail}>{u.email}</p>
                      </div>
                      <div style={styles.userStatus}>
                        {busy && !selected ? (
                          <span style={styles.busyBadge} title="Has conflicting event — click to add anyway">
                            ⚠ Busy
                          </span>
                        ) : busy && selected ? (
                          <span style={styles.warnCheckBadge} title="Added despite conflict">
                            ✓ Conflict
                          </span>
                        ) : selected ? (
                          <CheckCircleIcon />
                        ) : (
                          <PlusCircleIcon />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Selected chip strip ── */}
          {selectedUsers.length > 0 && (
            <div style={styles.chipStrip}>
              {selectedUsers.map((id) => {
                const u = allUsers.find((x) => x._id === id);
                if (!u) return null;
                const info        = busyMap[id];
                const hasConflict = info?.busy;
                return (
                  <div key={id} style={{ ...styles.chip, ...(hasConflict ? styles.chipConflict : {}) }}>
                    <Avatar name={u.name} size={20} />
                    <span style={{ ...styles.chipName, ...(hasConflict ? { color: "#B45309" } : {}) }}>
                      {u.name.split(" ")[0]}
                    </span>
                    {hasConflict && (
                      <span style={styles.chipWarningDot} title="Has conflicting event">⚠</span>
                    )}
                    <button type="button" style={styles.chipRemove} onClick={() => toggleUser(id)}>×</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Error ── */}
          {error && <p style={styles.errorMsg}>{error}</p>}

          {/* ── Submit ── */}
          <button
            type="submit"
            style={{ ...styles.submitBtn, opacity: submitting ? 0.7 : 1, cursor: submitting ? "not-allowed" : "pointer" }}
            disabled={submitting}
          >
            {submitting
              ? "Creating…"
              : meetingType === "instant"
              ? "Start Meeting Now"
              : "Schedule Meeting"}
          </button>
        </form>
      </div>
    </div>
  );
};

/* ─── Small sub-components ──────────────────────────────────────────────────── */
const MediaToggle = ({ icon, label, active, onToggle }) => (
  <button
    type="button" onClick={onToggle}
    style={{
      ...styles.mediaBtn,
      background: active ? "#EFF6FF" : "#F3F4F6",
      border: `1.5px solid ${active ? "#004ECC" : "#D1D5DB"}`,
      color:  active ? "#004ECC" : "#6B7280",
    }}
  >
    <span style={{ opacity: active ? 1 : 0.5 }}>{icon}</span>
    <span style={styles.mediaBtnLabel}>{active ? label + " On" : label + " Off"}</span>
  </button>
);

/* ─── Icons ─────────────────────────────────────────────────────────────────── */
const CalIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const ClockIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const MicIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);
const CamIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
  </svg>
);
const CheckCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#004ECC" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const PlusCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

/* ─── Styles ────────────────────────────────────────────────────────────────── */
const styles = {
  page: {
    minHeight: "100vh", background: "#F5F7FB", display: "flex",
    justifyContent: "center", alignItems: "flex-start", padding: "40px 16px 60px",
  },
  card: {
    background: "#FFFFFF", borderRadius: 16,
    boxShadow: "0 2px 24px rgba(0,0,0,0.08)", padding: "32px 36px",
    width: "100%", maxWidth: 560,
  },
  cardHeader:   { display: "flex", alignItems: "center", gap: 14, marginBottom: 28 },
  backBtn: {
    background: "#F3F4F6", border: "none", borderRadius: 8, padding: "8px 10px",
    cursor: "pointer", display: "flex", alignItems: "center", color: "#374151", flexShrink: 0,
  },
  cardTitle: {
    fontSize: 22, fontWeight: 700, color: "#111827", margin: 0,
    fontFamily: "Montserrat, sans-serif",
  },
  cardSubtitle: { fontSize: 13, color: "#6B7280", margin: 0, fontFamily: "Montserrat, sans-serif" },
  fieldGroup:   { marginBottom: 20 },
  label: {
    display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600,
    color: "#374151", marginBottom: 6, fontFamily: "Montserrat, sans-serif",
  },
  badge: {
    background: "#EFF6FF", color: "#004ECC", borderRadius: 20, padding: "2px 8px",
    fontSize: 11, fontWeight: 600,
  },
  input: {
    width: "100%", padding: "10px 14px", border: "1.5px solid #E5E7EB", borderRadius: 8,
    fontSize: 14, fontFamily: "Montserrat, sans-serif", color: "#111827",
    background: "#FAFAFA", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s",
  },
  toggleRow: { display: "flex", gap: 10 },
  toggleBtn: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    padding: "10px 14px", border: "1.5px solid #E5E7EB", borderRadius: 8, background: "#FAFAFA",
    fontSize: 13, fontWeight: 600, color: "#6B7280", cursor: "pointer",
    fontFamily: "Montserrat, sans-serif", transition: "all 0.15s",
  },
  toggleBtnActive: { background: "#EFF6FF", border: "1.5px solid #004ECC", color: "#004ECC" },
  twoCol:          { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  timeWindow: {
    display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#004ECC",
    background: "#EFF6FF", borderRadius: 8, padding: "8px 12px",
    marginTop: -8, marginBottom: 16, fontFamily: "Montserrat, sans-serif",
  },
  loadingDot: { marginLeft: "auto", fontSize: 11, color: "#9CA3AF", fontStyle: "italic" },
  mediaRow:   { display: "flex", gap: 10, marginBottom: 20 },
  mediaBtn: {
    flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
    borderRadius: 8, cursor: "pointer", fontFamily: "Montserrat, sans-serif",
    fontWeight: 600, fontSize: 13, transition: "all 0.15s",
  },
  mediaBtnLabel: { whiteSpace: "nowrap" },

  /* ── Self-conflict banner (NEW) ─────────────────────────────────────────── */
  selfConflictBanner: {
    background: "#FFFBEB",
    border: "1.5px solid #FCD34D",
    borderRadius: 10,
    padding: "12px 16px",
    marginBottom: 20,
  },
  selfConflictHeader: {
    fontSize: 13, fontWeight: 700, color: "#92400E",
    fontFamily: "Montserrat, sans-serif", marginBottom: 8,
    display: "flex", alignItems: "center",
  },
  selfConflictItem: {
    display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 4,
  },
  selfConflictDot: {
    width: 7, height: 7, borderRadius: "50%", background: "#F59E0B",
    flexShrink: 0, marginTop: 5,
  },
  selfConflictTitle: {
    fontSize: 13, fontWeight: 600, color: "#92400E", margin: 0,
    fontFamily: "Montserrat, sans-serif",
  },
  selfConflictTime: {
    fontSize: 12, color: "#B45309", margin: "2px 0 0",
    fontFamily: "Montserrat, sans-serif",
    display: "flex", alignItems: "center", gap: 6,
  },
  sourceBadge: {
    background: "#FEF3C7", color: "#92400E", borderRadius: 4,
    padding: "1px 5px", fontSize: 10, fontWeight: 700,
    fontFamily: "Montserrat, sans-serif", letterSpacing: 0.3,
  },

  /* ─────────────────────────────────────────────────────────────────────────── */
  approvalRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "#FAFAFA", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "12px 16px",
  },
  approvalTitle: {
    fontSize: 14, fontWeight: 600, color: "#111827", margin: 0,
    fontFamily: "Montserrat, sans-serif",
  },
  approvalSub: {
    fontSize: 12, color: "#9CA3AF", margin: "2px 0 0",
    fontFamily: "Montserrat, sans-serif",
  },
  switchTrack: {
    position: "relative", width: 46, height: 24, borderRadius: 12, border: "none",
    cursor: "pointer", transition: "background 0.2s", flexShrink: 0, padding: 0,
  },
  switchThumb: {
    position: "absolute", top: 3, width: 18, height: 18, borderRadius: "50%",
    background: "#FFFFFF", transition: "transform 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
  },
  userList: {
    maxHeight: 280, overflowY: "auto", border: "1.5px solid #E5E7EB",
    borderRadius: 10, background: "#FAFAFA",
  },
  userRow: {
    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
    cursor: "pointer", borderBottom: "1px solid #F3F4F6", transition: "background 0.12s",
  },
  userInfo:  { flex: 1, minWidth: 0 },
  userName: {
    fontSize: 14, fontWeight: 600, color: "#111827", margin: 0,
    fontFamily: "Montserrat, sans-serif", whiteSpace: "nowrap",
    overflow: "hidden", textOverflow: "ellipsis",
  },
  userEmail: {
    fontSize: 12, color: "#9CA3AF", margin: 0, fontFamily: "Montserrat, sans-serif",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  userStatus: { flexShrink: 0 },
  busyBadge: {
    background: "#FEF2F2", color: "#EF4444", border: "1px solid #FCA5A5",
    borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600,
    fontFamily: "Montserrat, sans-serif", cursor: "pointer",
  },
  warnCheckBadge: {
    background: "#FFFBEB", color: "#B45309", border: "1px solid #FCD34D",
    borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600,
    fontFamily: "Montserrat, sans-serif",
  },
  emptyText: {
    textAlign: "center", color: "#9CA3AF", fontSize: 13,
    padding: "20px 0", fontFamily: "Montserrat, sans-serif", margin: 0,
  },
  chipStrip: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  chip: {
    display: "flex", alignItems: "center", gap: 6, background: "#EFF6FF",
    border: "1px solid #BFDBFE", borderRadius: 20, padding: "3px 10px 3px 4px",
  },
  chipConflict:    { background: "#FFFBEB", border: "1px solid #FCD34D" },
  chipName:        { fontSize: 12, fontWeight: 600, color: "#004ECC", fontFamily: "Montserrat, sans-serif" },
  chipWarningDot:  { fontSize: 11, color: "#B45309", lineHeight: 1 },
  chipRemove: {
    background: "none", border: "none", color: "#004ECC",
    cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0, marginLeft: 2,
  },
  errorMsg: {
    color: "#EF4444", fontSize: 13, fontFamily: "Montserrat, sans-serif",
    marginBottom: 14, padding: "10px 14px", background: "#FEF2F2",
    borderRadius: 8, border: "1px solid #FCA5A5",
  },
  submitBtn: {
    width: "100%", padding: "13px", background: "#004ECC", color: "#FFFFFF",
    border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700,
    fontFamily: "Montserrat, sans-serif", cursor: "pointer",
    transition: "background 0.15s, transform 0.1s", letterSpacing: 0.2,
  },

  /* ── Modal ── */
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
  },
  modalBox: {
    background: "#fff", borderRadius: 16, padding: "32px 28px", width: "100%",
    maxWidth: 420, boxShadow: "0 8px 40px rgba(0,0,0,0.18)", textAlign: "center",
  },
  modalIcon:  { fontSize: 36, marginBottom: 10 },
  modalTitle: {
    fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 8px",
    fontFamily: "Montserrat, sans-serif",
  },
  modalBody: {
    fontSize: 14, color: "#374151", margin: "0 0 16px",
    fontFamily: "Montserrat, sans-serif", lineHeight: 1.5,
  },
  conflictList: {
    background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 10,
    padding: "10px 14px", marginBottom: 16, textAlign: "left",
  },
  conflictItem: { display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 },
  conflictDot: {
    width: 8, height: 8, borderRadius: "50%", background: "#F59E0B",
    flexShrink: 0, marginTop: 5,
  },
  conflictTitle: {
    fontSize: 13, fontWeight: 600, color: "#92400E", margin: 0,
    fontFamily: "Montserrat, sans-serif",
  },
  conflictTime: {
    fontSize: 12, color: "#B45309", margin: "2px 0 0",
    fontFamily: "Montserrat, sans-serif",
  },
  modalQuestion: {
    fontSize: 14, color: "#374151", margin: "0 0 20px",
    fontFamily: "Montserrat, sans-serif",
  },
  modalActions: { display: "flex", gap: 10 },
  modalCancel: {
    flex: 1, padding: "10px", border: "1.5px solid #E5E7EB", borderRadius: 8,
    background: "#F9FAFB", color: "#374151", fontSize: 14, fontWeight: 600,
    cursor: "pointer", fontFamily: "Montserrat, sans-serif",
  },
  modalConfirm: {
    flex: 1, padding: "10px", border: "none", borderRadius: 8,
    background: "#004ECC", color: "#fff", fontSize: 14, fontWeight: 600,
    cursor: "pointer", fontFamily: "Montserrat, sans-serif",
  },
};

export default CreateMeeting;