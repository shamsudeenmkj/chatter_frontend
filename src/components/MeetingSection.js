import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import VideoCard from "./videoCard";
import SubPrimeVideoCard from "./SubPrimeVideoCard";
import { useSocket } from "../sockets/socket";

const MeetingSection = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const socketRef = useSocket();

  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const makingOfferRef = useRef({});
  const ignoreOfferRef = useRef({});

  // Fix stale closures using a Ref + State sync
  const isSharingRef = useRef(false);
  const [isSharing, _setIsSharing] = useState(false);
  const setIsSharing = (val) => {
    isSharingRef.current = val;
    _setIsSharing(val);
  };

  const [name, setName] = useState("");
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [mainVideo, setMainVideo] = useState(null);

  const createPeer = useCallback((userId, userName) => {
    if (peersRef.current[userId]) return;

    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }] 
    });
    peersRef.current[userId] = peer;

    setRemoteUsers(prev => {
      if (prev.find(u => u.userId === userId)) return prev;
      return [...prev, { userId, name: userName, stream: null }];
    });

    // Send the correct active track (Screen or Camera)
    const activeStream = screenStreamRef.current || localStreamRef.current;
    if (activeStream) {
      activeStream.getTracks().forEach(track => peer.addTrack(track, activeStream));
    }

    peer.onicecandidate = e => {
      if (e.candidate) socketRef.current.emit("signal", { to: userId, signal: e.candidate });
    };

    peer.ontrack = e => {
      setRemoteUsers(prev => prev.map(u => 
        u.userId === userId ? { ...u, stream: e.streams[0] } : u
      ));
    };

    peer.onnegotiationneeded = async () => {
      try {
        makingOfferRef.current[userId] = true;
        await peer.setLocalDescription(); // In modern browsers, this auto-generates offer
        socketRef.current.emit("signal", { to: userId, signal: peer.localDescription });
      } catch (err) { console.error(err); } 
      finally { makingOfferRef.current[userId] = false; }
    };

    return peer;
  }, []);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return navigate(`/login/${roomId}`);
    setName(user.name);

    const startApp = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        setMainVideo(stream);
        
        const socket = socketRef.current;
        socket.emit("join-room", { roomId, name: user.name });

        socket.on("all-users", users => {
          users.forEach(u => u.userId !== socket.id && createPeer(u.userId, u.name));
        });

        socket.on("user-joined", u => createPeer(u.userId, u.name));

        socket.on("signal", async ({ from, signal }) => {
          const peer = peersRef.current[from];
          if (!peer) return;
          try {
            if (signal.type) {
              const offerCollision = signal.type === "offer" && (makingOfferRef.current[from] || peer.signalingState !== "stable");
              const isPolite = socket.id > from; // Simple tie-breaker
              ignoreOfferRef.current[from] = !isPolite && offerCollision;
              
              if (ignoreOfferRef.current[from]) return;

              await peer.setRemoteDescription(signal);
              if (signal.type === "offer") {
                await peer.setLocalDescription();
                socket.emit("signal", { to: from, signal: peer.localDescription });
              }
            } else if (signal.candidate) {
              await peer.addIceCandidate(signal);
            }
          } catch (err) { console.error(err); }
        });

        socket.on("user-left", id => {
          peersRef.current[id]?.close();
          delete peersRef.current[id];
          setRemoteUsers(prev => prev.filter(u => u.userId !== id));
        });
      } catch (err) { console.error("Media access denied", err); }
    };

    startApp();

    return () => {
      socketRef.current?.off("all-users");
      socketRef.current?.off("user-joined");
      socketRef.current?.off("signal");
      socketRef.current?.off("user-left");
      Object.values(peersRef.current).forEach(p => p.close());
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [roomId, navigate, createPeer, socketRef]);

  return (
    <section className="meetingSc">
      <VideoCard 
        video={mainVideo} name={name} peersRef={peersRef} 
        localStreamRef={localStreamRef} screenStreamRef={screenStreamRef}
        setMainVideo={setMainVideo} isSharing={isSharing} setIsSharing={setIsSharing}
        socketRef={socketRef} roomId={roomId}
      />
      <SubPrimeVideoCard userList={remoteUsers} />
    </section>
  );
};

export default MeetingSection;