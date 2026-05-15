import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
};

const formatDuration = (secs) => {
  if (!secs && secs !== 0) return "—";
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

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ name, size = 24 }) => {
  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  const palette = ["#004ECC", "#0EA5E9", "#8B5CF6", "#EC4899", "#10B981", "#F59E0B", "#EF4444"];
  const bg = palette[name ? name.charCodeAt(0) % palette.length : 0];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 700, fontSize: size * 0.38, flexShrink: 0,
      border: "2px solid #fff",
    }}>
      {initials}
    </div>
  );
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const RecordIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="4" fill="currentColor" />
  </svg>
);

const TrashIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);

const ClockIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }}>
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const UsersIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const FileIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
  </svg>
);

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const MeetingRecords = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null); // id to confirm delete

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("meetingRecords") || "[]");
      setRecords(saved);
    } catch {
      setRecords([]);
    }
  }, []);

  const filtered = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      !q ||
      r.roomId?.toLowerCase().includes(q) ||
      r.filename?.toLowerCase().includes(q) ||
      r.recordedBy?.toLowerCase().includes(q) ||
      r.participants?.some((p) => p.toLowerCase().includes(q))
    );
  });

  const confirmDelete = (id) => setDeleteTarget(id);

  const deleteRecord = (id) => {
    const updated = records.filter((r) => r.id !== id);
    setRecords(updated);
    localStorage.setItem("meetingRecords", JSON.stringify(updated));
    setDeleteTarget(null);
  };

  const clearAll = () => {
    setRecords([]);
    localStorage.removeItem("meetingRecords");
    setDeleteTarget(null);
  };

  const totalDuration = records.reduce((acc, r) => acc + (r.durationSeconds || 0), 0);

  return (
    <div style={s.page}>
      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div style={s.modalBackdrop} onClick={() => setDeleteTarget(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalIcon}><TrashIcon size={24} /></div>
            <h3 style={s.modalTitle}>Delete record?</h3>
            <p style={s.modalBody}>
              This only removes the log entry. The downloaded video file on your device is not affected.
            </p>
            <div style={s.modalBtns}>
              <button style={s.cancelBtn} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button
                style={s.deleteConfirmBtn}
                onClick={() => deleteTarget === "ALL" ? clearAll() : deleteRecord(deleteTarget)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={s.container}>
        {/* ── Header ── */}
        <div style={s.header}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button style={s.backBtn} onClick={() => navigate(-1)}>
              <BackIcon />
            </button>
            <div>
              <h1 style={s.pageTitle}>Meeting Records</h1>
              <p style={s.pageSubtitle}>Your recorded meeting history</p>
            </div>
          </div>
          {records.length > 0 && (
            <button style={s.clearAllBtn} onClick={() => setDeleteTarget("ALL")}>
              Clear all
            </button>
          )}
        </div>

        {/* ── Stats Row ── */}
        {records.length > 0 && (
          <div style={s.statsRow}>
            <div style={s.statCard}>
              <span style={s.statValue}>{records.length}</span>
              <span style={s.statLabel}>Total Recordings</span>
            </div>
            <div style={s.statCard}>
              <span style={s.statValue}>{formatDuration(totalDuration)}</span>
              <span style={s.statLabel}>Total Duration</span>
            </div>
            <div style={s.statCard}>
              <span style={s.statValue}>
                {formatFileSize(records.reduce((a, r) => a + (r.fileSize || 0), 0))}
              </span>
              <span style={s.statLabel}>Total Size</span>
            </div>
          </div>
        )}

        {/* ── Search ── */}
        {records.length > 0 && (
          <div style={s.searchWrap}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              style={s.searchInput}
              placeholder="Search by room, file, or participant…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button style={s.clearSearch} onClick={() => setSearch("")}>×</button>
            )}
          </div>
        )}

        {/* ── List ── */}
        {records.length === 0 ? (
          <div style={s.emptyState}>
            <div style={s.emptyIconWrap}>
              <RecordIcon size={36} />
            </div>
            <p style={s.emptyTitle}>No recordings yet</p>
            <p style={s.emptySub}>
              Start a meeting and hit <strong>Record Meeting</strong> in the controls to save a record here.
            </p>
            <button style={s.emptyBtn} onClick={() => navigate("/")}>
              Go to Meetings
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF" }}>
            <p style={{ fontSize: 14 }}>No records match "<strong>{search}</strong>"</p>
          </div>
        ) : (
          <div style={s.list}>
            {filtered.map((record, i) => (
              <RecordCard
                key={record.id}
                record={record}
                onDelete={() => confirmDelete(record.id)}
                index={i}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Record Card ──────────────────────────────────────────────────────────────
const RecordCard = ({ record, onDelete }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={s.card}>
      {/* Top row */}
      <div style={s.cardTop}>
        <div style={s.cardIconWrap}>
          <RecordIcon size={18} />
        </div>

        <div style={s.cardInfo}>
          {/* Filename */}
          <p style={s.cardFilename} title={record.filename}>
            {record.filename || "recording.webm"}
          </p>

          {/* Meta pills */}
          <div style={s.metaRow}>
            <span style={s.metaPill}>
              <ClockIcon />
              {formatDuration(record.durationSeconds)}
            </span>
            <span style={s.metaPill}>
              <UsersIcon />
              {record.participants?.length ?? 1} participant{record.participants?.length !== 1 ? "s" : ""}
            </span>
            <span style={s.metaPill}>
              <FileIcon />
              {formatFileSize(record.fileSize)}
            </span>
          </div>

          {/* Date */}
          <p style={s.cardDate}>{formatDate(record.recordedAt)}</p>

          {/* Room */}
          <p style={s.cardRoom}>Room: <code style={s.codeTag}>{record.roomId}</code></p>
        </div>

        {/* Actions */}
        <div style={s.cardActions}>
          <button
            style={s.expandBtn}
            onClick={() => setExpanded(p => !p)}
            title={expanded ? "Collapse" : "Show participants"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <button style={s.deleteBtn} onClick={onDelete} title="Delete record">
            <TrashIcon size={14} />
          </button>
        </div>
      </div>

      {/* Expanded participants */}
      {expanded && (
        <div style={s.participantsSection}>
          <p style={s.participantsLabel}>Participants</p>
          <div style={s.participantsList}>
            {(record.participants || [record.recordedBy]).map((name, i) => (
              <div key={i} style={s.participantChip}>
                <Avatar name={name} size={22} />
                <span style={s.participantName}>{name}</span>
                {i === 0 && (
                  <span style={s.hostTag}>Host</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: "100vh",
    background: "#F5F7FB",
    padding: "40px 16px 60px",
    fontFamily: "Montserrat, sans-serif",
  },
  container: { maxWidth: 720, margin: "0 auto" },

  // Header
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: 28, flexWrap: "wrap", gap: 12,
  },
  backBtn: {
    background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8,
    width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color: "#374151", flexShrink: 0,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  pageTitle: { fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 },
  pageSubtitle: { fontSize: 13, color: "#6B7280", margin: "3px 0 0" },
  clearAllBtn: {
    background: "transparent", border: "1px solid #FCA5A5", borderRadius: 8,
    color: "#EF4444", fontSize: 12, fontWeight: 700, padding: "7px 14px",
    cursor: "pointer", fontFamily: "Montserrat, sans-serif",
  },

  // Stats
  statsRow: {
    display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24,
  },
  statCard: {
    background: "#fff", borderRadius: 12, padding: "14px 18px",
    boxShadow: "0 1px 6px rgba(0,0,0,0.05)", border: "1px solid #F3F4F6",
    display: "flex", flexDirection: "column", gap: 4,
  },
  statValue: { fontSize: 20, fontWeight: 800, color: "#004ECC" },
  statLabel: { fontSize: 11, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 },

  // Search
  searchWrap: {
    display: "flex", alignItems: "center", gap: 10,
    background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10,
    padding: "9px 14px", marginBottom: 20,
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  },
  searchInput: {
    border: "none", outline: "none", flex: 1, fontSize: 13,
    color: "#374151", background: "transparent", fontFamily: "Montserrat, sans-serif",
  },
  clearSearch: {
    background: "none", border: "none", color: "#9CA3AF",
    fontSize: 18, cursor: "pointer", padding: 0, lineHeight: 1,
  },

  // List & Card
  list: { display: "flex", flexDirection: "column", gap: 10 },
  card: {
    background: "#fff", borderRadius: 14, padding: "16px 18px",
    boxShadow: "0 1px 8px rgba(0,0,0,0.05)", border: "1px solid #F3F4F6",
  },
  cardTop: { display: "flex", alignItems: "flex-start", gap: 14 },
  cardIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    background: "rgba(239,68,68,0.1)", color: "#EF4444",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  cardInfo: { flex: 1, minWidth: 0 },
  cardFilename: {
    fontSize: 13, fontWeight: 700, color: "#111827", margin: "0 0 6px",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  metaRow: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  metaPill: {
    fontSize: 11, color: "#6B7280", background: "#F9FAFB",
    border: "1px solid #E5E7EB", borderRadius: 20,
    padding: "2px 9px", fontWeight: 600, display: "inline-flex", alignItems: "center",
  },
  cardDate: { fontSize: 11, color: "#9CA3AF", margin: "0 0 3px" },
  cardRoom: { fontSize: 11, color: "#9CA3AF", margin: 0 },
  codeTag: {
    fontFamily: "monospace", background: "#F3F4F6",
    borderRadius: 4, padding: "1px 5px", fontSize: 11, color: "#374151",
  },
  cardActions: { display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 },
  expandBtn: {
    background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 6,
    width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color: "#6B7280",
  },
  deleteBtn: {
    background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 6,
    width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color: "#EF4444",
  },

  // Participants expand
  participantsSection: {
    marginTop: 14, paddingTop: 14,
    borderTop: "1px solid #F3F4F6",
  },
  participantsLabel: {
    fontSize: 11, fontWeight: 700, color: "#9CA3AF",
    textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 10px",
  },
  participantsList: { display: "flex", flexWrap: "wrap", gap: 8 },
  participantChip: {
    display: "flex", alignItems: "center", gap: 7,
    background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 20,
    padding: "4px 10px 4px 4px",
  },
  participantName: { fontSize: 12, fontWeight: 600, color: "#374151" },
  hostTag: {
    fontSize: 10, fontWeight: 700, color: "#004ECC",
    background: "#EFF6FF", borderRadius: 20, padding: "1px 6px",
  },

  // Empty state
  emptyState: { textAlign: "center", paddingTop: 60 },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 16,
    background: "rgba(239,68,68,0.08)", color: "#EF4444",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 20px",
  },
  emptyTitle: { fontSize: 18, fontWeight: 700, color: "#374151", margin: "0 0 8px" },
  emptySub: { fontSize: 13, color: "#9CA3AF", margin: "0 auto 24px", maxWidth: 340, lineHeight: 1.6 },
  emptyBtn: {
    background: "#004ECC", color: "#fff", border: "none", borderRadius: 8,
    padding: "11px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer",
    fontFamily: "Montserrat, sans-serif",
  },

  // Modal
  modalBackdrop: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 9999, padding: 16,
  },
  modal: {
    background: "#fff", borderRadius: 16, padding: "28px 24px",
    maxWidth: 360, width: "100%", textAlign: "center",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
  },
  modalIcon: {
    width: 48, height: 48, borderRadius: 12,
    background: "#FEF2F2", color: "#EF4444",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 16px",
  },
  modalTitle: { fontSize: 17, fontWeight: 700, color: "#111827", margin: "0 0 8px" },
  modalBody: { fontSize: 13, color: "#6B7280", margin: "0 0 20px", lineHeight: 1.6 },
  modalBtns: { display: "flex", gap: 10 },
  cancelBtn: {
    flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #E5E7EB",
    background: "#fff", color: "#374151", fontSize: 13, fontWeight: 700,
    cursor: "pointer", fontFamily: "Montserrat, sans-serif",
  },
  deleteConfirmBtn: {
    flex: 1, padding: "10px", borderRadius: 8, border: "none",
    background: "#EF4444", color: "#fff", fontSize: 13, fontWeight: 700,
    cursor: "pointer", fontFamily: "Montserrat, sans-serif",
  },
};

export default MeetingRecords;
