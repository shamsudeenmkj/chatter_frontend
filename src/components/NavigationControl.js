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



const NavigationControl = ({  screenStreamRef,isSharing,peersRef,setIsSharing,setMainVideo,localStreamRef,roomId,socketRef, activePanel,
  onToggleChat,
  onToggleParticipants
}) => {

     const [mainMic, setMic] = useState(true);
      const [mainCam, setCam] = useState(true);
const navigate = useNavigate();
     useEffect(() => {
  const socket = socketRef.current;
   console.log("socket 1===>",socketRef)
  if (!socket) return;
   console.log("socket 2===>",socket)

  socket.on("audio-toggle", (data) => {
    console.log("mic===>",data)
    if(data.userId===socket.id){

      setMic(data.muted);
    }
  });

  socket.on("video-toggle", (data) => {
    setCam(data.videoOff);
  });

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
  const sender = peer.getSenders().find(s => s.track?.kind === "video");

  if (sender && screenTrack) {
    sender.replaceTrack(screenTrack);
  } else {
    peer.addTrack(screenTrack, screenStreamRef.current);
  }
});



      screenTrack.onended = stopScreenShare;

    } catch (err) {
      console.error("Screen share failed:", err);
    }
  };

  const stopScreenShare = () => {
  // 1. Kill the screen tracks locally
  if (screenStreamRef.current) {
    screenStreamRef.current.getTracks().forEach(track => track.stop());
    screenStreamRef.current = null;
  }

  setIsSharing(false);

  // 2. Try to get the camera track
  const cameraTrack = localStreamRef.current?.getVideoTracks()[0] || null;

  // 3. Update all peers
  Object.values(peersRef.current).forEach(peer => {    
    const videoSender = peer.getSenders().find(s => s.track?.kind === "video");
    
    if (videoSender) {
      // If cameraTrack is null, it cleanly stops the video stream for the client
      videoSender.replaceTrack(cameraTrack);
    }
  });

  // 4. Update local UI
  // If no camera, you might want to set this to null or a placeholder
  setMainVideo(localStreamRef.current);
};

  const toggleVideo = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;

    track.enabled = !track.enabled;
    setCam(track.enabled);
    socketRef.current?.emit("video-toggle", { roomId, videoOff: !track.enabled });
  };

  const toggleAudio = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    console.log("mic track===>",track)
// socketRef.current?.emit("audio-toggle", { roomId, muted: false });

    if (!track) return;

    track.enabled = !track.enabled;
    setMic(track.enabled);
    socketRef.current?.emit("audio-toggle", { roomId, muted: !track.enabled });
  };

  const handleLeaveMeeting = () => {
  const socket = socketRef.current;
  if (!socket) return;

  // 1️⃣ Notify server
  socket.emit("leave-room", { roomId });

  // 2️⃣ Close all peer connections
  Object.values(peersRef.current).forEach(peer => {
    peer.close();
  });

  peersRef.current = {};

  // 3️⃣ Stop local camera & mic
  localStreamRef.current?.getTracks().forEach(track => track.stop());

  // 4️⃣ Stop screen share
  if (screenStreamRef.current) {
    screenStreamRef.current.getTracks().forEach(track => track.stop());
    screenStreamRef.current = null;
  }

  // 5️⃣ Disconnect socket (optional if full app exit)
  socket.disconnect();

  // 6️⃣ Navigate away
  navigate("/");
};

  return (
    <section className='navigationControllerSc'>
        <div className="container">
            <div className="row">
                <div className="navControllerCnt">
                    <button className='iconBtn'  onClick={toggleAudio}>
                        <img src={mainMic ? MainMicOff:NavMicOpen}   alt="Mic" />
                    </button>
                    <div  onClick={toggleVideo}>
                        <img src={mainCam ?MainCamOff :DummyCam} alt="Cam" />
                    </div>
                    <div style={{color:"red !important"}} onClick={handleScreenShare} >
                        <img  src={isSharing?DummyShare:DummyShare} alt="Share" />
                    </div>
                    <div>
                        <img src={DummyEmoji} alt="Emoji" />
                    </div>
                      {/* <button className='iconBtn'>
                          <img src={MoreIcon} alt="More Icon" />
                      </button> */}
                      <div className="iconBtnSubPr dropup">
  <button
    type="button"
    className="iconBtn dropdown-toggle"
    data-bs-toggle="dropdown"
    aria-expanded="false"
  >
    <img src={MoreIcon} alt="More Icon" />
  </button>

  <ul className="dropdown-menu">
    <li>
      <button className="dropdown-item">
        <div>
            <img src={RaiseHandIcon} alt="Raise Hand Icon" />
        </div> Raise Hand</button>
    </li>
    <li>
      <button className="dropdown-item">
        <div>
            <img src={AdmitIcon} alt="Admit Icon" />
        </div>Admit Participants</button>
    </li>
    <li className='mobileController'>
      <button className="dropdown-item">
        <div>
            <img src={Participants} alt="Participants Icon" />
        </div>Participants</button>
    </li>
    <li className=''>
      <button className="dropdown-item" onClick={onToggleChat}>
        <div>
            <img src={ChatIcon} alt="Chat Icon" />
        </div>Chats</button>
    </li>
    <li className='mobileController'>
      <button className="dropdown-item">
        <div>
            <img src={PollIcon} alt="Poll Icon" />
        </div>Poll</button>
    </li>
  </ul>
</div>

                    <div className='navSeparator'>
                        <img src={NavSeperator} alt="Seperator" />
                    </div>
                     {/* <button className="dropdown-item" >
                    <div><img src={ChatIcon} alt="Chat" /></div>
                    Chats
                  </button> */}
                    <div className='stopBtn' onClick={handleLeaveMeeting}>
                        <span>Stop</span>
                        <div>
                            <img src={DummyStopMeet} alt="Stop Call Icon" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
  )
}

export default NavigationControl
