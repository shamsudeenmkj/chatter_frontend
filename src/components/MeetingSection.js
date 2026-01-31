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
    { urls: "turn:relay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:relay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:relay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" }
  ]
};

const MeetingSection = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const socketRef = useSocket();

  const peersRef = useRef({});
  const localStreamRef = useRef(null);

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
      .catch(() => {
        setupAndJoin(null, userName);
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
      socket.off("audio-toggle");
      socket.off("video-toggle");
      socket.disconnect?.();
    }

    Object.values(peersRef.current).forEach(peer => peer.close());
    peersRef.current = {};

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }
  }

  function setupAndJoin(stream, userName) {
    const socket = socketRef.current;
    if (!socket) return;

    const hasVideo = !!stream?.getVideoTracks().length;
    const hasAudio = !!stream?.getAudioTracks().length;

    socket.emit("join-room", { roomId, name: userName, hasVideo, hasAudio });

    // Receive all existing users
    socket.on("all-users", users => {
      users.forEach(u => {
        if (u.userId === socket.id) return;

        setRemoteUsers(prev => {
          if (prev.some(x => x.userId === u.userId)) return prev;
          return [...prev, { ...u, stream: null }];
        });

        const peer = createPeer(u.userId, true);
        peersRef.current[u.userId] = peer;
      });
    });

    // New user joins
    socket.on("user-joined", u => {
      setRemoteUsers(prev => {
        if (prev.some(x => x.userId === u.userId)) return prev;
        return [...prev, { ...u, stream: null }];
      });

      const peer = createPeer(u.userId, true);
      peersRef.current[u.userId] = peer;
    });

    // WebRTC signals
    socket.on("signal", async ({ from, signal }) => {
  let peer = peersRef.current[from];

  if (!peer) {
    peer = createPeer(from, false);
    peersRef.current[from] = peer;
  }

  try {
    if (signal.type) {
      await peer.setRemoteDescription(new RTCSessionDescription(signal));

      if (signal.type === "offer") {
        console.log("📨 Offer received, sending answer");

        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        socket.emit("signal", {
          to: from,
          signal: peer.localDescription
        });
      }
    }

    if (signal.candidate) {
      await peer.addIceCandidate(new RTCIceCandidate(signal));
    }

  } catch (err) {
    console.warn("Signal error:", err);
  }
});


    socket.on("user-left", id => {
      if (peersRef.current[id]) {
        peersRef.current[id].close();
        delete peersRef.current[id];
      }
      setRemoteUsers(prev => prev.filter(u => u.userId !== id));
    });

    socket.on("audio-toggle", ({ userId, muted }) => {
      setMutedList(prev => muted ? [...prev, userId] : prev.filter(id => id !== userId));
    });

    socket.on("video-toggle", ({ userId, videoOff }) => {
      setRemoteUsers(prev => prev.map(u => u.userId === userId ? { ...u, videoOff } : u));
    });
  }

 const createPeer = (userId, initiator) => {
  const peer = new RTCPeerConnection(ICE_SERVERS);

  // Always allow receiving
  peer.addTransceiver("video", { direction: "sendrecv" });
  peer.addTransceiver("audio", { direction: "sendrecv" });

  // Add local tracks BEFORE negotiation
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
    const stream = event.streams?.[0] || new MediaStream([event.track]);

    console.log("🎥 Remote stream received from", userId);

    setRemoteUsers(prev => {
      const exists = prev.find(u => u.userId === userId);
      if (exists) {
        return prev.map(u => u.userId === userId ? { ...u, stream } : u);
      }
      return [...prev, { userId, stream }];
    });
  };

  // Offer ONLY if initiator
  if (initiator) {
    peer.onnegotiationneeded = async () => {
      try {
        console.log("📡 Creating offer for", userId);

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        socketRef.current.emit("signal", {
          to: userId,
          signal: peer.localDescription
        });

      } catch (err) {
        console.warn("Negotiation error:", err);
      }
    };
  }

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
              roomId={roomId}
              socketRef={socketRef}
            />

            <SubPrimeVideoCard
              userList={remoteUsers}
              mutedList={mutedList}
            />
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




// import React, { useEffect, useRef, useState } from 'react';
// import { useNavigate, useParams } from 'react-router-dom';
// import VideoCard from './videoCard';
// import ChatCard from './ChatCard';
// import SubPrimeVideoCard from './SubPrimeVideoCard';
// import LinkSharingCard from './LinkSharingCard';
// import { useSocket } from '../sockets/socket';

// const ICE_SERVERS = {
//   iceServers: [
//     { urls: 'stun:stun.l.google.com:19302' },
//     { urls: "turn:relay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
//     { urls: "turn:relay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
//     { urls: "turn:relay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" }
//   ]
// };

// const MeetingSection = () => {
//   const { roomId } = useParams();
//   const [name, setName] = useState('');
//   const navigate = useNavigate();

//   const [remoteUsers, setRemoteUsers] = useState([]); // { userId, name, stream, videoOff? }
//   const [mainVideo, setMainVideo] = useState(null);
//   const socketRef = useSocket(); // expects a ref-like socket object
//   const peersRef = useRef({}); // userId -> RTCPeerConnection
//   const [mutedList, setMutedList] = useState([]);

//   useEffect(() => {
//     const storedUser = localStorage.getItem('user');
//     if (!storedUser) {
//       navigate(`/login/${roomId}`);
//       return;
//     }
//     const userName = JSON.parse(storedUser).name;
//     setName(userName);

//     // Try to get media; if denied, join with null (no tracks)
//     navigator.mediaDevices.getUserMedia({ video: true, audio: true })
//       .then(stream => {
//         setMainVideo(stream);
//         setupAndJoin(stream, userName);
//             // setTimeout(() => addLocalTracksToPeers(stream), 500);

//       })
//       .catch(err => {
//         // join with null (no tracks)
//         setupAndJoin(null, userName);
//       });

//     return () => {
//       // cleanup: remove socket handlers, close peers, stop local tracks
//       const socket = socketRef.current;
//       if (socket) {
//         socket.off('user-joined');
//         socket.off('signal');
//         socket.off('user-left');
//         socket.off('audio-toggle');
//         socket.off('video-toggle');
//         socket.disconnect?.();
//       }
//       Object.values(peersRef.current).forEach(p => p.close && p.close());
//       peersRef.current = {};
//       if (mainVideo) {
//         mainVideo.getTracks().forEach(t => t.stop());
//       }
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);


//   // const setupAndJoin = (stream, userName) => {
//   //   const socket = socketRef.current;
//   //   if (!socket) return;

//   //   // Avoid double registration
//   //   socket.off('user-joined');
//   //   socket.off('signal');
//   //   socket.off('user-left');
//   //   socket.off('audio-toggle');
//   //   socket.off('video-toggle');

//   //   // When another user joins -> create peer as initiator and add placeholder entry (stream:null)
//   //   socket.on('user-joined', ({ userId, name }) => {
//   //     if (peersRef.current[userId]) return;

//   //     const peer = createPeer(userId, name, true);
//   //     peer._userId = userId;
//   //     peer._name = name;
//   //     peersRef.current[userId] = peer;

//   //     // add user to UI if missing (keep stream:null until ontrack)
//   //     setRemoteUsers(prev => {
//   //       if (prev.some(u => u.userId === userId)) return prev;
//   //       return [...prev, { userId, name, stream: null }];
//   //     });

//   //     // if we have local stream, add tracks to peer
//   //     if (stream) {
//   //       stream.getTracks().forEach(track => peer.addTrack(track, stream));
//   //     }
//   //   });

//   //   // Signals (offer/answer/candidate)
//   //   socket.on('signal', async ({ from, name, signal }) => {
//   //     let peer = peersRef.current[from];
//   //     if (!peer) {
//   //       // create non-initiator peer if missing
//   //       peer = createPeer(from, name, false);
//   //       peer._userId = from;
//   //       peer._name = name;
//   //       peersRef.current[from] = peer;

//   //       // ensure remote user exists in UI even if stream hasn't arrived yet
//   //       setRemoteUsers(prev => {
//   //         if (prev.some(u => u.userId === from)) return prev;
//   //         return [...prev, { userId: from, name, stream: null }];
//   //       });

//   //       // if local stream exists, add tracks
//   //       if (stream) stream.getTracks().forEach(track => peer.addTrack(track, stream));
//   //     }

//   //     // handle sdp or candidate
//   //     try {
//   //       if (signal.type === 'offer' || signal.type === 'answer') {
//   //         await peer.setRemoteDescription(new RTCSessionDescription(signal));
//   //         if (signal.type === 'offer') {
//   //           const answer = await peer.createAnswer();
//   //           await peer.setLocalDescription(answer);
//   //           socket.emit('signal', { to: from, name, signal: peer.localDescription });
//   //         }
//   //       } else if (signal.candidate) {
//   //         await peer.addIceCandidate(new RTCIceCandidate(signal));
//   //       }
//   //     } catch (err) {
//   //       console.warn('Signal handling error', err);
//   //     }
//   //   });

//   //   socket.on('user-left', (id) => {
//   //     if (peersRef.current[id]) {
//   //       peersRef.current[id].close();
//   //       delete peersRef.current[id];
//   //     }
//   //     setRemoteUsers(prev => prev.filter(u => u.userId !== id));
//   //   });

//   //   socket.on('audio-toggle', ({ userId, muted }) => {
//   //     setMutedList(prev => (muted ? (prev.includes(userId) ? prev : [...prev, userId]) : prev.filter(id => id !== userId)));
//   //   });

//   //   // optional: mark videoOff on user entry (UI can dim)
//   //   socket.on('video-toggle', ({ userId, videoOff }) => {
//   //     setRemoteUsers(prev => prev.map(u => u.userId === userId ? { ...u, videoOff } : u));
//   //   });

//   //   // finally emit join
//   //   socket.emit('join-room', roomId, userName);
//   // };
// const setupAndJoin = (stream,userName) => {
//   const socket = socketRef.current;
//   if (!socket) return;

//   const hasVideo = !!stream?.getVideoTracks().length;
//   const hasAudio = !!stream?.getAudioTracks().length;

//   // Send join info to server
//   socket.emit('join-room', { roomId, name: userName, hasVideo, hasAudio });

//   // 1️⃣ Receive all existing users (including null streams)
//   // socket.on('all-users', (users) => {
//   //  setRemoteUsers(
//   //   users
//   //     .filter(u => u.userId !== socket.id) // <-- ignore yourself
//   //     .map(u => ({
//   //       userId: u.userId,
//   //       name: u.name,
//   //       stream: null,
//   //       hasVideo: u.hasVideo,
//   //       hasAudio: u.hasAudio
//   //     }))
//   // );
//   // });

//   socket.on('all-users', (users) => {
//   users
//     .filter(u => u.userId !== socket.id)
//     .forEach(u => {
//       // Add user in UI first
//       setRemoteUsers(prev => {
//         if (prev.some(x => x.userId === u.userId)) return prev;
//         return [...prev, { ...u, stream: null }];
//       });

//       // Create peer as NON-initiator
//       const peer = createPeer(u.userId, false);
//       peersRef.current[u.userId] = peer;

//       // Add our local tracks to send media
//       if (stream) {
//         stream.getTracks().forEach(track => peer.addTrack(track, stream));
//       }
//     });
// });


//   // 2️⃣ When a new user joins
//   socket.on('user-joined', (u) => {
//     setRemoteUsers(prev => {
//       if (prev.some(x => x.userId === u.userId)) return prev;
//       return [...prev, { ...u, stream: null }];
//     });

//     // create peer if local stream exists
//     const peer = createPeer(u.userId, true);
//     peersRef.current[u.userId] = peer;
//     if (stream) stream.getTracks().forEach(track => peer.addTrack(track, stream));
//   });

//   // 3️⃣ Signals
//   socket.on('signal', async ({ from, signal }) => {
//     let peer = peersRef.current[from];
//     if (!peer) {
//       peer = createPeer(from, false);
//       peersRef.current[from] = peer;
//     }

//     if (signal.type) {
//       await peer.setRemoteDescription(new RTCSessionDescription(signal));
//       if (signal.type === 'offer') {
//         const answer = await peer.createAnswer();
//         await peer.setLocalDescription(answer);
//         socket.emit('signal', { to: from, signal: peer.localDescription });
//       }
//     } else if (signal.candidate) {
//       await peer.addIceCandidate(new RTCIceCandidate(signal));
//     }
//   });




//   // 4️⃣ User leaves
//   socket.on('user-left', (id) => {
//     if (peersRef.current[id]) {
//       peersRef.current[id].close();
//       delete peersRef.current[id];
//     }
//     setRemoteUsers(prev => prev.filter(u => u.userId !== id));
//   });

//   // 5️⃣ Audio/Video toggle updates
//   socket.on('audio-toggle', ({ userId, muted }) => {
//     setMutedList(prev => muted ? [...prev, userId] : prev.filter(id => id !== userId));
//   });
//   socket.on('video-toggle', ({ userId, videoOff }) => {
//     setRemoteUsers(prev => prev.map(u => u.userId === userId ? { ...u, videoOff } : u));
//   });
// };


// //1

//   // const createPeer = (userId, name, initiator) => {
//   //   const peer = new RTCPeerConnection(ICE_SERVERS);

//   //   // ICE candidate -> send to signaling
//   //   peer.onicecandidate = (e) => {
//   //     if (e.candidate) {
//   //       socketRef.current.emit('signal', {
//   //         to: userId,
//   //         name,
//   //         signal: e.candidate,
//   //       });
//   //     }
//   //   };

//   //   // ontrack -> upsert user with stream
//   //   peer.ontrack = (event) => {
//   //     const stream = (event.streams && event.streams[0]) || new MediaStream([event.track]);
//   //     setRemoteUsers(prev => {
//   //       // if user exists, update stream; otherwise add new
//   //       if (prev.some(u => u.userId === userId)) {
//   //         return prev.map(u => u.userId === userId ? { ...u, stream } : u);
//   //       }
//   //       return [...prev, { userId, name, stream }];
//   //     });
//   //   };

//   //   // initiator will negotiate when tracks are added (or onnegotiationneeded)
//   //   if (initiator) {
//   //     peer.onnegotiationneeded = async () => {
//   //       try {
//   //         const offer = await peer.createOffer();
//   //         await peer.setLocalDescription(offer);
//   //         socketRef.current.emit('signal', {
//   //           to: userId,
//   //           name,
//   //           signal: peer.localDescription,
//   //         });
//   //       } catch (err) {
//   //         console.warn('negotiation error', err);
//   //       }
//   //     };
//   //   }

//   //   return peer;
//   // };


//   // OPTIONAL helper: if local user gets media AFTER joining with null,
//   // you must add tracks to all existing peers so remote peers receive ontrack.

// //2
// //   const createPeer = (userId, initiator) => {
// //   const peer = new RTCPeerConnection(ICE_SERVERS);

// //   peer.onicecandidate = (e) => {
// //     if (e.candidate) {
// //       socketRef.current.emit('signal', { to: userId, signal: e.candidate });
// //     }
// //   };

// //   peer.ontrack = (event) => {
// //     const stream = event.streams[0];
// //     setRemoteUsers(prev => prev.map(u => u.userId === userId ? { ...u, stream } : u));
// //   };

// //   if (initiator) {
// //     peer.onnegotiationneeded = async () => {
// //       try {
// //         const offer = await peer.createOffer();
// //         await peer.setLocalDescription(offer);
// //         socketRef.current.emit('signal', { to: userId, signal: peer.localDescription });
// //       } catch (err) {
// //         console.warn(err);
// //       }
// //     };
// //   }

// //   return peer;
// // };

// //3
// const createPeer = (userId, initiator) => {
//   const peer = new RTCPeerConnection(ICE_SERVERS);

//   // ✅ Always allow receiving media even if user has no camera/mic
//   peer.addTransceiver("video", { direction: "recvonly" });
//   peer.addTransceiver("audio", { direction: "recvonly" });

//   peer.onicecandidate = (e) => {
//     if (e.candidate) {
//       socketRef.current.emit('signal', { to: userId, signal: e.candidate });
//     }
//   };

//   peer.ontrack = (event) => {
//     const stream = event.streams[0];

//     setRemoteUsers(prev => {
//       const exists = prev.find(u => u.userId === userId);
//       if (exists) {
//         return prev.map(u => u.userId === userId ? { ...u, stream } : u);
//       }
//       return [...prev, { userId, stream }];
//     });
//   };

//   if (initiator) {
//     peer.onnegotiationneeded = async () => {
//       const offer = await peer.createOffer();
//       await peer.setLocalDescription(offer);
//       socketRef.current.emit('signal', { to: userId, signal: peer.localDescription });
//     };
//   }

//   return peer;
// };


  
//   const addLocalTracksToPeers = (stream) => {
//     Object.values(peersRef.current).forEach(peer => {
//       try {
//         stream.getTracks().forEach(track => peer.addTrack(track, stream));
//       } catch (e) {
//         console.warn('addLocalTracks error', e);
//       }
//     });
//   };

//   // UI rendering
//   return (
//     <section className='meetingSc'>
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
