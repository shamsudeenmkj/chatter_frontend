import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import VideoCard from "./videoCard";
import ChatCard from "./ChatCard";
import Participants from "./Participants";
import NavigationControl from "./NavigationControl";
import SubPrimeVideoCard from "./SubPrimeVideoCard";
import LinkSharingCard from "./LinkSharingCard";
import { useSocket } from "../sockets/socket";
import InvitePanel from "./InvitePanel";
const SIGNALING_SERVER = "https://chatter-backend-4i7g.onrender.com";
// const SIGNALING_SERVER = 'http://localhost:8000';

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:free.expressturn.com:3478" },
    {
      urls: "turn:free.expressturn.com:3478?transport=udp",
      username: "000000002085384559",
      credential: "oQIy00pPRpYEeWLCpFbtjbNntj4="
    },
    {
      urls: "turn:free.expressturn.com:443?transport=tcp",
      username: "000000002085384559",
      credential: "oQIy00pPRpYEeWLCpFbtjbNntj4="
    }
  ],
  iceCandidatePoolSize: 10
};
const MeetingSection = () => {
  // Add near the other state declarations
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamMuted, setIsCamMuted] = useState(false);
  const [waitingRoom, setWaitingRoom] = useState([]);
  
  
  const [activePanel, setActivePanel] = useState(null);
  
  
  
  const { roomId } = useParams();
  const navigate = useNavigate();
  const socketRef = useSocket();
  
  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  
  const makingOfferRef = useRef({});
  const ignoreOfferRef = useRef({});
  
  const [name, setName] = useState("");
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [mainVideo, setMainVideo] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const [hostId, setHostId] = useState(null);
  const pendingCandidatesRef = useRef({}); // ✅ add this with other refs
  const [myAuthId, setMyAuthId] = useState(null);
  const isHost = myAuthId !== null && hostId !== null && myAuthId?.toString() === hostId?.toString();
  // ── Presence tracking for InvitePanel ──────────────────────────────────────
  const [onlineUserIds, setOnlineUserIds]       = useState(new Set());
  const [inMeetingAuthIds, setInMeetingAuthIds] = useState(new Set());
  // useEffect(() => {
  //   const storedUser = localStorage.getItem("user");
  //   if (!storedUser) return navigate(`/join/${roomId}`);

  //   const userName = JSON.parse(storedUser).name;
  //   setName(userName);

  //   navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  //     .then(stream => {
  //           console.log("then");

  //       localStreamRef.current = stream;
  //       setMainVideo(stream);
  //        socketRef.current?.emit("audio-toggle", { roomId, muted: false });
  //   socketRef.current?.emit("video-toggle", { roomId, videoOff: false });
  //   setIsMicMuted(false)
  //   setIsCamMuted(false)
  //       setupAndJoin(userName,false);
  //     })
  //     .catch(async () => {
  //       try {            console.log("try");

  //         const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
  //         localStreamRef.current = audioOnly;
  //                       socketRef.current?.emit("audio-toggle", { roomId, muted: false });
  //   socketRef.current?.emit("video-toggle", { roomId, videoOff: true });
  //   setIsMicMuted(false)
  //   setIsCamMuted(false)

  //         setupAndJoin(userName,false);
  //       } catch {
  //          console.log("catch");
  //             socketRef.current?.emit("audio-toggle", { roomId, muted: true });
  //   socketRef.current?.emit("video-toggle", { roomId, videoOff:true});
  //   setIsMicMuted(true)
  //   setIsCamMuted(true)

  //         setupAndJoin(userName,true);
  //       }
  //     });

  //   return cleanup;
  // }, []);

useEffect(() => {
  const token = localStorage.getItem("token");
  const guestRaw = localStorage.getItem("guest");

  // ── GUEST PATH ────────────────────────────────────────────────────────────
  // Guest was approved by the host in GuestLogin and navigated here directly.
  // Skip all auth API calls (they require a Bearer token) and use the identity
  // stored in localStorage by GuestLogin.js.
  if (!token && guestRaw) {
    let guest;
    try { guest = JSON.parse(guestRaw); } catch { guest = null; }

    // Validate: guest must have been approved for THIS room
    if (!guest || guest.roomId !== roomId) {
      localStorage.removeItem("guest");
      return navigate(`/guest-login?roomId=${roomId}`);
    }

    const guestName = guest.name;
    setName(guestName);
    // Guests have no authId — use a placeholder so host controls still work
    setMyAuthId(null);

    async function initGuestRoom() {
      // Get media (best-effort: video+audio → audio only → nothing)
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
          micMuted = true;
          camMuted = true;
        }
      }

      localStreamRef.current = stream;
      setMainVideo(stream);
      setIsMicMuted(micMuted);
      setIsCamMuted(camMuted);

      // Wait for socket to be connected before emitting
      const waitForSocket = () => new Promise((resolve, reject) => {
        const s = socketRef.current;
        if (s && s.connected) { resolve(s); return; }
        if (s) {
          const timer = setTimeout(() => reject(new Error("timeout")), 6000);
          s.once("connect", () => { clearTimeout(timer); resolve(s); });
          return;
        }
        let attempts = 0;
        const poll = setInterval(() => {
          attempts++;
          const sock = socketRef.current;
          if (sock && sock.connected) { clearInterval(poll); resolve(sock); }
          else if (attempts > 60) { clearInterval(poll); reject(new Error("no socket")); }
        }, 100);
      });

      try {
        await waitForSocket();
      } catch {
        console.error("[Guest] Socket not available — redirecting");
        return navigate(`/guest-login?roomId=${roomId}`);
      }

      socketRef.current?.emit("audio-toggle", { roomId, muted: micMuted });
      socketRef.current?.emit("video-toggle", { roomId, videoOff: camMuted });

      // Emit join-room with isGuest:true so server puts guest through
      // the correct approval logic (already approved at this point)
      setupAndJoin(guestName, micMuted, true);
    }

    initGuestRoom();
    return cleanup;
  }

  // ── UNAUTHENTICATED (no token, no guest) → redirect ───────────────────────
  if (!token) return navigate(`/join/${roomId}`);

  // ── LOGGED-IN USER PATH ───────────────────────────────────────────────────
  async function initRoom() {
    try {
      // ── 1. Auth ──────────────────────────────────────────
      const authRes = await fetch(`${SIGNALING_SERVER}/autosignin`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const authData = await authRes.json();
      if (!authData.success) return navigate(`/join/${roomId}`);

      const userName = authData.user.name;
      setName(userName);
      setMyAuthId(authData.user.id);

      // ── 2. Meeting state (mic/cam from DB) ───────────────
      const meetingRes = await fetch(`${SIGNALING_SERVER}/meeting-state/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const meetingData = await meetingRes.json();

      const wantMic = meetingData?.participant?.micOn ?? true;
      const wantCam = meetingData?.participant?.camOn ?? true;

      // ── 3. Get media based on backend state ──────────────
      let stream = null;
      let micMuted = !wantMic;
      let camMuted = !wantCam;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: wantCam,
          audio: wantMic
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          camMuted = true;
        } catch {
          micMuted = true;
          camMuted = true;
        }
      }

      localStreamRef.current = stream;
      setMainVideo(stream);
      setIsMicMuted(micMuted);
      setIsCamMuted(camMuted);

      socketRef.current?.emit("audio-toggle", { roomId, muted: micMuted });
      socketRef.current?.emit("video-toggle", { roomId, videoOff: camMuted });

      // ── 4. Join room ──────────────────────────────────────
      setupAndJoin(userName, micMuted, false);

    } catch (err) {
      console.error("Room init failed:", err);
      navigate(`/join/${roomId}`);
    }
  }

  initRoom();
  return cleanup;
}, []);

// Add this effect alongside the other useEffects:
useEffect(() => {
  if (isHost && waitingRoom.length > 0 && activePanel !== 'waiting') {
    setActivePanel('waiting');
  }
}, [waitingRoom.length, isHost]);

// ── Track online presence so InvitePanel always sees live data ─────────────
useEffect(() => {
  const socket = socketRef.current;
  if (!socket) return;

  const onList    = (users) => setOnlineUserIds(new Set(users.map(u => u.id)));
  const onOnline  = ({ userId }) => setOnlineUserIds(prev => new Set([...prev, userId]));
  const onOffline = ({ userId }) => setOnlineUserIds(prev => {
    const n = new Set(prev); n.delete(userId); return n;
  });
  const onJoined  = (u) => setInMeetingAuthIds(prev =>
    new Set([...prev, u.authId?.toString() || ''])
  );

  socket.on('users:list',  onList);
  socket.on('user:online',  onOnline);
  socket.on('user:offline', onOffline);
  socket.on('user-joined',  onJoined);

  return () => {
    socket.off('users:list',  onList);
    socket.off('user:online',  onOnline);
    socket.off('user:offline', onOffline);
    socket.off('user-joined',  onJoined);
  };
}, [socketRef.current]);


  function cleanup() {
    const socket = socketRef.current;
    if (!socket) return;

    socket.off("all-users");
    socket.off("user-joined");
    socket.off("signal");
    socket.off("user-left");
    socket.off("reaction");
    socket.off('waiting-room-update');
socket.off('screen-share-started');
socket.off('screen-share-stopped');
socket.off('audio-toggle');
socket.off('reaction');

    Object.values(peersRef.current).forEach(peer => peer.close());
    localStreamRef.current?.getTracks().forEach(t => t.stop());
      pendingCandidatesRef.current = {}; // ✅ clear all queues

    screenStreamRef.current?.getTracks().forEach(t => t.stop());
  }

  function setupAndJoin(userName, micMuted, isGuest = false) {

    const socket = socketRef.current;
    if (!socket) return;

    // At the TOP of setupAndJoin, before the .on calls:
socket.off('waiting-room-update');
socket.off('user-left');
socket.off('screen-share-started');
socket.off('screen-share-stopped');
socket.off('audio-toggle');
socket.off('reaction');

// Then register them below as before

    // isGuest:true tells the server to use the already-approved guest path
    // (server's admitUserToRoom was already called when host admitted them)
    socket.emit("join-room", { roomId, name: userName, muted: micMuted, isGuest });

socket.on('all-users', ({ users, host, waitingRoom: wr }) => {
  setHostId(host?.toString());
  setWaitingRoom(wr || []);
  users.forEach(u => {
    if (u.userId !== socket.id) createPeer(u.userId, u.name, u.muted, u.authId?.toString());
  });
});

    socket.on("user-joined", u =>{

      console.log("userJoined",u)
      createPeer(u.userId, u.name,u.muted,u.authId)
    }
    
    );

    // socket.on("signal", async ({ from, signal }) => {
    //   const peer = peersRef.current[from];
    //   if (!peer) return;

    //   try {
    //     if (signal.type) {
    //       const collision =
    //         signal.type === "offer" &&
    //         (makingOfferRef.current[from] || peer.signalingState !== "stable");

    //       const polite = socket.id > from;
    //       ignoreOfferRef.current[from] = !polite && collision;
    //       if (ignoreOfferRef.current[from]) return;

    //       await peer.setRemoteDescription(signal);

    //       if (signal.type === "offer") {
    //         await peer.setLocalDescription(await peer.createAnswer());
    //         socket.emit("signal", { to: from, signal: peer.localDescription });
    //       }

    //     } else if (signal.candidate) {
    //       await peer.addIceCandidate(signal);
    //     }
    //   } catch (err) {
    //     console.error("Signal error:", err);
    //   }
    // });

    socket.on("signal", async ({ from, signal }) => {
  let peer = peersRef.current[from];

  // ✅ No peer yet — queue everything
  if (!peer) {
    if (!pendingCandidatesRef.current[from]) {
      pendingCandidatesRef.current[from] = [];
    }
    pendingCandidatesRef.current[from].push(signal);
    return;
  }

  try {
    if (signal.type === "offer" || signal.type === "answer") {
      const collision =
        signal.type === "offer" &&
        (makingOfferRef.current[from] || peer.signalingState !== "stable");

      const polite = socket.id > from;
      ignoreOfferRef.current[from] = !polite && collision;
      if (ignoreOfferRef.current[from]) return;

      await peer.setRemoteDescription(new RTCSessionDescription(signal));

      // ✅ Flush queued candidates after remote desc is set
      const queued = pendingCandidatesRef.current[from] || [];
      for (const q of queued) {
        try {
          if (q.candidate !== undefined) {
            await peer.addIceCandidate(new RTCIceCandidate(q));
          }
        } catch (e) {
          console.warn("Flushing queued candidate failed:", e);
        }
      }
      pendingCandidatesRef.current[from] = [];

      if (signal.type === "offer") {
        await peer.setLocalDescription(await peer.createAnswer());
        socket.emit("signal", { to: from, signal: peer.localDescription });
      }

    } else if (signal.candidate !== undefined) {
      // ✅ Queue if remote desc not ready yet
      if (!peer.remoteDescription?.type) {
        if (!pendingCandidatesRef.current[from]) {
          pendingCandidatesRef.current[from] = [];
        }
        pendingCandidatesRef.current[from].push(signal);
      } else {
        await peer.addIceCandidate(new RTCIceCandidate(signal));
      }
    }

  } catch (err) {
    // ✅ Last resort — re-queue instead of crashing
    if (err.name === "InvalidStateError") {
      if (!pendingCandidatesRef.current[from]) {
        pendingCandidatesRef.current[from] = [];
      }
      pendingCandidatesRef.current[from].push(signal);
    } else {
      console.error("Signal error:", err);
    }
  }
});

    socket.on("audio-toggle", ({ userId, muted }) => {
      
          // console.log("audio-toggle==>",muted)

  setRemoteUsers(prev =>
    prev.map(user =>
      user.userId === userId
        ? { ...user, muted }
        : user
    )
  );
});

socket.on("reaction", ({ userId, emoji }) => {
  console.log("emoji ==>",emoji)
  setRemoteUsers(prev =>
    prev.map(user =>
      user.userId === userId
        ? { ...user, reaction: emoji }
        : user
    )
  );

  // remove after 3 seconds
  setTimeout(() => {
    setRemoteUsers(prev =>
      prev.map(user =>
        user.userId === userId
          ? { ...user, reaction: null }
          : user
      )
    );
  },4000);
});

// In setupAndJoin, listen for waiting room updates:
socket.on('waiting-room-update', ({ waitingRoom: wr }) => {
  setWaitingRoom(wr || []);
});

    socket.on("user-left", id => {
      peersRef.current[id]?.close();
      delete peersRef.current[id];
      delete pendingCandidatesRef.current[id];
      setRemoteUsers(prev => prev.filter(u => u.userId !== id));
    });

    // ✅ Track remote screen share state
    socket.on("screen-share-started", ({ userId }) => {
      setRemoteUsers(prev =>
        prev.map(u => u.userId === userId ? { ...u, isScreenSharing: true } : u)
      );
    });

    socket.on("screen-share-stopped", ({ userId }) => {
      setRemoteUsers(prev =>
        prev.map(u => u.userId === userId ? { ...u, isScreenSharing: false } : u)
      );
    });




// Then register them below as before
  }

function createPeer(userId, userName,micMuted,authId) {
  if (peersRef.current[userId]) return;

  const peer = new RTCPeerConnection(ICE_SERVERS);
  peersRef.current[userId] = peer;

  setRemoteUsers(prev => {
    if (prev.find(u => u.userId === userId)) return prev;
    console.log("prev ====>",prev)
    return [...prev, { userId, name: userName, stream: null ,muted:micMuted,authId}];
  });

  // Add audio
  const audioTrack = localStreamRef.current?.getAudioTracks()[0];
  if (audioTrack) {
    peer.addTrack(audioTrack, localStreamRef.current);
  }

  // Add video (camera initially)
  // const camTrack = localStreamRef.current?.getVideoTracks()[0];
  // if (camTrack) {
  //   peer.addTrack(camTrack, localStreamRef.current);
  // }

  // Add video track correctly (camera OR screen)

if (screenStreamRef.current) {
  const screenTrack = screenStreamRef.current.getVideoTracks()[0];
  if (screenTrack) {
    peer.addTrack(screenTrack, screenStreamRef.current);
  }
} else {
  const camTrack = localStreamRef.current?.getVideoTracks()[0];
  if (camTrack) {
    peer.addTrack(camTrack, localStreamRef.current);
  }
}

  peer.onicecandidate = e => {
    if (e.candidate) {
      socketRef.current.emit("signal", { to: userId, signal: e.candidate });
    }
  };

  // peer.ontrack = e => {
  //   console.log("REMOTE STREAM RECEIVED");

  //   const stream = e.streams[0];

  // e.track.onended = () => {
  //   setRemoteUsers(prev =>
  //     prev.map(u =>
  //       u.userId === userId
  //         ? { ...u, stream: null }
  //         : u
  //     )
  //   );
  // };

  //  const assignStream = () => {
  //   setRemoteUsers(prev =>
  //     prev.map(u => u.userId === userId ? { ...u, stream } : u)
  //   );
  // };

  // if (stream.getTracks().some(t => t.readyState === "live")) {
  //   assignStream();
  // } else {
  //   // ✅ Retry after short delay for Safari
  //   setTimeout(assignStream, 500);
  // }

  // setRemoteUsers(prev =>
  //   prev.map(u =>
  //     u.userId === userId
  //       ? { ...u, stream }
  //       : u
  //   )
  // );


  //   // setRemoteUsers(prev =>
  //   //   prev.map(u =>
  //   //     u.userId === userId ? { ...u, stream: e.streams[0] } : u
  //   //   )
  //   // );
  // };
peer.ontrack = e => {
  console.log("REMOTE STREAM RECEIVED", e.track.kind, e.streams.length);

  // ✅ Safari sometimes fires with empty streams[] — build manually
  const stream = e.streams?.[0] ?? new MediaStream([e.track]);

  e.track.onended = () => {
    setRemoteUsers(prev =>
      prev.map(u => u.userId === userId ? { ...u, stream: null } : u)
    );
  };

  // ✅ Single assignment only — no duplicate below
  setRemoteUsers(prev =>
    prev.map(u => u.userId === userId ? { ...u, stream } : u)
  );
};
  peer.onnegotiationneeded = async () => {
    try {
      makingOfferRef.current[userId] = true;
      await peer.setLocalDescription(await peer.createOffer());
      socketRef.current.emit("signal", { to: userId, signal: peer.localDescription });
    } finally {
      makingOfferRef.current[userId] = false;
    }
  };

  // In createPeer, add this:
peer.oniceconnectionstatechange = () => {
  console.log(`ICE state [${userId}]:`, peer.iceConnectionState);
};

peer.onconnectionstatechange = () => {
  console.log(`Connection state [${userId}]:`, peer.connectionState);
};

  // ✅ FORCE SCREEN TRACK IF SHARING IS ACTIVE
  // setTimeout(() => {
  //   if (screenStreamRef.current) {
  //     const screenTrack = screenStreamRef.current.getVideoTracks()[0];
  //     const sender = peer.getSenders().find(s => s.track?.kind === "video");

  //     if (sender && screenTrack) {
  //       console.log("FORCING SCREEN TRACK TO NEW USER");
  //       sender.replaceTrack(screenTrack);
  //     }
  //   }
  // }, 500);
}

function toggleMic(mic){
  setIsMicMuted(mic);
}

function toggleCam(cam){
  setIsCamMuted(cam);
}


  return (
    <section className="meetingSc">
      <div className="container">
        <div className="row">

          {/* <div className="col-lg-8 col-xl-8 col-xxl-9"> */}
            {/* <VideoCard
              video={mainVideo}
              name={name}
            
              isSharing={isSharing}
            
            /> */}
{/* <div> */}
            {/* <SubPrimeVideoCard userList={[ { userId:socketRef.current?.id,
          name,
          stream:mainVideo,
          muted:true},...remoteUsers]} /> */}

          <div className={activePanel ? "col-lg-8 col-xl-8 col-xxl-9" : "col-12"}
  style={{ transition: "all 0.35s ease", height: "calc(100vh - 130px)" }}>
  <SubPrimeVideoCard
    userList={[
      {
        userId: socketRef.current?.id,
        name,
        stream: localStreamRef.current,
        screenStream: isSharing ? mainVideo : null,
        isScreenSharing: isSharing,
        muted: isMicMuted,
        authId: myAuthId
      },
      ...remoteUsers
    ]}
    activePanel={activePanel}

    hostId={hostId}  
  localUserId={socketRef.current?.id}
  myAuthId={myAuthId} 
  />
{/* </div> */}
          </div>
{/* 
          <div className="col-lg-4 col-xl-4 col-xxl-3">
            <ChatCard />
       
          </div> */}


{activePanel && (
  <div className="col-lg-4 col-xl-4 col-xxl-3"
    style={{ height: "calc(100vh - 130px)", animation: "slideInRight 0.35s ease" }}>

    {/* Chat */}
    {activePanel === "chat" && (
      <ChatCard
  userList={remoteUsers}
  onToggleChat={() => setActivePanel(p => p === "chat" ? null : "chat")}
  hostId={hostId}/>
    )}

    {/* Participants */}
    {activePanel === "participants" && (
      <Participants count={remoteUsers.length + 1} />
    )}

    {/* Invite People */}
    {activePanel === "invite" && (
      <InvitePanel
        socketRef={socketRef}
        roomId={roomId}
        onClose={() => setActivePanel(null)}
        onlineUserIds={onlineUserIds}
        inMeetingAuthIds={inMeetingAuthIds}
      />
    )}

    {/* Waiting Room */}
    {activePanel === "waiting" && isHost &&(
      <div style={{
        height: "100%", display: "flex", flexDirection: "column",
        background: "#111118", borderLeft: "1px solid rgba(255,255,255,0.08)",
        fontFamily: "Montserrat, sans-serif"
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(245,158,11,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18
            }}>⏳</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>Waiting Room</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{waitingRoom.length} waiting</div>
            </div>
          </div>
          <button onClick={() => setActivePanel(null)} style={{
            background: "rgba(255,255,255,0.06)", border: "none", color: "#94a3b8",
            width: 28, height: 28, borderRadius: "50%", cursor: "pointer", fontSize: 16,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>×</button>
        </div>

        {/* Admit All / Deny All */}
        {waitingRoom.length > 1 && (
          <div style={{
            padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex", gap: 8
          }}>
            <button
              onClick={() => waitingRoom.forEach(u => socketRef.current?.emit('admit-user', { roomId, userId: u.userId }))}
              style={{
                flex: 1, padding: "8px", borderRadius: 8,
                border: "1px solid rgba(34,197,94,0.3)",
                background: "rgba(34,197,94,0.1)", color: "#22c55e",
                fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Montserrat, sans-serif"
              }}>✅ Admit All</button>
            <button
              onClick={() => waitingRoom.forEach(u => socketRef.current?.emit('reject-user', { roomId, userId: u.userId }))}
              style={{
                flex: 1, padding: "8px", borderRadius: 8,
                border: "1px solid rgba(239,68,68,0.3)",
                background: "rgba(239,68,68,0.1)", color: "#ef4444",
                fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Montserrat, sans-serif"
              }}>❌ Deny All</button>
          </div>
        )}

        {/* User list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {waitingRoom.length === 0 ? (
            <div style={{ textAlign: "center", marginTop: 60 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🚪</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>No one is waiting</div>
            </div>
          ) : waitingRoom.map((u, i) => {
            const colors = ["#6366f1","#06b6d4","#8b5cf6","#f59e0b","#ec4899","#10b981"];
            const bg = colors[u.name?.charCodeAt(0) % colors.length];
            const initials = u.name?.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase() || "?";
            return (
              <div key={u.userId} style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12, padding: "12px 14px",
                animation: `fadeInUp 0.3s ease ${i * 0.05}s both`
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: "50%", background: bg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0
                  }}>{initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", animation: "pulse 1.5s infinite" }} />
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>Waiting for approval</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => socketRef.current?.emit('admit-user', { roomId, userId: u.userId })}
                    style={{
                      flex: 1, padding: "8px 0", borderRadius: 8,
                      border: "1px solid rgba(34,197,94,0.4)",
                      background: "rgba(34,197,94,0.12)", color: "#22c55e",
                      fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Montserrat, sans-serif",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 5
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(34,197,94,0.22)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(34,197,94,0.12)"}
                  >✓ Admit</button>
                  <button
                    onClick={() => socketRef.current?.emit('reject-user', { roomId, userId: u.userId })}
                    style={{
                      flex: 1, padding: "8px 0", borderRadius: 8,
                      border: "1px solid rgba(239,68,68,0.3)",
                      background: "rgba(239,68,68,0.08)", color: "#ef4444",
                      fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Montserrat, sans-serif",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 5
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.18)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
                  >✕ Deny</button>
                </div>
              </div>
            );
          })}
        </div>

        <style>{`
          @keyframes fadeInUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        `}</style>
      </div>
    )}

  </div>
)}
        </div>

        <div className="row">
            <div className="col-lg-12">
              <div className="bottomControllers">
              <Participants count={remoteUsers.length+1}/>
              <NavigationControl
              
isMicMuted={isMicMuted}
isCamMuted={isCamMuted}

           toggleMic={toggleMic}
           toggleCam={toggleCam}
              peersRef={peersRef}
              localStreamRef={localStreamRef}
              screenStreamRef={screenStreamRef}
              setMainVideo={setMainVideo}
              isSharing={isSharing}
              setIsSharing={setIsSharing}
              socketRef={socketRef}
              roomId={roomId}
 isHost={isHost}
              activePanel={activePanel}
  onToggleChat={() => setActivePanel(p => p === "chat" ? null : "chat")}
  onToggleParticipants={() => setActivePanel(p => p === "participants" ? null : "participants")}
waitingCount={isHost ? waitingRoom.length : 0}
  onToggleWaiting={() => setActivePanel(p => p === 'waiting' ? null : 'waiting')}
  onToggleInvite={() => setActivePanel(p => p === 'invite' ? null : 'invite')}
              />
              <LinkSharingCard /> 
              </div>
            </div>
        </div>
      </div>
    </section>
  );
};

export default MeetingSection;