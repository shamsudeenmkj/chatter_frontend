import React, { useEffect, useState, useCallback } from "react";
import { useSocket } from "../sockets/socket";
import { useNavigate } from "react-router-dom";


import IndividualMeetingIcon from "../assets/individualMeetingIcon.svg";
import MultipleMeetingIcon from "../assets/multipleMeetingIcon.svg";


const SIGNALING_SERVER = "https://chatter-backend-4i7g.onrender.com";
// const SIGNALING_SERVER = "http://localhost:8000";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const isCMeetingRoom = (r) => /^[a-z]{3}-[a-z]{3}-[a-z]{3}$/.test(r || "");

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth()    === b.getMonth()    &&
  a.getDate()     === b.getDate();

const getMeetingsForDay = (meetings, date) =>
  meetings.filter((m) => {
    if (!m.scheduledAt) return false;
    return sameDay(new Date(m.scheduledAt), date);
  });

const formatScheduled = (iso, dur) => {
  if (!iso) return null;
  const d = new Date(iso);
  const dateStr = d.toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
  return `${dateStr} · ${dur || 60} min`;
};

const MONTHS = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAYS_SHORT_UPPER = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

/* ─── Icons ───────────────────────────────────────────────────────────────── */
const CalSVG = ({ size = 16, stroke = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const FlashSVG = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const ChevL = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const ChevR = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const PlusCircle = ({ color = "#10B981" }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="16"/>
    <line x1="8" y1="12" x2="16" y2="12"/>
  </svg>
);
const GroupSVG = ({ color = "#10B981" }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const PersonSVG = ({ color = "#3B82F6" }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const DayIcon = ({ count, isPast }) => {

  const color = isPast ? "#EF4444" : (count > 1 ? "#10B981" : "#3B82F6");
    const colorMulti = isPast ? "#EF4444" : "#10B981";

  if (count > 1) return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
<path style={{stroke:colorMulti}} d="M17.9992 18.719L18.0002 18.75C18.0002 18.975 17.9882 19.197 17.9632 19.416C16.1486 20.4571 14.0923 21.0033 12.0002 21C9.83023 21 7.79323 20.424 6.03723 19.416C6.01152 19.1846 5.99917 18.9519 6.00023 18.719C6.00382 17.5857 6.33185 16.4769 6.94223 15.522C7.48423 14.6719 8.23186 13.9723 9.11596 13.4877C10.0001 13.0032 10.9921 12.7495 12.0002 12.75C13.0086 12.7493 14.0008 13.003 14.8851 13.4875C15.7693 13.972 16.5171 14.6718 17.0592 15.522C17.67 16.4768 17.9963 17.5866 18.0002 18.72C19.267 18.8235 20.5414 18.6603 21.7412 18.241C21.787 17.6764 21.672 17.1104 21.4096 16.6084C21.1471 16.1064 20.7479 15.689 20.258 15.4044C19.7682 15.1199 19.2079 14.9798 18.6418 15.0004C18.0757 15.0211 17.527 15.2015 17.0592 15.521M6.00023 18.719C4.73386 18.8263 3.46014 18.6637 2.26123 18.242C2.21558 17.6776 2.33062 17.1117 2.59306 16.6099C2.85549 16.1081 3.2546 15.6908 3.74423 15.4063C4.23386 15.1218 4.79403 14.9817 5.35995 15.0021C5.92587 15.0226 6.47444 15.2028 6.94223 15.522M15.0002 6.75C15.0002 7.54565 14.6842 8.30871 14.1215 8.87132C13.5589 9.43393 12.7959 9.75 12.0002 9.75C11.2046 9.75 10.4415 9.43393 9.87891 8.87132C9.3163 8.30871 9.00023 7.54565 9.00023 6.75C9.00023 5.95435 9.3163 5.19129 9.87891 4.62868C10.4415 4.06607 11.2046 3.75 12.0002 3.75C12.7959 3.75 13.5589 4.06607 14.1215 4.62868C14.6842 5.19129 15.0002 5.95435 15.0002 6.75ZM21.0002 9.75C21.0002 10.0455 20.942 10.3381 20.829 10.611C20.7159 10.884 20.5502 11.1321 20.3412 11.341C20.1323 11.5499 19.8842 11.7157 19.6113 11.8287C19.3383 11.9418 19.0457 12 18.7502 12C18.4548 12 18.1622 11.9418 17.8892 11.8287C17.6162 11.7157 17.3682 11.5499 17.1592 11.341C16.9503 11.1321 16.7846 10.884 16.6715 10.611C16.5584 10.3381 16.5002 10.0455 16.5002 9.75C16.5002 9.15326 16.7373 8.58097 17.1592 8.15901C17.5812 7.73705 18.1535 7.5 18.7502 7.5C19.347 7.5 19.9193 7.73705 20.3412 8.15901C20.7632 8.58097 21.0002 9.15326 21.0002 9.75ZM7.50023 9.75C7.50023 10.0455 7.44203 10.3381 7.32896 10.611C7.21589 10.884 7.05015 11.1321 6.84122 11.341C6.63229 11.5499 6.38425 11.7157 6.11127 11.8287C5.83828 11.9418 5.5457 12 5.25023 12C4.95476 12 4.66217 11.9418 4.38919 11.8287C4.11621 11.7157 3.86817 11.5499 3.65924 11.341C3.45031 11.1321 3.28457 10.884 3.1715 10.611C3.05843 10.3381 3.00023 10.0455 3.00023 9.75C3.00023 9.15326 3.23728 8.58097 3.65924 8.15901C4.0812 7.73705 4.65349 7.5 5.25023 7.5C5.84697 7.5 6.41926 7.73705 6.84122 8.15901C7.26318 8.58097 7.50023 9.15326 7.50023 9.75Z" stroke="#22C55E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>;
  return <img src={IndividualMeetingIcon} color={color} />;
};

/* ─── Side Panel ──────────────────────────────────────────────────────────── */
// Renders as a fixed-width right column OUTSIDE the card (overlaying nav area)
const SidePanel = ({ meetings, onClose, currentUser, onJoin }) => {
  const now = new Date();
  const navigate = useNavigate();
  return (
    <div className="sideListParentCnt" style={P.wrap}>
      <div className="listWrapCnt" style={P.list}>
        {meetings.map((m) => {
          const isInstant = !m.scheduledAt;
          const isPast = !isInstant && new Date(m.scheduledAt) < now;
          const isHost = m.hostId === currentUser?.id;
          const canJoin = isCMeetingRoom(m.roomId);
          return (
            <div className="meetingListCnt" key={m._id || m.roomId} style={P.card}>
              <div style={P.cardHead}>
                <div style={{
                  ...P.iconWrap,
                  background: isInstant ? "#FFF7ED" : "#EFF6FF",
                  color: isInstant ? "#F59E0B" : "#004ECC",
                }}>
                  {isInstant ? <FlashSVG size={15}/> : <CalSVG size={15} stroke="#004ECC"/>}
                </div>
                <span className="meetingListCardTitle" style={P.cardTitle}>{m.title || "Meeting"}</span>
              </div>
              <div style={P.infoRow}>
                <span className="roomIdLabel" style={P.infoLabel}>Room ID :</span>
                <span className="roomIdvalue" style={P.infoVal}>{m.roomId}</span>
              </div>
              {m.description && (
                <div style={P.descBlock}>
                  <span className="desLabel" style={P.infoLabel}>Description :</span>
                  <p className="desValue" style={P.descText}>{m.description}</p>
                </div>
              )}


              {!isInstant && (
                <div style={P.infoRow}>
                  <span className="scheduledLabel" style={P.infoLabel}>Scheduled :</span>
                  <span className="scheduledvalue" style={P.infoVal}>{formatScheduled(m.scheduledAt, m.durationMinutes)}</span>
                </div>
              )}


            <div style={{display:"grid",fontSize:"13px",gridTemplateColumns:"repeat(2,1fr)",gap:"12px"}} >

            
              {canJoin && (
                <button style={P.joinBtn} onClick={() => onJoin(m)}>
                  {isHost ? (isInstant ? "Join" : "Join") : "Join"} Meeting
                </button>
              )}
              {/* {canJoin && isPast && <span style={P.tag}>Ended</span>} */}
              {!canJoin && !isCMeetingRoom(m.roomId) && (
                <span style={{ ...P.tag, background: "#F5F3FF", color: "#8B5CF6" }}>Outlook event</span>
              )}


              
     <button className='createmBtn' style={{fontSize:"13px"}} onClick={() => navigate(`/meeting-details/${m.roomId}`)}>
                  View Details
                </button>

                
             </div>
             
            </div>
          );
        })}
      </div>
    </div>
  );
};

const P = {
  wrap: {
    width: 300,
    flexShrink: 0,
    background: "#fff",
    borderLeft: "1px solid #E5E7EB",
    overflowY: "auto",
    maxHeight: "calc(100vh - 160px)",
    paddingTop: 4,
  },
  list: { padding: "10px 14px", display: "flex", flexDirection: "column", gap: 12 },
  card: {
    border: "1px solid #E5E7EB", borderRadius: 10,
    padding: "12px 12px 10px", background: "#fff",
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  },
  cardHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 9 },
  iconWrap: {
    width: 30, height: 30, borderRadius: 7, display: "flex",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  cardTitle: { fontSize: 13, fontWeight: 700, color: "#111827", lineHeight: 1.3 },
  infoRow: { display: "flex", gap: 6, marginBottom: 5, alignItems: "flex-start", flexWrap: "wrap" },
  infoLabel: { fontSize: 11, fontWeight: 700, color: "#374151", flexShrink: 0 },
  infoVal: { fontSize: 11, color: "#6B7280" },
  descBlock: { marginBottom: 6 },
  descText: { fontSize: 11, color: "#6B7280", margin: "3px 0 0", lineHeight: 1.5 },
  joinBtn: {
    width: "100%", background: "#004ECC", color: "#fff",
    border: "none", borderRadius: 8, padding: "8px 0", fontWeight: 700,
    fontSize: 13, cursor: "pointer", fontFamily: "Montserrat, sans-serif",
  },
  tag: {
    display: "flex",fontSize: 10,justifyContent:"center",alignItems:"center",
    textAlign:"center",
    background: "#F3F4F6", color: "#9CA3AF", borderRadius: 5, padding: "8px", fontWeight: 600,
  },
};

/* ─── MONTH VIEW ──────────────────────────────────────────────────────────── */
const buildMonthGrid = (year, month) => {
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    const d = new Date(year, month, -firstDay + i + 1);
    cells.push({ date: d, thisMonth: false });
  }
  for (let i = 1; i <= lastDate; i++) {
    cells.push({ date: new Date(year, month, i), thisMonth: true });
  }
  return cells;
};

const MonthView = ({ year, month, meetings, today, selectedDay, onSelect }) => {
  const cells = buildMonthGrid(year, month);
  const todayNorm = new Date(today); todayNorm.setHours(0,0,0,0);

  return (
    <div >
      {/* Week header row */}
      <div className="weekTileGrid" style={{
        display: "grid", gridTemplateColumns: "repeat(7,1fr)",
        borderBottom: "1px solid #F3F4F6",
      }}>
        {["Sun","Mon","TUE","Wed","Thu","Fri","Sat"].map((d) => (
          <div key={d} style={MV.dayHeader}>{d}</div>
        ))}
      </div>
      {/* Cells grid */}
      <div className="dateTileGrid" style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
        {cells.map(({ date, thisMonth }, idx) => {
          const dm = getMeetingsForDay(meetings, date);
          const isToday = sameDay(date, todayNorm);
          const isPast = date < todayNorm && !isToday;
          const isSel = selectedDay && sameDay(date, selectedDay);
          const hasMtg = dm.length > 0;
          const pastMtg = hasMtg && isPast;
                   let bg = "#F9FAFB";
                   if (hasMtg && !isPast && dm.length===1) bg = "#EFF6FF";
       else   if (hasMtg && !isPast) bg = "#E5FAED";
          else if (hasMtg && isPast) bg = "#FAE6E5";

          if (isSel) bg = "#EFF6FF";

          return (
            <div className="topAndBottomRowDateCnt"
              key={idx}
              onClick={() => hasMtg && onSelect(date)}
              style={{
                ...MV.cell,
                background: bg,
                opacity: thisMonth ? 1 : 0.3,
                cursor: hasMtg ? "pointer" : "default",
                border: isSel ? "1.5px solid #004ECC" : "0.5px solid #F3F4F6",
              }}
            >
              {/* Top row: date number + icon */}
              <div className="topRowNumAndIcon" style={MV.topRow}>
                <span style={{
                  ...MV.dateNum,
                  color: isToday ? "#004ECC" : (thisMonth ? "#111827" : "#9CA3AF"),
                  fontWeight: isToday ? 700 : 400,
                }}>
                  {date.getDate()}
                </span>

                {hasMtg && <DayIcon count={dm.length} isPast={pastMtg} />}
              </div>
              {/* Bottom row: meeting label + plus */}
              {hasMtg && (
                <div className="bottomRowTitleAndPlus" style={MV.bottomRow}>
                  <span style={MV.mtgLabel}>
                    {dm.length === 1
                      ? (dm[0].title || "Meeting")
                      : `Meetings : ${dm.length}`}
                  </span>
                  <PlusCircle color={pastMtg ? "#EF4444" : dm.length > 1 ? "#10B981" : "#3B82F6"} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MV = {
  dayHeader: {
    padding: "8px 4px", textAlign: "center", fontSize: 12,
    fontWeight: 700, color: "#3B82F6", background: "#fff",
  },
  cell: {
    minHeight: 88, padding: "8px 10px",
    display: "flex", flexDirection: "column",
    justifyContent: "space-between",
  },
  topRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  dateNum: { fontSize: 15 },
  bottomRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginTop: 4,
  },
  mtgLabel: {
    fontSize: 11, color: "#374151", fontWeight: 500,
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    maxWidth: "calc(100% - 24px)",
  },
};

/* ─── WEEK VIEW ───────────────────────────────────────────────────────────── */
// Image 4 & 6: left column = day name (e.g. "Sun") in blue thin label,
// then the row content area with icon + meeting label on the right side
const getWeekDays = (d) => {
  const start = new Date(d);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
};

const WeekView = ({ currentDate, meetings, today, selectedDay, onSelect }) => {
  const days = getWeekDays(currentDate);
  const todayNorm = new Date(today); todayNorm.setHours(0,0,0,0);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {days.map((date, i) => {
        const dm = getMeetingsForDay(meetings, date);
        const isToday = sameDay(date, todayNorm);
        const isPast = date < todayNorm && !isToday;
        const isSel = selectedDay && sameDay(date, selectedDay);
        const hasMtg = dm.length > 0;
        const pastMtg = hasMtg && isPast;

        let bg = "#fff";
        if (hasMtg && !isPast) bg = "#F0FDF4";
        else if (hasMtg && isPast) bg = "#FEF2F2";
        if (isSel) bg = "#EFF6FF";

        return (
          <div
            key={i}
            onClick={() => hasMtg && onSelect(date)}
            style={{
              display: "flex",
              alignItems: "stretch",
              minHeight: 66,
              background: bg,
              borderBottom: isSel ? "none" : "1px solid #F3F4F6",
              border: isSel ? "1.5px solid #004ECC" : undefined,
              cursor: hasMtg ? "pointer" : "default",
            }}
          >
            {/* Left: day label column */}
            <div style={WV.label}>
              <span className="dayOnlyColumn" style={{
                fontSize: 13, fontWeight: 700,
                color: isToday ? "#004ECC" : "#3B82F6",
                textTransform: "uppercase",
                letterSpacing: 0.3,
              }}>
                {DAYS_SHORT[date.getDay()]}
              </span>
              <span style={{
                fontSize: 22, fontWeight: isToday ? 700 : 400,
                color: isToday ? "#004ECC" : "#111827",
                lineHeight: 1.1,
              }}>
                {date.getDate()}
              </span>
            </div>

            {/* Right: content */}
            <div style={WV.content}>
              {hasMtg && (
                <>
                  <DayIcon count={dm.length} isPast={pastMtg} />
                  <span style={WV.title}>
                    {dm.length === 1 ? (dm[0].title || "Meeting") : `Meetings : ${dm.length}`}
                  </span>
                </>
              )}
            </div>

            {/* Plus icon far right */}
            {hasMtg && (
              <div style={{ display: "flex", alignItems: "center", paddingRight: 20 }}>
                <PlusCircle color={pastMtg ? "#EF4444" : dm.length > 1 ? "#10B981" : "#3B82F6"} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const WV = {
  label: {
    width: 100,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    borderRight: "1px solid #F3F4F6",
    padding: "12px 0",
    gap: 2,
  },
  content: {
    flex: 1,
    padding: "0 20px",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  title: { fontSize: 13, color: "#374151", fontWeight: 500 },
};

/* ─── DAY VIEW ────────────────────────────────────────────────────────────── */
// Image 2: Large date number (very big, light weight) on the left column,
// day name above in blue. Content area is very spacious/tall.
const DayView = ({ currentDate, meetings, today, selectedDay, onSelect }) => {
  const todayNorm = new Date(today); todayNorm.setHours(0,0,0,0);
  const dm = getMeetingsForDay(meetings, currentDate);
  const isToday = sameDay(currentDate, todayNorm);
  const isPast = currentDate < todayNorm && !isToday;
  const isSel = selectedDay && sameDay(currentDate, selectedDay);
  const hasMtg = dm.length > 0;
  const pastMtg = hasMtg && isPast;

  let bg = "#EFF6FF"; // Day view always shows the blue-tinted bg as per image 2
  if (hasMtg && !isPast) bg = "#EFF6FF";
  else if (hasMtg && isPast) bg = "#FEF2F2";
  if (!hasMtg) bg = "#EFF6FF";
  if (isSel) bg = "#EFF6FF";

  return (
    <div className="overAllSingleDayAndDateCnt"
      onClick={() => hasMtg && onSelect(currentDate)}
      style={{
        display: "flex",
        alignItems: "center",
        minHeight: 460,  // tall as per image 2
        background: bg,
        border: isSel ? "1.5px solid #004ECC" : "none",
        cursor: hasMtg ? "pointer" : "default",
      }}
    >
      {/* Left label column */}
      <div className="singleDayAndDateCnt" style={DV.label}>
        <span className="singleDay" style={{
          fontSize: 14, fontWeight: 700,
          color: isToday ? "#004ECC" : "#3B82F6",
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}>
          {DAYS_SHORT[currentDate.getDay()].toUpperCase()}
        </span>
        <span style={{
          fontSize: 72,
          fontWeight: 300,
          color: isToday ? "#004ECC" : "#9CA3AF",
          lineHeight: 1,
        }}>
          {currentDate.getDate()}
        </span>
      </div>

      {/* Content */}
      <div className="singleDayAndDateIconAndTitleCnt" style={DV.content}>
        {hasMtg && (
          <>
            <DayIcon count={dm.length} isPast={pastMtg} />
            <span style={DV.title}>
              {dm.length === 1 ? (dm[0].title || "Meeting") : `Meetings : ${dm.length}`}
            </span>
          </>
        )}
      </div>

      {hasMtg && (
        <div style={{ paddingRight: 28 }}>
          <PlusCircle color={pastMtg ? "#EF4444" : dm.length > 1 ? "#10B981" : "#3B82F6"} />
        </div>
      )}
    </div>
  );
};

const DV = {
  label: {
    width: 140,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    borderRight: "1px solid #E5E7EB",
    gap: 4,
    alignSelf: "stretch",
  },
  content: {
    flex: 1,
    padding: "0 28px",
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  title: { fontSize: 15, color: "#374151", fontWeight: 500 },
};

/* ─── MAIN ────────────────────────────────────────────────────────────────── */
export default function MyMeetings() {
  const navigate = useNavigate();
  const socketRef = useSocket();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("month");
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date(); d.setHours(0,0,0,0); return d;
  });
  const [selectedDay, setSelectedDay] = useState(null);
  const [sideMeetings, setSideMeetings] = useState([]);

  const today = new Date(); today.setHours(0,0,0,0);

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
        if (d.success) {
          console.log("[MyMeetings] loaded:", d.meetings.length, "meetings");
          setMeetings(d.meetings);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchMeetings();
    const socket = socketRef?.current;
    if (socket) socket.emit("outlook:request_sync");
  }, [fetchMeetings, socketRef]);

  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return;
    const h = () => fetchMeetings();
    socket.on("meetings:refresh", h);
    return () => socket.off("meetings:refresh", h);
  }, [socketRef, fetchMeetings]);

  const handleJoin = (m) => {
    const isHost = m.hostId === currentUser?.id;
    if (isHost) navigate(`/room/${m.roomId}`, { state: { isScheduledHost: true } });
    else navigate(`/join-room?roomId=${m.roomId}`);
  };

  const handleSelect = (date) => {
    const dm = getMeetingsForDay(meetings, date);
    if (!dm.length) return;
    if (selectedDay && sameDay(date, selectedDay)) {
      setSelectedDay(null); setSideMeetings([]);
    } else {
      setSelectedDay(date); setSideMeetings(dm);
    }
  };

  const closePanel = () => { setSelectedDay(null); setSideMeetings([]); };

  const navigate_cal = (dir) => {
    const d = new Date(currentDate);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    d.setHours(0,0,0,0);
    setCurrentDate(d);
    closePanel();
  };

  const panelOpen = sideMeetings.length > 0;

  // Header label
  // Month view: shows full month name; other views show short month name
  const headerLabel = view === "month"
    ? MONTHS[currentDate.getMonth()]
    : MONTHS_SHORT[currentDate.getMonth()];

  return (
    <div style={S.page}>
      <div style={S.container}>

        {/* ─ Top bar ─ */}
        <div className="headingAndSorterNewMeeting" style={S.topBar}>
          <div style={S.titleGroup}>
            <button style={S.backBtn} onClick={() => navigate(-1)}>
              <ChevL />
            </button>
            <div>
              <h1 style={S.title}>My Meetings</h1>
              <p style={S.subtitle}>Your scheduled and instant meetings</p>
            </div>
          </div>

          <div className="dateMonthWeekSorterCnt" style={S.right}>
            {/* Radio toggles */}
            <div className="calendericViewRadios" style={S.toggleGroup}>
              {["Month","Week","Day"].map((v) => {
                const active = view === v.toLowerCase();
                return (
                  <label key={v} style={S.radioWrap}>
                    <span style={{
                      ...S.radioOuter,
                      borderColor: active ? "#004ECC" : "#C4C8D0",
                    }}>
                      {active && <span style={S.radioDot} />}
                    </span>
                    <input
                      type="radio"
                      style={{ display: "none" }}
                      checked={active}
                      onChange={() => { setView(v.toLowerCase()); closePanel(); }}
                    />
                    <span style={S.radioText}>{v}</span>
                  </label>
                );
              })}
            </div>
            <button style={S.newBtn} onClick={() => navigate("/create-room")}>
              + New Meeting
            </button>
          </div>
        </div>

        <div className="monthAndYearCnt" style={S.navBar}>
              <button style={S.navBtn} onClick={() => navigate_cal(-1)}><ChevL /></button>
              <div className="monthAndYear" style={S.navLabel}>
                <span style={S.navMonth}>{headerLabel}</span>
                <span style={S.navYear}>{currentDate.getFullYear()}</span>
              </div>
              {/* Right side of nav: X close button when panel open, else chevron */}
              {panelOpen ? (
                <button style={S.navCloseBtn} onClick={closePanel}>
                  <XIcon />
                </button>
              ) : (
                <button style={S.navBtn} onClick={() => navigate_cal(1)}><ChevR /></button>
              )}
            </div>

        {/* ─ Calendar card ─ */}
        {loading ? (
          <p style={{ textAlign: "center", color: "#9CA3AF", marginTop: 60 }}>Loading meetings…</p>
        ) : (
          <div style={S.card}>
            {/* Nav bar — always full width, X button appears here when panel open */}
            {/* <div className="monthAndYearCnt" style={S.navBar}>
              <button style={S.navBtn} onClick={() => navigate_cal(-1)}><ChevL /></button>
              <div style={S.navLabel}>
                <span style={S.navMonth}>{headerLabel}</span>
                <span style={S.navYear}>{currentDate.getFullYear()}</span>
              </div> */}
              {/* Right side of nav: X close button when panel open, else chevron */}
              {/* {panelOpen ? (
                <button style={S.navCloseBtn} onClick={closePanel}>
                  <XIcon />
                </button>
              ) : (
                <button style={S.navBtn} onClick={() => navigate_cal(1)}><ChevR /></button>
              )}
            </div> */}

            {/* Calendar body + side panel side by side */}
            <div className="meetingListAndCalendarCnt" style={{ display: "flex", alignItems: "stretch" }}>
              {/* Calendar content — shrinks when panel open */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {view === "month" && (
                  <MonthView
                    year={currentDate.getFullYear()}
                    month={currentDate.getMonth()}
                    meetings={meetings}
                    today={today}
                    selectedDay={selectedDay}
                    onSelect={handleSelect}
                  />
                )}
                {view === "week" && (
                  <WeekView
                    currentDate={currentDate}
                    meetings={meetings}
                    today={today}
                    selectedDay={selectedDay}
                    onSelect={handleSelect}
                  />
                )}
                {view === "day" && (
                  <DayView
                    currentDate={currentDate}
                    meetings={meetings}
                    today={today}
                    selectedDay={selectedDay}
                    onSelect={handleSelect}
                  />
                )}
              </div>

              {/* Side panel — slides in to the right */}
              {panelOpen && (
                <SidePanel
                  meetings={sideMeetings}
                  onClose={closePanel}
                  currentUser={currentUser}
                  onJoin={handleJoin}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Page styles ─────────────────────────────────────────────────────────── */
const S = {
  page: {
    minHeight: "100vh",
    background: "#F5F7FB",
    padding: "32px 20px 60px",
    fontFamily: "Montserrat, sans-serif",
  },
  container: {  margin: "0 auto" },
  topBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: 20, flexWrap: "wrap", gap: 12,
  },
  titleGroup: { display: "flex", alignItems: "center", gap: 12 },
  backBtn: {
    background: "#F3F4F6", border: "none", borderRadius: 8,
    padding: "8px 10px", cursor: "pointer", display: "flex",
    alignItems: "center", color: "#374151",
  },
  title: { fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 },
  subtitle: { fontSize: 13, color: "#6B7280", margin: "3px 0 0" },
  right: { display: "flex", alignItems: "center", gap: 20 },
  toggleGroup: { display: "flex", alignItems: "center", gap: 20 },
  radioWrap: { display: "flex", alignItems: "center", gap: 7, cursor: "pointer" },
  radioOuter: {
    width: 18, height: 18, borderRadius: "50%", border: "2px solid",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  radioDot: { width: 8, height: 8, borderRadius: "50%", background: "#004ECC" },
  radioText: { fontSize: 14, color: "#374151" },
  newBtn: {
    background: "#004ECC", color: "#fff", border: "none", borderRadius: 8,
    padding: "10px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer",
    fontFamily: "Montserrat, sans-serif", whiteSpace: "nowrap",
  },
  card: {
    background: "#fff", borderRadius: 12,
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #F3F4F6",
    overflow: "hidden",
  },
  navBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 20px", borderBottom: "1px solid #F3F4F6",
  },
  navBtn: {
    background: "none", border: "none", cursor: "pointer",
    color: "#374151", display: "flex", alignItems: "center",
    padding: "4px 6px", borderRadius: 6,
  },
  // X close button replaces the right chevron when panel is open
  navCloseBtn: {
    background: "none", border: "none", cursor: "pointer",
    color: "#374151", display: "flex", alignItems: "center",
    padding: "4px 6px", borderRadius: 6,
  },
  navLabel: { display: "flex", alignItems: "baseline", gap: 10 },
  navMonth: { fontSize: 18, fontWeight: 700, color: "#111827" },
  navYear: { fontSize: 16, fontWeight: 400, color: "#6B7280" },
};