import React, {
  useEffect, useMemo, useRef, useState,
  useLayoutEffect, useCallback
} from "react";

const USERS_PER_PAGE = 25;
const ASPECT_RATIO = 16 / 9;

function useGridDimensions(containerRef, userCount) {
  const [dimensions, setDimensions] = useState({ cols: 1, rows: 1 });
  useLayoutEffect(() => {
    function update() {
      if (!containerRef.current || userCount === 0) return;
      const { clientWidth: W, clientHeight: H } = containerRef.current;
      let bestCols = 1, maxScore = -1;
      for (let cols = 1; cols <= userCount; cols++) {
        const rows = Math.ceil(userCount / cols);
        const tileW = W / cols;
        const tileH = H / rows;
        const size = Math.min(tileW, tileH * ASPECT_RATIO);
        const orphans = rows * cols - userCount;
        const score = size * (1 - orphans * 0.05);
        if (score > maxScore) { maxScore = score; bestCols = cols; }
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

const Ic = ({ d, fill = "currentColor", size = 14, vb = "0 0 24 24" }) => (
  <svg width={size} height={size} viewBox={vb} fill={fill}><path d={d} /></svg>
);

const MicOnIcon  = () => <Ic fill="white"   d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-6 9a6 6 0 0 0 12 0h2a8 8 0 0 1-7 7.93V21h-2v-3.07A8 8 0 0 1 4 10H6z" />;
const MicOffIcon = () => <Ic fill="#ef4444" d="M17 11a5 5 0 0 1-8.584 3.502L17 6.418V11zm-5 7.9V21h2v-3.07A8 8 0 0 0 20 10h-2a6 6 0 0 1-6 6zM2.707 1.293 1.293 2.707 8 9.414V11a4 4 0 0 0 6.297 3.281l1.42 1.42A6 6 0 0 1 6 11H4a8 8 0 0 0 7 7.93V21H9v2h6v-2h-2v-2.07a7.97 7.97 0 0 0 2.652-.975l1.64 1.642 1.415-1.414L2.707 1.293z" />;
const PinIcon    = () => <Ic fill="white" size={12} d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />;
const UnpinIcon  = () => <Ic fill="white" size={12} d="M2 4l18 18-1.41 1.41L3.59 8.8 2 7.21V4zm14 8V4h1V2H7v2h1v1.17L16 12zm-5.2 2H6v-2l2-2V9.83L4.83 6.62 4 6V4h1v8l-2 2v2h5.2z" />;
const HandIcon   = () => <Ic fill="#FBBF24" d="M21 7a2 2 0 0 0-2-2 2 2 0 0 0-2-2 2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v9.586L5.586 11 4 12.586l4 4V19a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />;
const StarIcon   = () => <Ic fill="white" size={11} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />;

const FullscreenIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="white">
    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
  </svg>
);
const ExitFullscreenIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="white">
    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
  </svg>
);

const iconBadge = {
  background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
  borderRadius: "50%", width: 22, height: 22,
  display: "flex", alignItems: "center", justifyContent: "center",
};

function VideoTile({
  user, isActive, large, onClick,
  showUnpin, onUnpin, compact = false, hostId, localUserId,
  isScreenShare = false,
  showFullscreenBtn = false,
  isFullscreen = false,
  onFullscreen,
}) {
  const videoRef  = useRef();
  const outerRef  = useRef();
  const [hovered, setHovered]   = useState(false);
  const [videoBox, setVideoBox] = useState({ top: 0, left: 0, width: "100%", height: "100%" });

  // const hasVideoTracks =
  //   user.stream &&
  //   user.stream.getVideoTracks().length > 0 &&
  //   user.stream.getVideoTracks().some(t => t.enabled);

  const activeStream =
  (user.isScreenSharing && user.screenStream)
    ? user.screenStream
    : user.stream;

const hasVideoTracks =
  activeStream &&
  activeStream.getVideoTracks().length > 0 &&
  activeStream.getVideoTracks().some(t => t.enabled);

  const objectFit = isScreenShare || hasVideoTracks ? "contain" : "cover";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // if (user.stream && hasVideoTracks) {
    //   if (video.srcObject?.id !== user.stream.id) video.srcObject = user.stream;
if (activeStream && hasVideoTracks) {
  if (video.srcObject?.id !== activeStream.id)
    video.srcObject = activeStream;
      video.play().catch(() => setTimeout(() => video.play().catch(() => {}), 800));
    } else {
      video.srcObject = null;
    }
  // }, [user.stream, hasVideoTracks]);
}, [activeStream, hasVideoTracks]);
  const recomputeBox = useCallback(() => {
    if (!isScreenShare) {
      setVideoBox({ top: 0, left: 0, width: "100%", height: "100%" });
      return;
    }
    const outer = outerRef.current;
    const video = videoRef.current;
    if (!outer) return;
    const W = outer.clientWidth;
    const H = outer.clientHeight;
    const vw = video?.videoWidth  || 16;
    const vh = video?.videoHeight || 9;
    const videoAR = vw / vh;
    const boxAR   = W  / H;
    let rw, rh;
    if (videoAR > boxAR) { rw = W; rh = W / videoAR; }
    else                  { rh = H; rw = H * videoAR; }
    setVideoBox({ top: (H - rh) / 2, left: (W - rw) / 2, width: rw, height: rh });
  }, [isScreenShare]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.addEventListener("loadedmetadata", recomputeBox);
    video.addEventListener("resize",         recomputeBox);
    return () => {
      video.removeEventListener("loadedmetadata", recomputeBox);
      video.removeEventListener("resize",         recomputeBox);
    };
  }, [recomputeBox]);

  useLayoutEffect(() => {
    if (!outerRef.current) return;
    const obs = new ResizeObserver(recomputeBox);
    obs.observe(outerRef.current);
    recomputeBox();
    return () => obs.disconnect();
  }, [recomputeBox]);

  const initials = user.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  const avatarColor = useMemo(() => {
    const c = ["#2563eb", "#7c3aed", "#db2777", "#059669", "#d97706", "#0891b2"];
    return c[(user.name?.charCodeAt(0) || 0) % c.length];
  }, [user.name]);

  return (
    <div
      ref={outerRef}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative", width: "100%", height: "100%",
        background: "#0d0d1a",
        borderRadius: large ? 10 : 8, overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        boxShadow: isActive
          ? "0 0 0 2px #22c55e, 0 0 20px rgba(34,197,94,0.25)"
          : "0 2px 12px rgba(0,0,0,0.5)",
        transition: "box-shadow 0.2s ease",
      }}
    >
      {isActive && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: "inherit",
          border: "2px solid #22c55e",
          animation: "speakerPulse 1.5s ease-in-out infinite",
          pointerEvents: "none", zIndex: 10,
        }} />
      )}

      <video
        ref={videoRef}
        autoPlay playsInline
        muted={user.userId === localUserId}
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit, display: "block",
          opacity: hasVideoTracks ? 1 : 0,
        }}
      />

      {!hasVideoTracks && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", justifyContent: "center", alignItems: "center",
          background: `radial-gradient(ellipse at center, ${avatarColor}22 0%, #0d0d1a 70%)`,
        }}>
          <div style={{
            width: large ? 80 : compact ? 28 : 44,
            height: large ? 80 : compact ? 28 : 44,
            borderRadius: "50%", background: avatarColor,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: large ? 30 : compact ? 11 : 16,
            fontWeight: 700, color: "#fff", fontFamily: "'DM Sans', sans-serif",
            boxShadow: `0 0 24px ${avatarColor}55`,
          }}>{initials}</div>
        </div>
      )}

      <div style={{
        position: "absolute",
        top: videoBox.top, left: videoBox.left,
        width: videoBox.width, height: videoBox.height,
        borderRadius: large ? 10 : 8,
        overflow: "hidden", pointerEvents: "none",
      }}>
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "48%",
          background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 100%)",
        }} />

        <div style={{
          position: "absolute", bottom: 7, left: 8,
          color: "#fff", fontSize: compact ? 10 : 12,
          fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
          display: "flex", alignItems: "center", gap: 4,
          maxWidth: "calc(100% - 48px)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {user.authId === hostId && <div className="host-badge">👑 Host</div>}
          {user.isScreenSharing && (
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block", flexShrink: 0 }} />
          )}
          {user.name}
        </div>

        <div style={{
          position: "absolute", bottom: 7, right: 7,
          background: user.muted ? "rgba(239,68,68,0.22)" : "rgba(0,0,0,0.55)",
          borderRadius: "50%", padding: 4,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: user.muted ? "1px solid rgba(239,68,68,0.45)" : "none",
          pointerEvents: "auto",
        }}>
          {user.muted ? <MicOffIcon /> : <MicOnIcon />}
        </div>

        <div style={{ position: "absolute", top: 7, right: 7, display: "flex", gap: 4, alignItems: "center" }}>
          {user.handRaised    && <div style={iconBadge}><HandIcon /></div>}
          {user.isSpotlighted && <div style={{ ...iconBadge, background: "rgba(124,58,237,0.85)" }}><StarIcon /></div>}

          {showFullscreenBtn && (hovered || isFullscreen) && (
            <button
              onClick={e => { e.stopPropagation(); onFullscreen?.(); }}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              style={{
                background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: "50%", width: 28, height: 28,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", pointerEvents: "auto",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.18)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.65)"}
            >
              {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
            </button>
          )}
        </div>

        {user.reaction && (
          <div style={{
            position: "absolute", bottom: "35%", left: "50%",
            transform: "translateX(-50%)",
            fontSize: large ? 60 : 40,
            animation: "floatUp 2.5s ease-out forwards",
          }}>{user.reaction}</div>
        )}

        {/* Unpin button — only in PINNED mode (not during screen share) */}
        {showUnpin && (
          <button
            onClick={e => { e.stopPropagation(); onUnpin(); }}
            style={{
              position: "absolute", top: 8, left: 8,
              background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
              color: "#fff", border: "1px solid rgba(255,255,255,0.18)",
              padding: "4px 10px 4px 8px", borderRadius: 20,
              cursor: "pointer", fontSize: 11, fontFamily: "'DM Sans', sans-serif",
              display: "flex", alignItems: "center", gap: 5, fontWeight: 600,
              pointerEvents: "auto",
            }}
          ><UnpinIcon /> Unpin</button>
        )}

        {/* Pin hint on hover — only in gallery tiles */}
        {onClick && !showUnpin && hovered && (
          <div style={{
            position: "absolute", top: 8, left: 8,
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
            borderRadius: 20, padding: "4px 10px 4px 8px",
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 11, color: "#fff", fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
          }}><PinIcon /> Pin</div>
        )}
      </div>
    </div>
  );
}

function GalleryLayout({ users, activeSpeakerId, onPin, hostId, localUserId }) {
  const ref = useRef(null);
  const { cols, rows } = useGridDimensions(ref, users.length);
  const orphans = rows * cols - users.length;

  return (
    <div
      ref={ref}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridAutoRows: "1fr",
        gap: 6, padding: 10,
        width: "100%", height: "100%",
        boxSizing: "border-box",
      }}
    >
      {users.map((u, i) => {
        const isLastTile = i === users.length - 1;
        const span = isLastTile && orphans > 0 ? orphans + 1 : 1;
        return (
          <div key={u.userId} style={{ gridColumn: span > 1 ? `span ${span}` : undefined }}>
            <VideoTile
              user={u}
              isActive={activeSpeakerId === u.userId}
              onClick={() => onPin(u)}
              hostId={hostId}
              localUserId={localUserId}
            />
          </div>
        );
      })}
    </div>
  );
}

function StageLayout({
  mainUser, others, activeSpeakerId,
  onPin, onUnpin, isScreenShare, isPinned,
  hostId, localUserId,
  isFullscreen, onFullscreen,
}) {
  return (
    <div style={{
      display: "flex", width: "100%", height: "100%",
      padding: 10, gap: 10, boxSizing: "border-box",
    }}>
      <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
        <VideoTile
          user={mainUser} large
          isActive={activeSpeakerId === mainUser.userId}
          // showUnpin whenever a user is pinned, regardless of screen share
          showUnpin={isPinned}
          onUnpin={onUnpin}
          isScreenShare={isScreenShare}
          hostId={hostId}
          localUserId={localUserId}
          showFullscreenBtn
          isFullscreen={isFullscreen}
          onFullscreen={onFullscreen}
        />
      </div>

      {others.length > 0 && (
        <div style={{
          width: 180, flexShrink: 0,
          display: "flex", flexDirection: "column",
          gap: 6, overflowY: "auto", overflowX: "hidden",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,255,255,0.08) transparent",
        }}>
          {others.map(u => (
            <div key={u.userId} style={{ width: "100%", aspectRatio: "16/9", flexShrink: 0 }}>
              <VideoTile
                user={u} compact
                isActive={activeSpeakerId === u.userId}
                onClick={() => onPin(u)}
                hostId={hostId}
                localUserId={localUserId}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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

export default function SubPrimeVideoCard({ userList = [], activePanel = null, hostId, localUserId }) {

  const [pinnedUser, setPinnedUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  const activeSpeakerId = useActiveSpeaker(userList);

  const screenSharer  = userList.find(u => u.isScreenSharing);
  const spotlightUser = userList.find(u => u.isSpotlighted);

  const handlePinToggle = useCallback(user => {
    setPinnedUser(prev => prev?.userId === user.userId ? null : user);
  }, []);

  // Screen share always forces stage layout; pin/spotlight apply only when no screen share
// Change priority: pinnedUser wins over screenSharer
const mainUser   = pinnedUser  || spotlightUser;
const layoutMode = pinnedUser    ? "PINNED"
             
                 : spotlightUser ? "SPOTLIGHT"
                 : "GALLERY";

  const mainTileUser = useMemo(() => {
    // Screen share always gets the main tile with screen stream
    // if (screenSharer) return { ...screenSharer, stream: screenSharer.screenStream };
    return mainUser;
  }, [screenSharer, mainUser]);

  // During screen share: show ALL users in sidebar (including sharer's camera tile)
  // When pinned (no screen share): exclude pinned user from sidebar
  // Otherwise: show all
  const sidebarUsers = useMemo(() => {
    if (layoutMode === "SCREEN") return userList;
    if (pinnedUser) return userList.filter(u => u.userId !== pinnedUser.userId);
    return userList;
  }, [userList, pinnedUser, layoutMode]);

  const paginatedUsers = useMemo(() => {
    if (layoutMode !== "GALLERY") return sidebarUsers;
    // In gallery mode show ALL users, not sidebarUsers (which excludes mainUser)
    const start = currentPage * USERS_PER_PAGE;
    return userList.slice(start, start + USERS_PER_PAGE);
  }, [userList, sidebarUsers, currentPage, layoutMode]);

  const handleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.() || el.webkitRequestFullscreen?.() || el.mozRequestFullScreen?.();
    } else {
      document.exitFullscreen?.() || document.webkitExitFullscreen?.() || document.mozCancelFullScreen?.();
    }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
        @keyframes speakerPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes floatUp {
          0%   { opacity: 0; transform: translate(-50%, 20px) scale(0.8); }
          20%  { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -80px) scale(1.2); }
        }
        :fullscreen          { background: #0d0d1a; }
        :-webkit-full-screen { background: #0d0d1a; }
      `}</style>

      <div
        ref={containerRef}
        style={{
          width: "100%", height: "100%", minHeight: 0,
          position: "relative", overflow: "hidden",
          borderRadius: isFullscreen ? 0 : 12,
          transition: "width 0.35s ease",
          background: "#0d0d1a",
        }}
      >
        <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%" }}>
          {layoutMode === "GALLERY" ? (
            <GalleryLayout
              users={paginatedUsers}
              activeSpeakerId={activeSpeakerId}
              onPin={handlePinToggle}
              hostId={hostId}
              localUserId={localUserId}
            />
          ) : (
            <StageLayout
              mainUser={mainTileUser}
              others={sidebarUsers}
              activeSpeakerId={activeSpeakerId}
              onPin={handlePinToggle}
              onUnpin={() => setPinnedUser(null)}
              isScreenShare={layoutMode === "SCREEN"}
              isPinned={!!pinnedUser}
              hostId={hostId}
              localUserId={localUserId}
              isFullscreen={isFullscreen}
              onFullscreen={handleFullscreen}
            />
          )}
        </div>
        <LayoutBadge mode={layoutMode} />

        {layoutMode === "GALLERY" && userList.length > USERS_PER_PAGE && (
          <Pagination total={userList.length} page={currentPage} setPage={setCurrentPage} />
        )}
      </div>
    </>
  );
}
