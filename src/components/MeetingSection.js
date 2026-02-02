import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import VideoCard from "./videoCard";
import ChatCard from "./ChatCard";
import SubPrimeVideoCard from "./SubPrimeVideoCard";
import LinkSharingCard from "./LinkSharingCard";
import { useSocket } from "../sockets/socket";

// ⚠️ Final ExpressTURN Configuration
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:free.expressturn.com:3478" },
    { 
      urls: "turn:free.expressturn.com:3478?transport=udp", 
      username: "000000002085384559", 
      credential: "oQIy00pPRpYEeWLCpFbtjbNntj4=" 
    },
    { 
      urls: "turn:free.expressturn.com:3478?transport=tcp", 
      username: "000000002085384559", 
      credential: "oQIy00pPRpYEeWLCpFbtjbNntj4=" 
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
  const screenStreamRef = useRef(null);
  
  const makingOfferRef = useRef({});
  const ignoreOfferRef = useRef({});

  const [name, setName] = useState("");
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [mainVideo, setMainVideo] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const [mutedList, setMutedList] = useState([]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      navigate(`/login/${roomId}`);
      return;
    }
    const userName = JSON.parse(storedUser).name;
    setName(userName);

    // Initial Media Access with No-Camera Fallback
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        localStreamRef.current = stream;
        setMainVideo(stream);
        setupAndJoin(stream, userName);
      })
      .catch(() => {
        // Fallback for users with no camera
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(audioStream => {
            localStreamRef.current = audioStream;
            setupAndJoin(audioStream, userName);
          })
          .catch(() => setupAndJoin(null, userName));
      });

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
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
  }

  function setupAndJoin(stream, userName) {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("join-room", { roomId, name: userName });

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
      } catch (err) { console.error("Signaling Error:", err); }
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

    // --- SYNC NEW JOINERS ---
    let videoTrack;
    if (isSharing && screenStreamRef.current) {
        videoTrack = screenStreamRef.current.getVideoTracks()[0];
    } else if (localStreamRef.current) {
        videoTrack = localStreamRef.current.getVideoTracks()[0];
    }

    if (videoTrack) {
        peer.addTrack(videoTrack, isSharing ? screenStreamRef.current : localStreamRef.current);
    }
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) peer.addTrack(audioTrack, localStreamRef.current);

    peer.onicecandidate = e => {
      if (e.candidate) socketRef.current.emit("signal", { to: userId, signal: e.candidate });
    };

    peer.ontrack = e => {
      setRemoteUsers(prev => prev.map(u => u.userId === userId ? { ...u, stream: e.streams[0] } : u));
    };

    peer.oniceconnectionstatechange = () => {
      if (peer.iceConnectionState === "failed") peer.restartIce();
    };

    peer.onnegotiationneeded = async () => {
      try {
        makingOfferRef.current[userId] = true;
        await peer.setLocalDescription();
        socketRef.current.emit("signal", { to: userId, signal: peer.localDescription });
      } catch (err) { console.error(err); } finally { makingOfferRef.current[userId] = false; }
    };
    return peer;
  };

  return (
    <section className="meetingSc">
        <div className="container">
            <div className="row">
                <div className="col-xl-9">
                    <VideoCard 
                        video={mainVideo} 
                        name={name} 
                        peersRef={peersRef} 
                        localStreamRef={localStreamRef}
                        screenStreamRef={screenStreamRef}
                        setMainVideo={setMainVideo}
                        isSharing={isSharing}
                        setIsSharing={setIsSharing}
                        socketRef={socketRef}
                        roomId={roomId}
                    />
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