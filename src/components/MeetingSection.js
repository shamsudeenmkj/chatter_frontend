import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import VideoCard from "./videoCard";
import ChatCard from "./ChatCard";
import SubPrimeVideoCard from "./SubPrimeVideoCard";
import LinkSharingCard from "./LinkSharingCard";
import { useSocket } from "../sockets/socket";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { 
      urls: "turn:openrelay.metered.ca:80", 
      username: "openrelayproject", 
      credential: "openrelayproject" 
    },
    { 
      urls: "turn:openrelay.metered.ca:443", 
      username: "openrelayproject", 
      credential: "openrelayproject" 
    },
    { 
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
  
  // Track negotiation state to prevent collisions
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
        initiatePeer(u.userId, u.name, true);
      });
    });

    socket.on("user-joined", u => {
      initiatePeer(u.userId, u.name, false);
    });

    socket.on("signal", async ({ from, signal }) => {
      const peer = peersRef.current[from];
      if (!peer) return;

      try {
        const description = signal.type ? new RTCSessionDescription(signal) : null;
        const candidate = signal.candidate ? new RTCIceCandidate(signal) : null;

        if (description) {
          // Perfect Negotiation: Handle Offer/Answer Collisions
          const readyForOffer = !makingOfferRef.current[from] && 
                               (peer.signalingState === "stable" || ignoreOfferRef.current[from]);
          
          const offerCollision = description.type === "offer" && !readyForOffer;

          // If current user's socket ID is "greater" than remote, they are POLITE
          const isPolite = socket.id > from;
          ignoreOfferRef.current[from] = !isPolite && offerCollision;

          if (ignoreOfferRef.current[from]) return;

          await peer.setRemoteDescription(description);
          if (description.type === "offer") {
            await peer.setLocalDescription();
            socket.emit("signal", { to: from, signal: peer.localDescription });
          }
        } else if (candidate) {
          try {
            await peer.addIceCandidate(candidate);
          } catch (err) {
            if (!ignoreOfferRef.current[from]) throw err;
          }
        }
      } catch (err) {
        console.error("Signaling Error:", err);
      }
    });

    socket.on("user-left", id => {
      peersRef.current[id]?.close();
      delete peersRef.current[id];
      delete makingOfferRef.current[id];
      delete ignoreOfferRef.current[id];
      setRemoteUsers(prev => prev.filter(u => u.userId !== id));
    });
  }

  const initiatePeer = (userId, userName, isNewcomer) => {
    if (peersRef.current[userId]) return;

    const peer = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[userId] = peer;
    
    // Add to UI
    setRemoteUsers(prev => [...prev, { userId, name: userName, stream: null }]);

    // Add tracks immediately
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peer.addTrack(track, localStreamRef.current);
      });
    } else {
      peer.addTransceiver("video", { direction: "recvonly" });
      peer.addTransceiver("audio", { direction: "recvonly" });
    }

    peer.onicecandidate = e => {
      if (e.candidate) {
        socketRef.current.emit("signal", { to: userId, signal: e.candidate });
      }
    };

    peer.ontrack = event => {
      const stream = event.streams[0];
      setRemoteUsers(prev => prev.map(u => 
        u.userId === userId ? { ...u, stream } : u
      ));
    };

    // Perfect Negotiation Trigger
    peer.onnegotiationneeded = async () => {
      try {
        makingOfferRef.current[userId] = true;
        await peer.setLocalDescription();
        socketRef.current.emit("signal", { to: userId, signal: peer.localDescription });
      } catch (err) {
        console.error("Negotiation error:", err);
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