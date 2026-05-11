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
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const DURATIONS = [
  { label: "30 min", value: 30 },
  { label: "1 hr", value: 60 },
  { label: "1.5 hr", value: 90 },
  { label: "2 hr", value: 120 },
  { label: "3 hr", value: 180 },
];

/* ─── Avatar initials ───────────────────────────────────────────────────────── */
const Avatar = ({ name, size = 32, style = {} }) => {
  const initials = name
    ? name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";
  const colors = [
    "#004ECC",
    "#0EA5E9",
    "#8B5CF6",
    "#EC4899",
    "#10B981",
    "#F59E0B",
    "#EF4444",
  ];
  const bg = colors[name ? name.charCodeAt(0) % colors.length : 0];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 600,
        fontSize: size * 0.38,
        flexShrink: 0,
        ...style,
      }}
    >
      {initials}
    </div>
  );
};

/* ─── Main Component ────────────────────────────────────────────────────────── */
const CreateMeeting = () => {
  const navigate = useNavigate();

  /* form state */
  const [title, setTitle] = useState("");
  const [meetingType, setMeetingType] = useState("instant"); // "instant" | "scheduled"
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [requireApproval, setRequireApproval] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [hasVideo, setHasVideo] = useState(true);
  const [hasAudio, setHasAudio] = useState(true);

  /* data state */
  const [allUsers, setAllUsers] = useState([]);
  const [busyMap, setBusyMap] = useState({}); // userId → bool
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  /* ── Fetch all users once ─────────────────────────────────────────────────── */
  useEffect(() => {
    setLoadingUsers(true);
    fetch(`${SIGNALING_SERVER}/users`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setAllUsers(d.users);
      })
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  }, []);

  /* ── Recheck availability whenever schedule window changes ───────────────── */
  const checkAvailability = useCallback(() => {
    if (!scheduledAt || meetingType !== "scheduled") {
      setBusyMap({});
      return;
    }
    const start = new Date(scheduledAt).toISOString();
    const end = new Date(
      new Date(scheduledAt).getTime() + durationMinutes * 60000
    ).toISOString();

    setLoadingAvail(true);
    fetch(
      `${SIGNALING_SERVER}/users/availability?start=${encodeURIComponent(
        start
      )}&end=${encodeURIComponent(end)}`,
      { headers: authHeaders() }
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const map = {};
          d.users.forEach((u) => {
            map[u._id] = u.busy;
          });
          setBusyMap(map);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingAvail(false));
  }, [scheduledAt, durationMinutes, meetingType]);

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  /* ── Toggle user selection ────────────────────────────────────────────────── */
  const toggleUser = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

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
      /* Connect a one-shot socket, emit create-room, then navigate */
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
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

      return; // navigation happens inside callback
    }

    /* scheduled */
    try {
      const res = await fetch(`${SIGNALING_SERVER}/schedule-meeting`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          title,
          scheduledAt,
          durationMinutes,
          invitedUsers: selectedUsers,
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

  /* ── Helpers for date min ─────────────────────────────────────────────────── */
  const nowLocal = toLocalInputValue(new Date());

  /* ═══════════════════════════ RENDER ════════════════════════════════════════ */
  return (
    <div style={styles.page}>
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
                  key={t}
                  type="button"
                  style={{
                    ...styles.toggleBtn,
                    ...(meetingType === t ? styles.toggleBtnActive : {}),
                  }}
                  onClick={() => setMeetingType(t)}
                >
                  {t === "instant" ? (
                    <><CalIcon /> Instant</>
                  ) : (
                    <><ClockIcon /> Schedule</>
                  )}
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
                    {new Date(scheduledAt).toLocaleString("en-US", {
                      weekday: "short", month: "short", day: "numeric",
                      hour: "numeric", minute: "2-digit",
                    })}
                    {" → "}
                    {new Date(
                      new Date(scheduledAt).getTime() + durationMinutes * 60000
                    ).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </span>
                  {loadingAvail && <span style={styles.loadingDot}>Checking availability…</span>}
                </div>
              )}
            </>
          )}

          {/* ── Media toggles ── (instant only) */}
          {meetingType === "instant" && (
            <div style={styles.mediaRow}>
              <MediaToggle
                icon={<MicIcon />}
                label="Microphone"
                active={hasAudio}
                onToggle={() => setHasAudio((v) => !v)}
              />
              <MediaToggle
                icon={<CamIcon />}
                label="Camera"
                active={hasVideo}
                onToggle={() => setHasVideo((v) => !v)}
              />
            </div>
          )}

          {/* ── Require Approval ── */}
          <div style={styles.fieldGroup}>
            <div style={styles.approvalRow}>
              <div>
                <p style={styles.approvalTitle}>Require Host Approval</p>
                <p style={styles.approvalSub}>
                  Participants wait in lobby until admitted
                </p>
              </div>
              <button
                type="button"
                style={{
                  ...styles.switchTrack,
                  background: requireApproval ? "#004ECC" : "#D1D5DB",
                }}
                onClick={() => setRequireApproval((v) => !v)}
                aria-checked={requireApproval}
                role="switch"
              >
                <span
                  style={{
                    ...styles.switchThumb,
                    transform: requireApproval ? "translateX(22px)" : "translateX(2px)",
                  }}
                />
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
                  const busy = busyMap[u._id];
                  const selected = selectedUsers.includes(u._id);
                  return (
                    <div
                      key={u._id}
                      style={{
                        ...styles.userRow,
                        background: selected ? "#EFF6FF" : "transparent",
                        opacity: busy ? 0.6 : 1,
                      }}
                      onClick={() => !busy && toggleUser(u._id)}
                    >
                      <Avatar name={u.name} size={34} />
                      <div style={styles.userInfo}>
                        <p style={styles.userName}>{u.name}</p>
                        <p style={styles.userEmail}>{u.email}</p>
                      </div>
                      <div style={styles.userStatus}>
                        {busy && meetingType === "scheduled" && scheduledAt ? (
                          <span style={styles.busyBadge}>Busy</span>
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
                return (
                  <div key={id} style={styles.chip}>
                    <Avatar name={u.name} size={20} />
                    <span style={styles.chipName}>{u.name.split(" ")[0]}</span>
                    <button
                      type="button"
                      style={styles.chipRemove}
                      onClick={() => toggleUser(id)}
                    >
                      ×
                    </button>
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
            style={{
              ...styles.submitBtn,
              opacity: submitting ? 0.7 : 1,
              cursor: submitting ? "not-allowed" : "pointer",
            }}
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
    type="button"
    onClick={onToggle}
    style={{
      ...styles.mediaBtn,
      background: active ? "#EFF6FF" : "#F3F4F6",
      border: `1.5px solid ${active ? "#004ECC" : "#D1D5DB"}`,
      color: active ? "#004ECC" : "#6B7280",
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
    minHeight: "100vh",
    background: "#F5F7FB",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "40px 16px 60px",
  },
  card: {
    background: "#FFFFFF",
    borderRadius: 16,
    boxShadow: "0 2px 24px rgba(0,0,0,0.08)",
    padding: "32px 36px",
    width: "100%",
    maxWidth: 560,
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 28,
  },
  backBtn: {
    background: "#F3F4F6",
    border: "none",
    borderRadius: 8,
    padding: "8px 10px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    color: "#374151",
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#111827",
    margin: 0,
    fontFamily: "Montserrat, sans-serif",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    margin: 0,
    fontFamily: "Montserrat, sans-serif",
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 6,
    fontFamily: "Montserrat, sans-serif",
  },
  badge: {
    background: "#EFF6FF",
    color: "#004ECC",
    borderRadius: 20,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 600,
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    border: "1.5px solid #E5E7EB",
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "Montserrat, sans-serif",
    color: "#111827",
    background: "#FAFAFA",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  },
  toggleRow: {
    display: "flex",
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "10px 14px",
    border: "1.5px solid #E5E7EB",
    borderRadius: 8,
    background: "#FAFAFA",
    fontSize: 13,
    fontWeight: 600,
    color: "#6B7280",
    cursor: "pointer",
    fontFamily: "Montserrat, sans-serif",
    transition: "all 0.15s",
  },
  toggleBtnActive: {
    background: "#EFF6FF",
    border: "1.5px solid #004ECC",
    color: "#004ECC",
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  },
  timeWindow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "#004ECC",
    background: "#EFF6FF",
    borderRadius: 8,
    padding: "8px 12px",
    marginTop: -8,
    marginBottom: 16,
    fontFamily: "Montserrat, sans-serif",
  },
  loadingDot: {
    marginLeft: "auto",
    fontSize: 11,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  mediaRow: {
    display: "flex",
    gap: 10,
    marginBottom: 20,
  },
  mediaBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 8,
    cursor: "pointer",
    fontFamily: "Montserrat, sans-serif",
    fontWeight: 600,
    fontSize: 13,
    transition: "all 0.15s",
  },
  mediaBtnLabel: {
    whiteSpace: "nowrap",
  },
  approvalRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#FAFAFA",
    border: "1.5px solid #E5E7EB",
    borderRadius: 10,
    padding: "12px 16px",
  },
  approvalTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#111827",
    margin: 0,
    fontFamily: "Montserrat, sans-serif",
  },
  approvalSub: {
    fontSize: 12,
    color: "#9CA3AF",
    margin: "2px 0 0",
    fontFamily: "Montserrat, sans-serif",
  },
  switchTrack: {
    position: "relative",
    width: 46,
    height: 24,
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    transition: "background 0.2s",
    flexShrink: 0,
    padding: 0,
  },
  switchThumb: {
    position: "absolute",
    top: 3,
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "#FFFFFF",
    transition: "transform 0.2s",
    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
  },
  userList: {
    maxHeight: 280,
    overflowY: "auto",
    border: "1.5px solid #E5E7EB",
    borderRadius: 10,
    background: "#FAFAFA",
  },
  userRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 14px",
    cursor: "pointer",
    borderBottom: "1px solid #F3F4F6",
    transition: "background 0.12s",
  },
  userInfo: { flex: 1, minWidth: 0 },
  userName: {
    fontSize: 14,
    fontWeight: 600,
    color: "#111827",
    margin: 0,
    fontFamily: "Montserrat, sans-serif",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  userEmail: {
    fontSize: 12,
    color: "#9CA3AF",
    margin: 0,
    fontFamily: "Montserrat, sans-serif",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  userStatus: { flexShrink: 0 },
  busyBadge: {
    background: "#FEF2F2",
    color: "#EF4444",
    border: "1px solid #FCA5A5",
    borderRadius: 20,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "Montserrat, sans-serif",
  },
  emptyText: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 13,
    padding: "20px 0",
    fontFamily: "Montserrat, sans-serif",
    margin: 0,
  },
  chipStrip: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  chip: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#EFF6FF",
    border: "1px solid #BFDBFE",
    borderRadius: 20,
    padding: "3px 10px 3px 4px",
  },
  chipName: {
    fontSize: 12,
    fontWeight: 600,
    color: "#004ECC",
    fontFamily: "Montserrat, sans-serif",
  },
  chipRemove: {
    background: "none",
    border: "none",
    color: "#004ECC",
    cursor: "pointer",
    fontSize: 16,
    lineHeight: 1,
    padding: 0,
    marginLeft: 2,
  },
  errorMsg: {
    color: "#EF4444",
    fontSize: 13,
    fontFamily: "Montserrat, sans-serif",
    marginBottom: 14,
    padding: "10px 14px",
    background: "#FEF2F2",
    borderRadius: 8,
    border: "1px solid #FCA5A5",
  },
  submitBtn: {
    width: "100%",
    padding: "13px",
    background: "#004ECC",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    fontFamily: "Montserrat, sans-serif",
    cursor: "pointer",
    transition: "background 0.15s, transform 0.1s",
    letterSpacing: 0.2,
  },
};

export default CreateMeeting;