import React, { useEffect, useRef, useState } from 'react';
import Footer from './Footer';
import MainMicOff from "../assets/micCloseIcon.svg";
import MainCamOff from "../assets/videoCloseIcon.svg";
import DummyCam from '../assets/dummyCam Image.svg';
import NavMicOpen from '../assets/micOpenIcon.svg';
import LandingLogo from '../assets/CMeetingLandingLogo.png';
import { useNavigate } from 'react-router-dom';
import CopyIcon from '../assets/copyIcon.svg';

const SIGNALING_SERVER = "https://chatter-backend-4i7g.onrender.com";
// const SIGNALING_SERVER = 'http://localhost:8000';

const JoinRoom = () => {
  const navigate = useNavigate();
  const localStreamRef = useRef(null);

  const [roomLink, setRoomLink] = useState("");
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamMuted, setIsCamMuted] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  /* ===============================
      INITIAL LOAD
  ================================*/
  useEffect(() => {
    async function init() {
      const token = localStorage.getItem("token");
      if (!token) return navigate("/login");

      // ── 1. Auth from backend ──────────────────────────
      try {
        const res = await fetch(`${SIGNALING_SERVER}/autosignin`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!data.success) return navigate("/login");

        setUser(data.user);

        // ── 2. Start media preview ────────────────────────
        let stream = null;
        let micMuted = false;
        let camMuted = false;

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
              micMuted = true;
              camMuted = true;
            }
          }
        }

        // ── 3. Attach stream to preview ───────────────────
        if (stream) {
          const video = document.getElementById("previewVideo");
          if (video) video.srcObject = stream;
          localStreamRef.current = stream;
        }

        setIsMicMuted(micMuted);
        setIsCamMuted(camMuted);

      } catch {
        localStorage.removeItem("token");
        navigate("/login");
      }
    }

    init();

    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  /* ===============================
      MIC TOGGLE
  ================================*/
  const handleMicToggle = () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    audioTrack.enabled = !audioTrack.enabled;
    setIsMicMuted(!audioTrack.enabled);
  };

  /* ===============================
      CAMERA TOGGLE
  ================================*/
  const handleCamToggle = () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    videoTrack.enabled = !videoTrack.enabled;
    setIsCamMuted(!videoTrack.enabled);
  };

  /* ===============================
      JOIN MEETING
  ================================*/
 /* ===============================
    JOIN MEETING
================================*/
const handleGoToRoom = async () => {
  setError("");

  if (!roomLink.trim()) {
    setError("Please enter a meeting link or room code.");
    return;
  }

  // Support both full link and raw room code
  let roomId;
  if (roomLink.includes("/room/")) {
    roomId = roomLink.split("/room/")[1].trim();
  } else {
    roomId = roomLink.trim();
  }

  if (!roomId) {
    setError("Invalid meeting link.");
    return;
  }

  // ── Check room exists in DB ───────────────────────────
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${SIGNALING_SERVER}/check-room/${roomId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    if (!data.success) {
      setError("Meeting not found. Please check the link.");
      return;
    }

  } catch {
    setError("Unable to verify room. Please try again.");
    return;
  }

  // ── Room valid → navigate ─────────────────────────────
  localStreamRef.current?.getTracks().forEach(t => t.stop());
  navigate(`/room/${roomId}`);
};

  return (
    <div>
      <section className='headerSc'>
        <div className="container-fluid">
          <div className="headerMainCnt">
            <div className="logoCnt">
              <img src={LandingLogo} alt="Logo" />
            </div>

            <div className="searchLoginCnt">
              {user && (
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "#004ECC",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#fff"
                }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className='createNewMeetingSc'>
        <div className='container-fluid'>
          <div className='row'>
            <div className='col-md-6 col-lg-7 col-xl-7 col-xxl-7'>
              <div className='CreateVideoCnt'>
                <h4>Join Meeting</h4>

                <video
                  id="previewVideo"
                  autoPlay
                  muted
                  playsInline
                  style={{ width: "50vw", height: "60vh", background: "black" }}
                />

                <div className='row'>
                    <div className='micAndVideoCnt'>
                        <div className='micAndVideoBackShadow' onClick={handleMicToggle} style={{ cursor: "pointer" }}>
                    <img src={isMicMuted ? MainMicOff : NavMicOpen} alt="Mic" />
                  </div>

                  <div className='micAndVideoBackShadow' onClick={handleCamToggle} style={{ cursor: "pointer" }}>
                    <img src={isCamMuted ? MainCamOff : DummyCam} alt="Cam" />
                  </div>
                    </div>                  
                </div>
              </div>
            </div>

            <div className='col-md-6 col-lg-5 col-xl-5 col-xxl-5'>
              <div className='createMeetingLinkCnt'>
                <h4>Enter Meeting Link</h4>

                
                <div className="meetingCodeFinder modalJoinBtn">
                  <input
                    type="text"
                    value={roomLink}
                    onChange={(e) => {
                      setRoomLink(e.target.value);
                      setError("");
                    }}
                    placeholder="Paste link or enter room code"
                  />

                    <button onClick={async () => {
      try {
        const text = await navigator.clipboard.readText();
        setRoomLink(text);
        setError("");
      } catch {
        setError("Clipboard access denied. Please paste manually.");
      }
    }}>
                    Paste<img src={CopyIcon} alt='Copy Icon' />
                  </button>
                </div>

                {/* Error message */}
                {error && (
                  <p style={{ color: "red", fontSize: 13, marginTop: 6 }}>
                    {error}
                  </p>
                )}

                <div className='startMeetingBtnCnt'>
                  <button
                    className="createStartMeetingBtn"
                    onClick={handleGoToRoom}
                    disabled={!user} // disable until auth is done
                  >
                    Join Meeting
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default JoinRoom;