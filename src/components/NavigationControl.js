// ────────────────────────────────────────────────────────────────────────────
// UPDATED NavigationControl.js
// Changes: added  onToggleInvite  prop + "Invite" button in the dropdown menu
// ────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import NavMicOpen from '../assets/micOpenIcon.svg';
import NavMicClose from '../assets/micCloseIcon.svg';
import DummyCam from '../assets/dummyCam Image.svg';
import DummyShare from '../assets/dummyScreenShare Image.svg';
import DummyEmoji from '../assets/dummyEmoji Image.svg';
import MoreIcon from '../assets/moreOptionIcon.svg';
import NavSeperator from '../assets/navSeperator.svg';
import DummyStopMeet from '../assets/dummyStopIcon Image.svg';
import RaiseHandIcon from '../assets/raiseHandIcon.svg';
import AdmitIcon from '../assets/admitIcon.svg';
import ChatIcon from '../assets/chatIcon.svg';
import Participants from '../assets/participantsIcon.svg';
import PollIcon from '../assets/pollIcon.svg';
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import { useNavigate, useParams } from "react-router-dom";

import MainMicOff from "../assets/micCloseIcon.svg";
import MainCamOff from "../assets/videoCloseIcon.svg";

// ─── ADD: inline invite icon (no new asset needed) ───────────────────────────
const InviteIconSVG = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
    <line x1="22" y1="11" x2="16" y2="11" />
  </svg>
);

const NavigationControl = ({
  isMicMuted, isCamMuted, toggleMic, toggleCam,
  screenStreamRef, isSharing, peersRef, setIsSharing, setMainVideo,
  localStreamRef, roomId, socketRef,
  activePanel,
  onToggleChat,
  onToggleParticipants,
  waitingCount = 0,
  onToggleWaiting,
  isHost = false,
  // ─── NEW ───────────────────────────────────────────────────────────────────
  onToggleInvite,   // () => void  — toggles the InvitePanel
}) => {

  const REACTIONS = ["👍", "👏", "❤️", "😂", "😮", "🔥"];
  const [showReactions, setShowReactions] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.on("audio-toggle", (data) => {});
    socket.on("video-toggle", (data) => {});

    return () => {
      socket.off("audio-toggle");
      socket.off("video-toggle");
    };
  }, [socketRef.current]);

  const handleScreenShare = async () => {
    if (isSharing) return stopScreenShare();
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];
      setIsSharing(true);
      setMainVideo(screenStream);

      Object.values(peersRef.current).forEach(peer => {
        if (peer.connectionState === 'closed' || peer.connectionState === 'failed') return;
        const sender = peer.getSenders().find(s => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(screenTrack);
        } else {
          try { peer.addTrack(screenTrack, screenStreamRef.current); }
          catch (e) { console.warn("[ScreenShare] addTrack failed:", e.message); }
        }
      });

      screenTrack.onended = stopScreenShare;
      socketRef.current?.emit("screen-share-started", { roomId });
    } catch (err) {
      console.error("Screen share failed:", err);
    }
  };

  const stopScreenShare = async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    setIsSharing(false);
    socketRef.current?.emit("screen-share-stopped", { roomId });
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0];

    await Promise.all(
      Object.values(peersRef.current).map(async (peer) => {
        const videoSender = peer.getSenders().find(s => s.track?.kind === "video");
        if (!videoSender) return;
        if (cameraTrack) {
          await videoSender.replaceTrack(cameraTrack);
        } else {
          peer.removeTrack(videoSender);
          await peer.setLocalDescription(await peer.createOffer());
          socketRef.current.emit("signal", { to: peer.remoteUserId, signal: peer.localDescription });
        }
      })
    );
    setMainVideo(localStreamRef.current || null);
  };

  const toggleVideo = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    toggleCam(!track.enabled);
    socketRef.current?.emit("video-toggle", { roomId, videoOff: !track.enabled });
  };

  const toggleAudio = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    toggleMic(!track.enabled);
    socketRef.current?.emit("audio-toggle", { roomId, muted: !track.enabled });
  };

  const handleLeaveMeeting = () => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("leave-room", { roomId });
    Object.values(peersRef.current).forEach(peer => peer.close());
    peersRef.current = {};
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    socket.disconnect();
    localStorage.removeItem("guest");
    const isGuest = !localStorage.getItem("token");
    navigate(isGuest ? `/guest-login?roomId=${roomId}` : "/");
  };

  function handleReaction(emoji) {
    socketRef.current.emit("reaction", { roomId, emoji });
    setShowReactions(false);
  }

  return (
    <section className='navigationControllerSc'>
      <div className="container">
        <div className="row">
          <div className="navControllerCnt">
            <button className='iconBtn' onClick={toggleAudio}>
              <img src={isMicMuted ? MainMicOff : NavMicOpen} alt="Mic" />
            </button>
            <div onClick={toggleVideo}>
              <img src={isCamMuted ? MainCamOff : DummyCam} alt="Cam" />
            </div>
            <div onClick={handleScreenShare}>
              <img src={DummyShare} alt="Share" />
            </div>

            {/* Emoji reactions */}
            <div style={{ position: "relative" }}>
              <img src={DummyEmoji} alt="Emoji" onClick={() => setShowReactions(p => !p)} style={{ cursor: "pointer" }} />
              {showReactions && (
                <div style={{
                  position: "absolute", bottom: "50px", background: "#1f1f2e",
                  padding: 10, borderRadius: 10, display: "flex", gap: 8, zIndex: 1,
                }}>
                  {REACTIONS.map(e => (
                    <span key={e} style={{ fontSize: 22, cursor: "pointer" }} onClick={() => handleReaction(e)}>{e}</span>
                  ))}
                </div>
              )}
            </div>

            {/* More menu */}
            <div className="iconBtnSubPr dropup">
              <button
                type="button"
                className="iconBtn dropdown-toggle"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                style={{ position: 'relative' }}
              >
                <img src={MoreIcon} alt="More Icon" />
                {waitingCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    background: '#EF4444', color: '#fff',
                    borderRadius: '50%', width: 18, height: 18,
                    fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid #fff', lineHeight: 1,
                    pointerEvents: 'none', fontFamily: 'Montserrat, sans-serif',
                  }}>
                    {waitingCount > 9 ? '9+' : waitingCount}
                  </span>
                )}
              </button>

              <ul className="dropdown-menu">
                <li>
                  <button className="dropdown-item">
                    <div><img src={RaiseHandIcon} alt="Raise Hand Icon" /></div>
                    Raise Hand
                  </button>
                </li>

                {/* ─── NEW: Invite People ─────────────────────────────────── */}
                <li>
                  <button
                    className="dropdown-item"
                    onClick={onToggleInvite}
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <div style={{ color: '#a5b4fc', display: 'flex', alignItems: 'center' }}>
                      <InviteIconSVG />
                    </div>
                    Invite People
                  </button>
                </li>
                {/* ────────────────────────────────────────────────────────── */}

                {isHost && (
                  <li>
                    <button className="dropdown-item" onClick={onToggleWaiting} style={{ position: 'relative' }}>
                      <div><img src={AdmitIcon} alt="Admit Icon" /></div>
                      Admit Participants
                      {waitingCount > 0 && (
                        <span style={{
                          marginLeft: 8, background: '#EF4444', color: '#fff',
                          borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 700,
                        }}>{waitingCount}</span>
                      )}
                    </button>
                  </li>
                )}

                <li className='mobileController'>
                  <button className="dropdown-item" onClick={onToggleParticipants}>
                    <div><img src={Participants} alt="Participants Icon" /></div>
                    Participants
                  </button>
                </li>
                <li>
                  <button className="dropdown-item" onClick={onToggleChat}>
                    <div><img src={ChatIcon} alt="Chat Icon" /></div>
                    Chats
                  </button>
                </li>
                <li className='mobileController'>
                  <button className="dropdown-item">
                    <div><img src={PollIcon} alt="Poll Icon" /></div>
                    Poll
                  </button>
                </li>
              </ul>
            </div>

            <div className='navSeparator'>
              <img src={NavSeperator} alt="Seperator" />
            </div>
            <div className='stopBtn' onClick={handleLeaveMeeting}>
              <span>Stop</span>
              <div><img src={DummyStopMeet} alt="Stop Call Icon" /></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NavigationControl;