import React, { useEffect, useRef, useState } from 'react';
import Footer from './Footer';
import MainMicOff from "../assets/micCloseIcon.svg";
import MainCamOff from "../assets/videoCloseIcon.svg";
import DummyCam from '../assets/dummyCam Image.svg';
import NavMicOpen from '../assets/micOpenIcon.svg';
import LandingLogo from '../assets/CMeetingLandingLogo.png';
import { useNavigate } from 'react-router-dom';
import CopyIcon from '../assets/copyIcon.svg';
import { useSocket } from '../sockets/socket';

import { useLocation } from 'react-router-dom';

// Inside JoinRoom component:

// const SIGNALING_SERVER =  'http://localhost:8000';
const SIGNALING_SERVER = "https://chatter-backend-4i7g.onrender.com";

const JoinRoom = () => {
  const navigate = useNavigate();
  const socketRef = useSocket();
  const localStreamRef = useRef(null);
  const roomIdRef = useRef(""); // store roomId for cancel

  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamMuted, setIsCamMuted] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [waitingStatus, setWaitingStatus] = useState(null); // null | 'waiting' | 'rejected'
  const [loading, setLoading] = useState(false);
const location = useLocation();

const isPreFilled = !!new URLSearchParams(location.search).get('roomId');

  const [roomLink, setRoomLink] = useState(() => {
  const params = new URLSearchParams(location.search);  // ← reads ?roomId=xxxx
  return params.get('roomId') || '';
});

  /* ── Init ───────────────────────────────────────────────────────────────── */
  useEffect(() => {
    async function init() {
      const token = localStorage.getItem("token");
      if (!token) return navigate("/");

      try {
        const res = await fetch(`${SIGNALING_SERVER}/autosignin`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!data.success) return navigate("/");
        setUser(data.user);

        // Start media preview
        let stream = null;
        let micMuted = false, camMuted = false;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            camMuted = true;
          } catch {
            try {
              stream = await navigator.mediaDevices.getUserMedia({ video: true });
              micMuted = true;
            } catch {
              micMuted = true; camMuted = true;
            }
          }
        }

        if (stream) {
          const video = document.getElementById("previewVideo");
          if (video) video.srcObject = stream;
          localStreamRef.current = stream;
        }

        setIsMicMuted(micMuted);
        setIsCamMuted(camMuted);
      } catch {
        localStorage.removeItem("token");
        navigate("/");
      }
    }

    init();
    return () => { localStreamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  /* ── Mic / Cam toggles ───────────────────────────────────────────────────── */
  const handleMicToggle = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMicMuted(!track.enabled);
  };

  const handleCamToggle = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsCamMuted(!track.enabled);
  };

  /* ── Cancel waiting ──────────────────────────────────────────────────────── */
  const handleCancel = () => {
    const socket = socketRef.current;
    if (socket) {
      socket.off("waiting-for-approval");
      socket.off("join-approved");
      socket.off("join-rejected");
      socket.off("all-users");
      socket.off("room-not-found");
    }
    setWaitingStatus(null);
    setRoomLink("");
    setLoading(false);
  };

  /* ── Join ────────────────────────────────────────────────────────────────── */
  const handleGoToRoom = async () => {
    setError("");
    if (!roomLink.trim()) { setError("Please enter a meeting link or room code."); return; }

    let roomId = roomLink.includes("/room/")
      ? roomLink.split("/room/")[1].trim()
      : roomLink.trim();

    if (!roomId) { setError("Invalid meeting link."); return; }

    roomIdRef.current = roomId;
    setLoading(true);

    // Verify room exists
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${SIGNALING_SERVER}/check-room/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) {
        setError("Meeting not found. Please check the link.");
        setLoading(false);
        return;
      }
    } catch {
      setError("Unable to verify room. Please try again.");
      setLoading(false);
      return;
    }

    const socket = socketRef.current;
    if (!socket) {
      setError("Not connected. Please refresh the page.");
      setLoading(false);
      return;
    }

    // Stop preview
    localStreamRef.current?.getTracks().forEach(t => t.stop());

    // Emit join
    socket.emit("join-room", {
      roomId,
      name: user?.name || "Guest",
      muted: isMicMuted
    });

    // Listen for responses
    socket.once("waiting-for-approval", () => {
      setLoading(false);
      setWaitingStatus("waiting");
    });

    socket.once("join-approved", () => {
      setWaitingStatus(null);
      navigate(`/room/${roomId}`);
    });

    socket.once("join-rejected", () => {
      setLoading(false);
      setWaitingStatus("rejected");
    });

    socket.once("all-users", () => {
      // Direct join — no waiting needed
      setWaitingStatus(null);
      navigate(`/room/${roomId}`);
    });

    socket.once("room-not-found", () => {
      setLoading(false);
      setError("Room not found or has ended.");
    });

    // Fallback timeout
    setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError("Connection timeout. Please try again.");
      }
    }, 10000);
  };

  /* ── Avatar ──────────────────────────────────────────────────────────────── */
  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  /* ════════════════════════════ RENDER ══════════════════════════════════════ */
  return (
    <div>
      {/* Header */}
      <section className='headerSc'>
        <div className="container-fluid">
          <div className="headerMainCnt">
            <div className="logoCnt" style={{ cursor: "pointer" }} onClick={() => navigate("/")}>
              <img src={LandingLogo} alt="Logo" />
            </div>
            <div className="searchLoginCnt">
              {user && (
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "#004ECC", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#fff"
                }}>
                  {initials}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main */}
      <section className='createNewMeetingSc'>
        <div className='container-fluid'>
          <div className='row'>

            {/* Left: Camera preview */}
            <div className='col-md-6 col-lg-7 col-xl-7 col-xxl-7'>
              <div className='CreateVideoCnt'>
                <h4>Join Meeting</h4>
                <div style={{ position: "relative" }}>
                  {isCamMuted && (
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "#1a1a2e", borderRadius: 12,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      zIndex: 1
                    }}>
                      <div style={{
                        width: 64, height: 64, borderRadius: "50%",
                        background: "#004ECC", display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: 24, fontWeight: 700, color: "#fff"
                      }}>
                        {initials}
                      </div>
                    </div>
                  )}
                  <video
                    id="previewVideo"
                    autoPlay muted playsInline
                    style={{
                      width: "100%", maxWidth: "50vw", height: "60vh",
                      background: "#0d0d1a", borderRadius: 12,
                      objectFit: "cover", display: "block"
                    }}
                  />
                </div>

                <div className='row'>
                  <div className='micAndVideoCnt'>
                    <div
                      className='micAndVideoBackShadow'
                      onClick={handleMicToggle}
                      style={{
                        cursor: "pointer",
                        background: isMicMuted ? "rgba(239,68,68,0.2)" : undefined,
                        border: isMicMuted ? "1px solid rgba(239,68,68,0.4)" : undefined
                      }}
                    >
                      <img src={isMicMuted ? MainMicOff : NavMicOpen} alt="Mic" />
                    </div>
                    <div
                      className='micAndVideoBackShadow'
                      onClick={handleCamToggle}
                      style={{
                        cursor: "pointer",
                        background: isCamMuted ? "rgba(239,68,68,0.2)" : undefined,
                        border: isCamMuted ? "1px solid rgba(239,68,68,0.4)" : undefined
                      }}
                    >
                      <img src={isCamMuted ? MainCamOff : DummyCam} alt="Cam" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Join form / Waiting / Rejected */}
            <div className='col-md-6 col-lg-5 col-xl-5 col-xxl-5'>
              <div className='createMeetingLinkCnt'>

                {/* ── Waiting state ── */}
                {waitingStatus === "waiting" ? (
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", textAlign: "center",
                    padding: "40px 20px", gap: 24, minHeight: 320
                  }}>
                    {/* Spinner */}
                    <div style={{ position: "relative", width: 80, height: 80 }}>
                      <div style={{
                        width: 80, height: 80, borderRadius: "50%",
                        border: "4px solid rgba(0,78,204,0.12)",
                        borderTop: "4px solid #004ECC",
                        animation: "jrSpin 1s linear infinite"
                      }} />
                      <div style={{
                        position: "absolute", inset: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 28
                      }}>⏳</div>
                    </div>

                    <div>
                      <h4 style={{
                        fontSize: 20, fontWeight: 700, color: "#111827",
                        marginBottom: 8, fontFamily: "Montserrat, sans-serif"
                      }}>
                        Waiting for Host
                      </h4>
                      <p style={{
                        fontSize: 13, color: "#6B7280", lineHeight: 1.7,
                        fontFamily: "Montserrat, sans-serif", margin: 0
                      }}>
                        You've been placed in the waiting room.<br />
                        The host will admit you shortly.
                      </p>
                    </div>

                    {/* Animated dots */}
                    <div style={{ display: "flex", gap: 8 }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{
                          width: 9, height: 9, borderRadius: "50%",
                          background: "#004ECC",
                          animation: `jrBounce 1.2s ease-in-out ${i * 0.2}s infinite`
                        }} />
                      ))}
                    </div>

                    {/* Room code display */}
                    <div style={{
                      background: "#F5F7FB", border: "1px solid #E5E7EB",
                      borderRadius: 8, padding: "8px 16px",
                      display: "flex", alignItems: "center", gap: 8
                    }}>
                      <span style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "Montserrat, sans-serif" }}>Room</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#111827", fontFamily: "monospace" }}>
                        {roomIdRef.current}
                      </span>
                    </div>

                    <button
                      onClick={handleCancel}
                      style={{
                        background: "none", border: "1.5px solid #E5E7EB",
                        borderRadius: 8, padding: "9px 24px",
                        fontSize: 13, fontWeight: 600, color: "#6B7280",
                        cursor: "pointer", fontFamily: "Montserrat, sans-serif",
                        transition: "all 0.15s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "#004ECC"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "#E5E7EB"}
                    >
                      Cancel
                    </button>
                  </div>

                ) : waitingStatus === "rejected" ? (
                  /* ── Rejected state ── */
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", textAlign: "center",
                    padding: "40px 20px", gap: 20, minHeight: 320
                  }}>
                    <div style={{
                      width: 80, height: 80, borderRadius: "50%",
                      background: "rgba(239,68,68,0.1)", border: "2px solid rgba(239,68,68,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 36
                    }}>🚫</div>

                    <div>
                      <h4 style={{
                        fontSize: 20, fontWeight: 700, color: "#111827",
                        marginBottom: 8, fontFamily: "Montserrat, sans-serif"
                      }}>
                        Entry Denied
                      </h4>
                      <p style={{
                        fontSize: 13, color: "#6B7280", lineHeight: 1.7,
                        fontFamily: "Montserrat, sans-serif", margin: 0
                      }}>
                        The host declined your request to join this meeting.
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        onClick={handleCancel}
                        style={{
                          background: "none", border: "1.5px solid #E5E7EB",
                          borderRadius: 8, padding: "9px 20px",
                          fontSize: 13, fontWeight: 600, color: "#6B7280",
                          cursor: "pointer", fontFamily: "Montserrat, sans-serif"
                        }}
                      >
                        Go Back
                      </button>
                      <button
                        onClick={() => { setWaitingStatus(null); handleGoToRoom(); }}
                        style={{
                          background: "#004ECC", border: "none",
                          borderRadius: 8, padding: "9px 20px",
                          fontSize: 13, fontWeight: 700, color: "#fff",
                          cursor: "pointer", fontFamily: "Montserrat, sans-serif"
                        }}
                      >
                        Try Again
                      </button>
                    </div>
                  </div>

                ) : (
                  /* ── Normal join form ── */
                  <>
                    <h4>Enter Meeting Link</h4>

                    <div className="meetingCodeFinder modalJoinBtn">
                     <input
  type="text"
  value={roomLink}
  onChange={(e) => {
    if (isPreFilled) return; // block edits if pre-filled
    setRoomLink(e.target.value);
    setError("");
  }}
  placeholder="Paste link or enter room code"
  onKeyDown={e => e.key === "Enter" && handleGoToRoom()}
  disabled={loading}
  readOnly={isPreFilled}
  style={isPreFilled ? {
    background: "#F3F4F6",
    color: "#6B7280",
    cursor: "not-allowed",
    height:"50px"
  } : {}}
/>
                     {!isPreFilled && (
  <button onClick={async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRoomLink(text); setError("");
    } catch {
      setError("Clipboard access denied. Please paste manually.");
    }
  }}>
    Paste <img src={CopyIcon} alt='Copy Icon' />
  </button>
)}
                    </div>

                    {error && (
                      <p style={{
                        color: "#EF4444", fontSize: 12, marginTop: 8,
                        background: "#FEF2F2", padding: "8px 12px",
                        borderRadius: 6, border: "1px solid #FCA5A5",
                        fontFamily: "Montserrat, sans-serif"
                      }}>
                        ⚠️ {error}
                      </p>
                    )}

                    <div className='startMeetingBtnCnt'>
                      <button
                        className="createStartMeetingBtn"
                        onClick={handleGoToRoom}
                        disabled={!user || loading}
                        style={{ opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
                      >
                        {loading ? (
                          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                            <span style={{
                              width: 16, height: 16, borderRadius: "50%",
                              border: "2px solid rgba(255,255,255,0.3)",
                              borderTop: "2px solid #fff",
                              animation: "jrSpin 0.7s linear infinite",
                              display: "inline-block"
                            }} />
                            Joining…
                          </span>
                        ) : "Join Meeting"}
                      </button>
                    </div>

                    {/* Mic/cam status hint */}
                    <div style={{
                      display: "flex", gap: 10, marginTop: 16, justifyContent: "center"
                    }}>
                      <span style={{
                        fontSize: 11, padding: "4px 10px", borderRadius: 20,
                        fontFamily: "Montserrat, sans-serif", fontWeight: 600,
                        background: isMicMuted ? "#FEF2F2" : "#F0FDF4",
                        color: isMicMuted ? "#EF4444" : "#16A34A",
                        border: `1px solid ${isMicMuted ? "#FCA5A5" : "#86EFAC"}`
                      }}>
                        {isMicMuted ? "🔇 Mic Off" : "🎤 Mic On"}
                      </span>
                      <span style={{
                        fontSize: 11, padding: "4px 10px", borderRadius: 20,
                        fontFamily: "Montserrat, sans-serif", fontWeight: 600,
                        background: isCamMuted ? "#FEF2F2" : "#F0FDF4",
                        color: isCamMuted ? "#EF4444" : "#16A34A",
                        border: `1px solid ${isCamMuted ? "#FCA5A5" : "#86EFAC"}`
                      }}>
                        {isCamMuted ? "📷 Cam Off" : "📷 Cam On"}
                      </span>
                    </div>
                  </>
                )}

              </div>
            </div>

          </div>
        </div>
      </section>

      <Footer />

      {/* Animations */}
      <style>{`
        @keyframes jrSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes jrBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 1; }
          40% { transform: translateY(-10px); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

export default JoinRoom;