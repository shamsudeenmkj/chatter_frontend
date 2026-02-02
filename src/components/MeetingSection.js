
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import VideoCard from "./videoCard";
import ChatCard from "./ChatCard";
import SubPrimeVideoCard from "./SubPrimeVideoCard";
import LinkSharingCard from "./LinkSharingCard";
import { useSocket } from "../sockets/socket";

// ⚠️ Configuration for ExpressTURN (Bypasses firewalls at 15km)
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:relay.expressturn.com:3478" },
    { 
      urls: "turn:relay.expressturn.com:3478?transport=udp", 
      username: "000000002085384559", 
      credential: "oQIy00pPRpYEeWLCpFbtjbNntj4=" 
    },
    { 
      urls: "turn:relay.expressturn.com:443?transport=tcp", 
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
  
  // Handshake State Machine Refs (Crucial for 5-user stability)
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

    socket.emit("join-room", { roomId, name: userName });

    // Handle initial users
    socket.on("all-users", users => {
      users.forEach(u => u.userId !== socket.id && createPeer(u.userId, u.name));
    });

    // Handle new joiners
    socket.on("user-joined", u => createPeer(u.userId, u.name));

    // Handle Signaling (SDP & ICE)
    socket.on("signal", async ({ from, signal }) => {
      const peer = peersRef.current[from];
      if (!peer) return;

      try {
        if (signal.type) {
          // --- PERFECT NEGOTIATION COLLISION LOGIC ---
          const offerCollision = signal.type === "offer" && 
            (makingOfferRef.current[from] || peer.signalingState !== "stable");
          
          // Current user is POLITE if their socket ID is alphabetically higher
          const isPolite = socket.id > from;
          ignoreOfferRef.current[from] = !isPolite && offerCollision;

          if (ignoreOfferRef.current[from]) return;

          await peer.setRemoteDescription(new RTCSessionDescription(signal));
          if (signal.type === "offer") {
            await peer.setLocalDescription();
            socket.emit("signal", { to: from, signal: peer.localDescription });
          }
        } else if (signal.candidate) {
          try {
            await peer.addIceCandidate(new RTCIceCandidate(signal));
          } catch (err) {
            if (!ignoreOfferRef.current[from]) throw err;
          }
        }
      } catch (err) {
        console.error("WebRTC Signaling Error:", err);
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

    // Add local tracks BEFORE negotiation
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => 
        peer.addTrack(track, localStreamRef.current)
      );
    }

    peer.onicecandidate = e => {
      if (e.candidate) socketRef.current.emit("signal", { to: userId, signal: e.candidate });
    };

    peer.ontrack = e => {
      setRemoteUsers(prev => prev.map(u => 
        u.userId === userId ? { ...u, stream: e.streams[0] } : u
      ));
    };

    // --- LONG CONNECTION STABILITY (ICE Restart) ---
    peer.oniceconnectionstatechange = () => {
      if (peer.iceConnectionState === "failed") {
        console.warn(`Connection with ${userName} failed. Restarting ICE...`);
        peer.restartIce(); // Triggers onnegotiationneeded automatically
      }
    };

    // Negotiationneeded listener
    peer.onnegotiationneeded = async () => {
      try {
        makingOfferRef.current[userId] = true;
        await peer.setLocalDescription();
        socketRef.current.emit("signal", { to: userId, signal: peer.localDescription });
      } catch (err) {
        console.error(err);
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




// import React, { useEffect, useRef, useState } from "react";
// import { useNavigate, useParams } from "react-router-dom";
// import VideoCard from "./videoCard";
// import ChatCard from "./ChatCard";
// import SubPrimeVideoCard from "./SubPrimeVideoCard";
// import LinkSharingCard from "./LinkSharingCard";
// import { useSocket } from "../sockets/socket";

// const MeetingSection = () => {
//   const { roomId } = useParams();
//   const navigate = useNavigate();
//   const socketRef = useSocket();

//   const peersRef = useRef({});
//   const localStreamRef = useRef(null);
//   const iceServersRef = useRef([]);
  
//   // Handshake synchronization for Perfect Negotiation
//   const makingOfferRef = useRef({});
//   const ignoreOfferRef = useRef({});

//   const [name, setName] = useState("");
//   const [remoteUsers, setRemoteUsers] = useState([]);
//   const [mainVideo, setMainVideo] = useState(null);
//   const [mutedList, setMutedList] = useState([]);

//   // 1. Fetch Private TURN Credentials from Metered.ca
//   const fetchIceServers = async () => {
//     try {
//       // Replace <appname> with 'cmotsmeet' and add your API Key from dashboard
//       const response =

//         await fetch("https://cmotsmeet.metered.live/api/v1/turn/credentials?apiKey=a98fd8cb9a1137effa4cebb94dd5d861bd21");

//       const data = await response.json();
//       console.log("✅ TURN Servers Loaded:", data);
//       return data;
//     } catch (error) {
//       console.error("❌ Failed to fetch TURN credentials:", error);
//       // Fallback to basic STUN
//       return [{ urls: "stun:stun.l.google.com:19302" }];
//     }
//   };

//   useEffect(() => {
//     const startMeeting = async () => {
//       const storedUser = localStorage.getItem("user");
//       if (!storedUser) {
//         navigate(`/login/${roomId}`);
//         return;
//       }
//       const userName = JSON.parse(storedUser).name;
//       setName(userName);

//       // Fetch regional ICE servers before joining
//       const servers = await fetchIceServers();
//       iceServersRef.current = servers;

//       navigator.mediaDevices.getUserMedia({ video: true, audio: true })
//         .then(stream => {
//           localStreamRef.current = stream;
//           setMainVideo(stream);
//           setupAndJoin(stream, userName);
//         })
//         .catch(() => setupAndJoin(null, userName));
//     };

//     startMeeting();
//     return cleanup;
//   }, []);

//   function cleanup() {
//     const socket = socketRef.current;
//     if (socket) {
//       socket.off("all-users");
//       socket.off("user-joined");
//       socket.off("signal");
//       socket.off("user-left");
//     }
//     Object.values(peersRef.current).forEach(peer => peer.close());
//     peersRef.current = {};
//     localStreamRef.current?.getTracks().forEach(t => t.stop());
//   }

//   function setupAndJoin(stream, userName) {
//     const socket = socketRef.current;
//     if (!socket) return;

//     socket.emit("join-room", { roomId, name: userName });

//     socket.on("all-users", users => {
//       users.forEach(u => u.userId !== socket.id && createPeer(u.userId, u.name));
//     });

//     socket.on("user-joined", u => createPeer(u.userId, u.name));

//     socket.on("signal", async ({ from, signal }) => {
//       const peer = peersRef.current[from];
//       if (!peer) return;

//       try {
//         if (signal.type) {
//           // PERFECT NEGOTIATION: Handle collisions for the 5-device setup
//           const offerCollision = signal.type === "offer" && 
//             (makingOfferRef.current[from] || peer.signalingState !== "stable");
          
//           const isPolite = socket.id > from;
//           ignoreOfferRef.current[from] = !isPolite && offerCollision;

//           if (ignoreOfferRef.current[from]) return;

//           await peer.setRemoteDescription(new RTCSessionDescription(signal));
//           if (signal.type === "offer") {
//             await peer.setLocalDescription();
//             socket.emit("signal", { to: from, signal: peer.localDescription });
//           }
//         } else if (signal.candidate) {
//           try {
//             await peer.addIceCandidate(new RTCIceCandidate(signal));
//           } catch (err) {
//             if (!ignoreOfferRef.current[from]) throw err;
//           }
//         }
//       } catch (err) {
//         console.error("Signaling Error:", err);
//       }
//     });

//     socket.on("user-left", id => {
//       peersRef.current[id]?.close();
//       delete peersRef.current[id];
//       setRemoteUsers(prev => prev.filter(u => u.userId !== id));
//     });
//   }

//   const createPeer = (userId, userName) => {
//     if (peersRef.current[userId]) return;

//     const peer = new RTCPeerConnection({ 
//         iceServers: iceServersRef.current,
//         iceCandidatePoolSize: 10
//     });
    
//     peersRef.current[userId] = peer;
//     setRemoteUsers(prev => [...prev, { userId, name: userName, stream: null }]);

//     if (localStreamRef.current) {
//       localStreamRef.current.getTracks().forEach(track => peer.addTrack(track, localStreamRef.current));
//     }

//     peer.onicecandidate = e => {
//       if (e.candidate) socketRef.current.emit("signal", { to: userId, signal: e.candidate });
//     };

//     peer.ontrack = e => {
//       setRemoteUsers(prev => prev.map(u => u.userId === userId ? { ...u, stream: e.streams[0] } : u));
//     };

//     // Auto-Restart connection if network drops
//     peer.oniceconnectionstatechange = () => {
//       if (peer.iceConnectionState === "failed") peer.restartIce();
//     };

//     peer.onnegotiationneeded = async () => {
//       try {
//         makingOfferRef.current[userId] = true;
//         await peer.setLocalDescription();
//         socketRef.current.emit("signal", { to: userId, signal: peer.localDescription });
//       } catch (err) {
//         console.error("Negotiation Error:", err);
//       } finally {
//         makingOfferRef.current[userId] = false;
//       }
//     };

//     return peer;
//   };

//   return (
//     <section className="meetingSc">
//       <div className="container">
//         <div className="row">
//           <div className="col-xl-9">
//             <VideoCard video={mainVideo} name={name} roomId={roomId} socketRef={socketRef} />
//             <SubPrimeVideoCard userList={remoteUsers} mutedList={mutedList} />
//           </div>
//           <div className="col-xl-3">
//             <ChatCard />
//             <LinkSharingCard />
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// };

// export default MeetingSection;
