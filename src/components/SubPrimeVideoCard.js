import React, {
  useEffect, useMemo, useRef, useState,
  useLayoutEffect, useCallback
} from "react";

const USERS_PER_PAGE = 25;
const ASPECT_RATIO = 16 / 9;

/* =========================================================
   GRID DIMENSIONS HOOK
   Recalculates whenever userCount OR container size changes
========================================================= */
function useGridDimensions(containerRef, userCount) {
  const [dimensions, setDimensions] = useState({ cols: 1, rows: 1 });

  useLayoutEffect(() => {
    function update() {
      if (!containerRef.current || userCount === 0) return;
      const { clientWidth: W, clientHeight: H } = containerRef.current;
      let bestCols = 1, maxSize = 0;
      for (let cols = 1; cols <= userCount; cols++) {
        const rows = Math.ceil(userCount / cols);
        const size = Math.min(W / cols, (H / rows) * ASPECT_RATIO);
        if (size > maxSize) { maxSize = size; bestCols = cols; }
      }
      setDimensions({ cols: bestCols, rows: Math.ceil(userCount / bestCols) });
    }
    const obs = new ResizeObserver(update);
    if (containerRef.current) obs.observe(containerRef.current);
    update();
    return () => obs.disconnect();
  }, [userCount]);

  return dimensions;
}

/* =========================================================
   ACTIVE SPEAKER HOOK
========================================================= */
function useActiveSpeaker(users) {
  const [active, setActive] = useState(null);
  useEffect(() => {
    if (!users.length) return;
    const contexts = [], analysers = [];
    users.forEach(u => {
      if (!u.stream || u.muted) return;
      try {
        const track = u.stream.getAudioTracks()[0];
        if (!track) return;
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const src = ctx.createMediaStreamSource(new MediaStream([track]));
        const an = ctx.createAnalyser();
        an.fftSize = 256;
        src.connect(an);
        contexts.push(ctx);
        analysers.push({ analyser: an, userId: u.userId });
      } catch (_) {}
    });
    const data = new Uint8Array(128);
    let raf;
    const detect = () => {
      let maxV = 0, spk = null;
      analysers.forEach(({ analyser, userId }) => {
        analyser.getByteFrequencyData(data);
        const v = data.reduce((a, b) => a + b, 0);
        if (v > 1000 && v > maxV) { maxV = v; spk = userId; }
      });
      if (spk) setActive(spk);
      raf = requestAnimationFrame(detect);
    };
    detect();
    return () => { cancelAnimationFrame(raf); contexts.forEach(c => c.close()); };
  }, [users]);
  return active;
}

/* =========================================================
   INLINE SVG ICONS
========================================================= */
const Ic = ({ d, fill = "currentColor", size = 14, vb = "0 0 24 24" }) => (
  <svg width={size} height={size} viewBox={vb} fill={fill}>
    <path d={d} />
  </svg>
);

const MicOnIcon  = () => <Ic fill="white"    d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-6 9a6 6 0 0 0 12 0h2a8 8 0 0 1-7 7.93V21h-2v-3.07A8 8 0 0 1 4 10H6z" />;
const MicOffIcon = () => <Ic fill="#ef4444"  d="M17 11a5 5 0 0 1-8.584 3.502L17 6.418V11zm-5 7.9V21h2v-3.07A8 8 0 0 0 20 10h-2a6 6 0 0 1-6 6zM2.707 1.293 1.293 2.707 8 9.414V11a4 4 0 0 0 6.297 3.281l1.42 1.42A6 6 0 0 1 6 11H4a8 8 0 0 0 7 7.93V21H9v2h6v-2h-2v-2.07a7.97 7.97 0 0 0 2.652-.975l1.64 1.642 1.415-1.414L2.707 1.293z" />;
const PinIcon    = () => <Ic fill="white" size={12} d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />;
const UnpinIcon  = () => <Ic fill="white" size={12} d="M2 4l18 18-1.41 1.41L3.59 8.8 2 7.21V4zm14 8V4h1V2H7v2h1v1.17L16 12zm-5.2 2H6v-2l2-2V9.83L4.83 6.62 4 6V4h1v8l-2 2v2h5.2z" />;
const HandIcon   = () => <Ic fill="#FBBF24" d="M21 7a2 2 0 0 0-2-2 2 2 0 0 0-2-2 2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v9.586L5.586 11 4 12.586l4 4V19a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />;
const StarIcon   = () => <Ic fill="white" size={11} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />;

const iconBadge = {
  background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
  borderRadius: "50%", width: 22, height: 22,
  display: "flex", alignItems: "center", justifyContent: "center",
};

/* =========================================================
   VIDEO TILE
========================================================= */
function VideoTile({
  user, isActive, large, onClick,
  showUnpin, onUnpin, objectFit = "cover", compact = false
}) {
  const videoRef = useRef();
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = user.stream || null;
  }, [user.stream]);

  const initials = user.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  const avatarColor = useMemo(() => {
    const c = ["#2563eb", "#7c3aed", "#db2777", "#059669", "#d97706", "#0891b2"];
    return c[(user.name?.charCodeAt(0) || 0) % c.length];
  }, [user.name]);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        aspectRatio: "16/9",
        background: "#0d0d1a",
        borderRadius: large ? 10 : 8,
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        flexShrink: 0,
        boxShadow: isActive
          ? "0 0 0 2px #22c55e, 0 0 20px rgba(34,197,94,0.25)"
          : "0 2px 12px rgba(0,0,0,0.5)",
        transition: "box-shadow 0.2s ease",
      }}
    >
      {/* Video or avatar */}
      {user.stream ? (
        <video
          ref={videoRef} autoPlay playsInline muted
          style={{ width: "100%", height: "100%", objectFit, display: "block" }}
        />
      ) : (
        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          height: "100%",
          background: `linear-gradient(145deg, ${avatarColor}1a 0%, #0d0d1a 100%)`,
        }}>
          <div style={{
            width: large ? 80 : compact ? 28 : 44,
            height: large ? 80 : compact ? 28 : 44,
            borderRadius: "50%", background: avatarColor,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: large ? 30 : compact ? 11 : 16,
            fontWeight: 700, color: "#fff",
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: `0 0 24px ${avatarColor}55`,
          }}>
            {initials}
          </div>
        </div>
      )}

      {/* Active speaker pulse ring */}
      {isActive && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: "inherit",
          border: "2px solid #22c55e",
          animation: "speakerPulse 1.5s ease-in-out infinite",
          pointerEvents: "none",
        }} />
      )}

      {/* Bottom gradient for readability */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "48%",
        background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 100%)",
        pointerEvents: "none",
      }} />

      {/* Name */}
      <div style={{
        position: "absolute", bottom: 7, left: 8,
        color: "#fff", fontSize: compact ? 10 : 12,
        fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
        display: "flex", alignItems: "center", gap: 4,
        maxWidth: "calc(100% - 48px)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {user.isScreenSharing && (
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block", flexShrink: 0 }} />
        )}
        {user.name}
      </div>

      {/* Top-right status badges */}
      <div style={{ position: "absolute", top: 7, right: 7, display: "flex", gap: 4 }}>
        {user.handRaised   && <div style={iconBadge}><HandIcon /></div>}
        {user.isSpotlighted && <div style={{ ...iconBadge, background: "rgba(124,58,237,0.85)" }}><StarIcon /></div>}
      </div>

      {/* Mic icon */}
      <div style={{
        position: "absolute", bottom: 7, right: 7,
        background: user.muted ? "rgba(239,68,68,0.22)" : "rgba(0,0,0,0.55)",
        borderRadius: "50%", padding: 4,
        display: "flex", alignItems: "center", justifyContent: "center",
        border: user.muted ? "1px solid rgba(239,68,68,0.45)" : "none",
      }}>
        {user.muted ? <MicOffIcon /> : <MicOnIcon />}
      </div>

      {/* Unpin button */}
      {showUnpin && (
        <button
          onClick={e => { e.stopPropagation(); onUnpin(); }}
          style={{
            position: "absolute", top: 8, left: 8,
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
            color: "#fff", border: "1px solid rgba(255,255,255,0.18)",
            padding: "4px 10px 4px 8px", borderRadius: 20,
            cursor: "pointer", fontSize: 11,
            fontFamily: "'DM Sans', sans-serif",
            display: "flex", alignItems: "center", gap: 5, fontWeight: 600,
          }}
        >
          <UnpinIcon /> Unpin
        </button>
      )}

      {/* Pin hint on hover */}
      {onClick && !showUnpin && hovered && (
        <div style={{
          position: "absolute", top: 8, left: 8,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
          borderRadius: 20, padding: "4px 10px 4px 8px",
          display: "flex", alignItems: "center", gap: 5,
          fontSize: 11, color: "#fff",
          fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
          pointerEvents: "none",
        }}>
          <PinIcon /> Pin
        </div>
      )}
    </div>
  );
}

/* =========================================================
   GALLERY LAYOUT
   — containerRef is observed by ResizeObserver so grid
     recalculates automatically when the panel opens/closes
========================================================= */
function GalleryLayout({ users, activeSpeakerId, onPin }) {
  const ref = useRef(null);
  const { cols } = useGridDimensions(ref, users.length);

  return (
    <div
      ref={ref}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 6, padding: 10,
        width: "100%", height: "100%",
        alignContent: "center", boxSizing: "border-box",
      }}
    >
      {users.map(u => (
        <VideoTile
          key={u.userId} user={u}
          isActive={activeSpeakerId === u.userId}
          onClick={() => onPin(u)}
        />
      ))}
    </div>
  );
}

/* =========================================================
   STAGE LAYOUT  (Pinned / Spotlight / Screen Share)
========================================================= */
function StageLayout({ mainUser, others, activeSpeakerId, onPin, onUnpin, isScreenShare, isPinned }) {
  return (
    <div style={{
      display: "flex", width: "100%", height: "100%",
      padding: 10, gap: 10, boxSizing: "border-box",
    }}>
      {/* Main tile */}
      <div style={{ flex: 1, height: "100%", minWidth: 0, display: "flex", alignItems: "center" }}>
        <VideoTile
          user={mainUser} large
          isActive={activeSpeakerId === mainUser.userId}
          objectFit={isScreenShare ? "contain" : "cover"}
          showUnpin={isPinned}
          onUnpin={onUnpin}
        />
      </div>

      {/* Filmstrip sidebar */}
      {others.length > 0 && (
        <div style={{
          width: 192, display: "flex", flexDirection: "column",
          gap: 6, overflowY: "auto", overflowX: "hidden",
          paddingRight: 2,
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,255,255,0.08) transparent",
        }}>
          {others.map(u => (
            <div key={u.userId} style={{ width: "100%", flexShrink: 0 }}>
              <VideoTile
                user={u} compact
                isActive={activeSpeakerId === u.userId}
                onClick={() => onPin(u)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   PAGINATION
========================================================= */
function Pagination({ total, page, setPage }) {
  const pages = Math.ceil(total / USERS_PER_PAGE);
  return (
    <div style={{
      position: "absolute", bottom: 14, left: "50%",
      transform: "translateX(-50%)",
      display: "flex", gap: 6, zIndex: 10,
      background: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)",
      padding: "6px 10px", borderRadius: 30,
      border: "1px solid rgba(255,255,255,0.09)",
    }}>
      {Array.from({ length: pages }).map((_, i) => (
        <button
          key={i} onClick={() => setPage(i)}
          style={{
            border: "none", color: "#fff",
            width: 28, height: 28, borderRadius: "50%",
            cursor: "pointer", fontSize: 11,
            fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
            background: page === i ? "#2563eb" : "rgba(255,255,255,0.1)",
            transition: "background 0.2s",
          }}
        >{i + 1}</button>
      ))}
    </div>
  );
}

/* =========================================================
   LAYOUT MODE BADGE
========================================================= */
function LayoutBadge({ mode }) {
  const labels = { SCREEN: "Screen Share", SPOTLIGHT: "Spotlight", PINNED: "Pinned" };
  const label = labels[mode];
  if (!label) return null;
  return (
    <div style={{
      position: "absolute", top: 12, left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)",
      color: "#e2e8f0", padding: "4px 14px", borderRadius: 20,
      fontSize: 10, fontFamily: "'DM Sans', sans-serif", fontWeight: 700,
      border: "1px solid rgba(255,255,255,0.1)", zIndex: 10,
      letterSpacing: "0.08em", textTransform: "uppercase",
    }}>
      {label}
    </div>
  );
}

/* =========================================================
   MAIN EXPORT  — SubPrimeVideoCard
   
   Props:
     userList    – array of user objects (required)
     activePanel – "chat" | "participants" | null
                   When truthy, the component shrinks its
                   width so the parent side panel has room.
                   The ResizeObserver inside GalleryLayout
                   automatically recalculates the grid.
========================================================= */
export default function SubPrimeVideoCard({ userList = [], activePanel = null }) {

  console.log("userList=====123>",userList)


  const [pinnedUser, setPinnedUser]   = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const containerRef = useRef(null);

  const activeSpeakerId = useActiveSpeaker(userList);

  const screenSharer  = userList.find(u => u.isScreenSharing);
  const spotlightUser = userList.find(u => u.isSpotlighted);
  const mainUser      = screenSharer || spotlightUser || pinnedUser;
  const layoutMode    = screenSharer   ? "SCREEN"
                      : spotlightUser  ? "SPOTLIGHT"
                      : pinnedUser     ? "PINNED"
                      : "GALLERY";
 

  const handlePinToggle = useCallback(user => {
    setPinnedUser(prev => prev?.userId === user.userId ? null : user);
  }, []);

  const sidebarUsers = useMemo(() =>
    mainUser ? userList.filter(u => u.userId !== mainUser.userId) : userList,
    [userList, mainUser]
  );

  const paginatedUsers = useMemo(() => {
    if (layoutMode !== "GALLERY") return sidebarUsers;
    const start = currentPage * USERS_PER_PAGE;
    return sidebarUsers.slice(start, start + USERS_PER_PAGE);
  }, [sidebarUsers, currentPage, layoutMode]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
        @keyframes speakerPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
      `}</style>

      {/*
        Outer wrapper:
          • Takes 100% of whatever column Bootstrap gives it.
          • Uses CSS transition so it smoothly resizes when
            the parent col class changes from col-12 → col-8.
          • Height fills the available space above the toolbar.
      */}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          minHeight: 0,
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(145deg, #0d0d1a 0%, #0a0a18 100%)",
          borderRadius: 12,
          transition: "width 0.35s ease",   /* smooth when parent col changes */
        }}
      >
        {/* Subtle ambient glow */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
          background:
            "radial-gradient(ellipse at 15% 15%, rgba(37,99,235,0.06) 0%, transparent 55%)," +
            "radial-gradient(ellipse at 85% 85%, rgba(124,58,237,0.06) 0%, transparent 55%)",
        }} />

        {/* Layout */}
        <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%" }}>
          {layoutMode === "GALLERY" ? (
            <GalleryLayout
              users={paginatedUsers}
              activeSpeakerId={activeSpeakerId}
              onPin={handlePinToggle}
            />
          ) : (
            <StageLayout
              mainUser={mainUser}
              others={sidebarUsers}
              activeSpeakerId={activeSpeakerId}
              onPin={handlePinToggle}
              onUnpin={() => setPinnedUser(null)}
              isScreenShare={layoutMode === "SCREEN"}
              isPinned={layoutMode === "PINNED"}
            />
          )}
        </div>

        <LayoutBadge mode={layoutMode} />

        {layoutMode === "GALLERY" && userList.length > USERS_PER_PAGE && (
          <Pagination
            total={userList.length}
            page={currentPage}
            setPage={setCurrentPage}
          />
        )}
      </div>
    </>
  );
}