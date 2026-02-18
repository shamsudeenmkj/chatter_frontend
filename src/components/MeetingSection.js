import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import VideoCard from "./videoCard";
import ChatCard from "./ChatCard";
import Participants from "./Participants";
import NavigationControl from "./NavigationControl";
import SubPrimeVideoCard from "./SubPrimeVideoCard";
import LinkSharingCard from "./LinkSharingCard";
import { useSocket } from "../sockets/socket";

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

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return navigate(`/login/${roomId}`);

    const userName = JSON.parse(storedUser).name;
    setName(userName);

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        localStreamRef.current = stream;
        setMainVideo(stream);
         socketRef.current?.emit("audio-toggle", { roomId, muted: false });
    socketRef.current?.emit("video-toggle", { roomId, videoOff: false });
        setupAndJoin(userName,false);
      })
      .catch(async () => {
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
          localStreamRef.current = audioOnly;
                        socketRef.current?.emit("audio-toggle", { roomId, muted: false });
    socketRef.current?.emit("video-toggle", { roomId, videoOff: true });

          setupAndJoin(userName,false);
        } catch {
              socketRef.current?.emit("audio-toggle", { roomId, muted: true });
    socketRef.current?.emit("video-toggle", { roomId, videoOff:true});

          setupAndJoin(userName,true);
        }
      });

    return cleanup;
  }, []);

  function cleanup() {
    const socket = socketRef.current;
    if (!socket) return;

    socket.off("all-users");
    socket.off("user-joined");
    socket.off("signal");
    socket.off("user-left");

    Object.values(peersRef.current).forEach(peer => peer.close());
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
  }

  function setupAndJoin(userName,micMuted) {
    const socket = socketRef.current;
    if (!socket) return;

    socket.emit("join-room", { roomId, name: userName });

    socket.on("all-users", users => {
      users.forEach(u => u.userId !== socket.id && createPeer(u.userId, u.name,micMuted));
    });

    socket.on("user-joined", u => createPeer(u.userId, u.name,micMuted));

    socket.on("signal", async ({ from, signal }) => {
      const peer = peersRef.current[from];
      if (!peer) return;

      try {
        if (signal.type) {
          const collision =
            signal.type === "offer" &&
            (makingOfferRef.current[from] || peer.signalingState !== "stable");

          const polite = socket.id > from;
          ignoreOfferRef.current[from] = !polite && collision;
          if (ignoreOfferRef.current[from]) return;

          await peer.setRemoteDescription(signal);

          if (signal.type === "offer") {
            await peer.setLocalDescription(await peer.createAnswer());
            socket.emit("signal", { to: from, signal: peer.localDescription });
          }

        } else if (signal.candidate) {
          await peer.addIceCandidate(signal);
        }
      } catch (err) {
        console.error("Signal error:", err);
      }
    });


    socket.on("audio-toggle", ({ userId, muted }) => {
          console.log("audio-toggle==>",muted)

  setRemoteUsers(prev =>
    prev.map(user =>
      user.userId === userId
        ? { ...user, muted }
        : user
    )
  );
});

    socket.on("user-left", id => {
      peersRef.current[id]?.close();
      delete peersRef.current[id];
      setRemoteUsers(prev => prev.filter(u => u.userId !== id));
    });
  }

function createPeer(userId, userName,micMuted) {
  if (peersRef.current[userId]) return;

  const peer = new RTCPeerConnection(ICE_SERVERS);
  peersRef.current[userId] = peer;

  setRemoteUsers(prev => {
    if (prev.find(u => u.userId === userId)) return prev;
    return [...prev, { userId, name: userName, stream: null ,muted:micMuted}];
  });

  // Add audio
  const audioTrack = localStreamRef.current?.getAudioTracks()[0];
  if (audioTrack) {
    peer.addTrack(audioTrack, localStreamRef.current);
  }

  // Add video (camera initially)
  const camTrack = localStreamRef.current?.getVideoTracks()[0];
  if (camTrack) {
    peer.addTrack(camTrack, localStreamRef.current);
  }

  peer.onicecandidate = e => {
    if (e.candidate) {
      socketRef.current.emit("signal", { to: userId, signal: e.candidate });
    }
  };

  peer.ontrack = e => {
    console.log("REMOTE STREAM RECEIVED");
    setRemoteUsers(prev =>
      prev.map(u =>
        u.userId === userId ? { ...u, stream: e.streams[0] } : u
      )
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

  // ✅ FORCE SCREEN TRACK IF SHARING IS ACTIVE
  setTimeout(() => {
    if (screenStreamRef.current) {
      const screenTrack = screenStreamRef.current.getVideoTracks()[0];
      const sender = peer.getSenders().find(s => s.track?.kind === "video");

      if (sender && screenTrack) {
        console.log("FORCING SCREEN TRACK TO NEW USER");
        sender.replaceTrack(screenTrack);
      }
    }
  }, 500);
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
      { userId: socketRef.current?.id, name, stream: mainVideo, muted: true },
      ...remoteUsers
    ]}
    activePanel={activePanel}  
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
    {activePanel === "chat" && <ChatCard userList={remoteUsers}   onToggleChat={() => setActivePanel(p => p === "chat" ? null : "chat")}
/>}
    {activePanel === "participants" && <Participants />}
  </div>
)}
        </div>

        <div className="row">
            <div className="col-lg-12">
              <div className="bottomControllers">
              <Participants/>
              <NavigationControl    
           
              peersRef={peersRef}
              localStreamRef={localStreamRef}
              screenStreamRef={screenStreamRef}
              setMainVideo={setMainVideo}
              isSharing={isSharing}
              setIsSharing={setIsSharing}
              socketRef={socketRef}
              roomId={roomId}

              activePanel={activePanel}
  onToggleChat={() => setActivePanel(p => p === "chat" ? null : "chat")}
  onToggleParticipants={() => setActivePanel(p => p === "participants" ? null : "participants")}

              
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
