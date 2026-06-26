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
import ScreenShare from '../assets/OGScreenShareIcon.svg';
import ReactionEmoji from '../assets/ReactionEmoji.svg';
import InviteParticipant from '../assets/InviteParticipantIcon.svg';
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
// const InviteIconSVG = () => (
//   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//     <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
//     <circle cx="9" cy="7" r="4" />
//     <line x1="19" y1="8" x2="19" y2="14" />
//     <line x1="22" y1="11" x2="16" y2="11" />
//   </svg>
// );

const NavigationControl = ({
  isMicMuted, isCamMuted, toggleMic, toggleCam,
  screenStreamRef, isSharing, peersRef, setIsSharing, setMainVideo,
  localStreamRef, roomId, socketRef,
  activePanel,
  onToggleChat,
  onToggleParticipants,
  waitingCount = 0,
  chatUnreadCount = 0,
  onToggleWaiting,
  isHost = false,
  onToggleInvite,
  // ── Recording ─────────────────────────────────────────────────────────────
  isRecording = false,
  onStartRecording,
  onStopRecording,
  recordingDuration = 0,
  formatDuration,onLeave
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

  // ── Persist the guest's manual mic/cam choice so a page refresh doesn't
  //    silently turn things back on. Keyed per room so it doesn't leak
  //    across different meetings.
  const _persistMediaState = (patch) => {
    try {
      const key = `mediaState_${roomId}`;
      const prev = JSON.parse(localStorage.getItem(key) || '{}');
      localStorage.setItem(key, JSON.stringify({ ...prev, ...patch }));
    } catch { /* ignore storage errors */ }
  };

  const toggleVideo = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    toggleCam(!track.enabled);
    socketRef.current?.emit("video-toggle", { roomId, videoOff: !track.enabled });
    _persistMediaState({ camMuted: !track.enabled });
  };

  const toggleAudio = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    toggleMic(!track.enabled);
    socketRef.current?.emit("audio-toggle", { roomId, muted: !track.enabled });
    _persistMediaState({ micMuted: !track.enabled });
  };

  const handleLeaveMeeting = () => {
    const socket = socketRef.current;
    if (!socket) return;

    onLeave?.();  // ← triggers MeetingSection cleanup

    localStreamRef.current?.getTracks().forEach(track => track.stop());
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    socket.emit("leave-room", { roomId });
    // No socket.disconnect() here

    const isGuest = !localStorage.getItem("token");  // check before removing
    localStorage.removeItem("guest");
    localStorage.removeItem(`mediaState_${roomId}`);
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
              <img className='img-fluid' src={isMicMuted ? MainMicOff : NavMicOpen} alt="Mic" />
            </button>
            <div className='iconBtn' onClick={toggleVideo}>
              <img className='img-fluid' src={isCamMuted ? MainCamOff : DummyCam} alt="Cam" />
            </div>
            <div className='iconBtn' onClick={handleScreenShare}>
              <img className='img-fluid' src={ScreenShare} alt="Share" />
            </div>

            {/* Emoji reactions */}
            <div className='iconBtn' style={{ position: "relative" }}>
              <img className='img-fluid' src={ReactionEmoji} alt="Emoji" onClick={() => setShowReactions(p => !p)} style={{ cursor: "pointer" }} />
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
                <img className='img-fluid' src={MoreIcon} alt="More Icon" />
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


                {chatUnreadCount > 0 && (
  <span style={{
    position: 'absolute', top: -4, left: -4,
    background: '#EF4444', color: '#fff',
    borderRadius: '50%', width: 18, height: 18,
    fontSize: 10, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '2px solid #fff', lineHeight: 1,
    pointerEvents: 'none', fontFamily: 'Montserrat, sans-serif',
  }}>
    {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
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
                      <img src={InviteParticipant} alt="Invite Participants Icon" />
                    </div>
                    Invite People
                  </button>
                </li>
                {/* ────────────────────────────────────────────────────────── */}

                {/* ─── Record Meeting ──────────────────────────────────────── */}
                <li>
                  <button
                    className="dropdown-item"
                    onClick={isRecording ? onStopRecording : onStartRecording}
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: isRecording ? '#ef4444' : 'rgba(239,68,68,0.15)',
                      border: '2px solid #ef4444',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'background 0.2s',
                    }}>
                      {isRecording && (
                        <div style={{ width: 6, height: 6, background: '#fff', borderRadius: 1 }} />
                      )}
                    </div>
                    <span style={{ color: isRecording ? '#ef4444' : 'inherit', fontWeight: isRecording ? 700 : 400 }}>
                      {isRecording
                        ? `Stop Recording (${formatDuration?.(recordingDuration) ?? '00:00'})`
                        : 'Record Meeting'}
                    </span>
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

                



                <li>
  <button className="dropdown-item" onClick={onToggleChat} style={{ position: "relative" }}>
    <div><img src={ChatIcon} alt="Chat Icon" /></div>
    Chats
    {chatUnreadCount > 0 && (
      <span style={{
        position: "absolute", top: -4, right: -4,
        background: "#EF4444", color: "#fff", borderRadius: 20,
        minWidth: 18, height: 18, fontSize: 10, fontWeight: 700,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        padding: "0 5px",
      }}>
        {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
      </span>
    )}
  </button>
</li>

                <li className='mobileController'>
                  <button className="dropdown-item" onClick={onToggleParticipants}>
                    <div><img src={Participants} alt="Participants Icon" /></div>
                    Participants
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