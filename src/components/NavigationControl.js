import React, { useState } from 'react';
import DummyMic from '../assets/dummyMic Image.svg';
import DummyCam from '../assets/dummyCam Image.svg';
import DummyShare from '../assets/dummyScreenShare Image.svg';
import DummyEmoji from '../assets/dummyEmoji Image.svg';
import DummyMoreIcon from '../assets/dummyMoreIcon Image.svg';
import NavSeperator from '../assets/navSeperator.svg';
import DummyStopMeet from '../assets/dummyStopIcon Image.svg';

const NavigationControl = ({  screenStreamRef,isSharing,peersRef,setIsSharing,setMainVideo,localStreamRef,roomId,socketRef
}) => {

     const [mainMic, setMic] = useState(true);
      const [mainCam, setCam] = useState(true);
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
    if (!track) return;

    track.enabled = !track.enabled;
    setMic(track.enabled);
    socketRef.current?.emit("audio-toggle", { roomId, muted: !track.enabled });
  };

  return (
    <section className='navigationControllerSc'>
        <div className="container">
            <div className="row">
                <div className="navControllerCnt">
                    <div  onClick={toggleAudio}>
                        <img src={mainMic ? DummyMic : DummyMic}   alt="Mic" />
                    </div>
                    <div  onClick={toggleVideo}>
                        <img src={mainCam ? DummyCam : DummyCam} alt="Cam" />
                    </div>
                    <div onClick={handleScreenShare}>
                        <img src={DummyShare} alt="Share" />
                    </div>
                    <div>
                        <img src={DummyEmoji} alt="Emoji" />
                    </div>
                    <div>
                        <img src={DummyMoreIcon} alt="More Icon" />
                    </div>
                    <div>
                        <img src={NavSeperator} alt="Seperator" />
                    </div>
                    <div className='stopBtn'>
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
