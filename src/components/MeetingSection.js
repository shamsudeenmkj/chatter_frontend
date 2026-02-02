import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import VideoCard from "./videoCard";
import ChatCard from "./ChatCard";
import SubPrimeVideoCard from "./SubPrimeVideoCard";
import LinkSharingCard from "./LinkSharingCard";
import { useSocket } from "../sockets/socket";

// ⚠️ Use these updated servers to bypass firewall blocks
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { 
      urls: "turn:openrelay.metered.ca:80", 
      username: "openrelayproject", 
      credential: "openrelayproject" 
    },
    { 
      // This is the most reliable port for different networks
      urls: "turn:openrelay.metered.ca:443?transport=tcp", 
      username: "openrelayproject", 
      credential: "openrelayproject" 
    }
  ],
  iceCandidatePoolSize: 10
};

const MeetingSection = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const socketRef = useSocket();

  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  
  // Track handshake state for "Perfect Negotiation"
  const makingOfferRef = useRef({}); 
  const ignoreOfferRef = useRef({});

  const [name, setName] = useState("");
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [mainVideo, setMainVideo] = useState(null);
  const [mutedList, setMutedList] = useState([]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      navigate(`/login/${roomId}`);
      return;
    }

    const userName = JSON.parse(storedUser).name;
    setName(userName);

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        localStreamRef.current = stream;
        setMainVideo(stream);
        setupAndJoin(stream, userName);
      })
      .catch(() => setupAndJoin(null, userName));

    return cleanup;
  }, []);

  function cleanup() {
    const socket = socketRef.current;
    if (socket) {
      socket.off("all-users");
      socket.off("user-joined");
      socket.off("signal");
      socket.off("user-left");
    }
    Object.values(peersRef.current).forEach(peer => peer.close());
    peersRef.current = {};
    localStreamRef.current?.getTracks().forEach(t => t.stop());
  }

  function setupAndJoin(stream, userName) {
    const socket = socketRef.current;
    if (!socket) return;

    socket.emit("join-room", {
      roomId,
      name: userName,
      hasVideo: !!stream?.getVideoTracks().length,
      hasAudio: !!stream?.getAudioTracks().length
    });

    socket.on("all-users", users => {
      users.forEach(u => {
        if (u.userId === socket.id) return;
        createPeer(u.userId, u.name);
      });
    });

    socket.on("user-joined", u => {
      createPeer(u.userId, u.name);
    });

    socket.on("signal", async ({ from, signal }) => {
      const peer = peersRef.current[from];
      if (!peer) return;

      try {
        if (signal.type) {
          // PERFECT NEGOTIATION: Handle collisions
          const offerCollision = signal.type === "offer" && 
            (makingOfferRef.current[from] || peer.signalingState !== "stable");
          
          // Use socket.id to decide who "backs down" (Polite Peer pattern)
          const isPolite = socket.id > from;
          ignoreOfferRef.current[from] = !isPolite && offerCollision;

          if (ignoreOfferRef.current[from]) return;

          await peer.setRemoteDescription(new RTCSessionDescription(signal));
          if (signal.type === "offer") {
            await peer.setLocalDescription();
            socket.emit("signal", { to: from, signal: peer.localDescription });
          }
        } else if (signal.candidate) {
          await peer.addIceCandidate(new RTCIceCandidate(signal));
        }
      } catch (err) {
        console.error("Signal Handling Error:", err);
      }
    });

    socket.on("user-left", id => {
      peersRef.current[id]?.close();
      delete peersRef.current[id];
      setRemoteUsers(prev => prev.filter(u => u.userId !== id));
    });
  }

  const createPeer = (userId, userName) => {
    if (peersRef.current[userId]) return;

    const peer = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[userId] = peer;
    
    setRemoteUsers(prev => [...prev, { userId, name: userName, stream: null }]);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peer.addTrack(track, localStreamRef.current);
      });
    }

    peer.onicecandidate = e => {
      if (e.candidate) {
        socketRef.current.emit("signal", { to: userId, signal: e.candidate });
      }
    };

    peer.ontrack = event => {
      const remoteStream = event.streams[0];
      setRemoteUsers(prev => prev.map(u => 
        u.userId === userId ? { ...u, stream: remoteStream } : u
      ));
    };

    // Auto-Restart ICE if connection fails
    peer.oniceconnectionstatechange = () => {
      if (peer.iceConnectionState === "failed") {
        peer.restartIce();
      }
    };

    peer.onnegotiationneeded = async () => {
      try {
        makingOfferRef.current[userId] = true;
        await peer.setLocalDescription();
        socketRef.current.emit("signal", { to: userId, signal: peer.localDescription });
      } catch (err) {
        console.error("Negotiation Error:", err);
      } finally {
        makingOfferRef.current[userId] = false;
      }
    };

    return peer;
  };

  return (
    <section className="meetingSc">
      <div className="container">
        <div className="row">
          <div className="col-xl-9">
            <VideoCard video={mainVideo} name={name} roomId={roomId} socketRef={socketRef} />
            <SubPrimeVideoCard userList={remoteUsers} mutedList={mutedList} />
          </div>
          <div className="col-xl-3">
            <ChatCard />
            <LinkSharingCard />
          </div>
        </div>
      </div>
    </section>
  );
};

export default MeetingSection;