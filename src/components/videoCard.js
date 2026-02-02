import React, { useEffect, useRef, useState } from 'react';
import expandIcon from '../assets/expandIcon.svg';
import MainMicOn from '../assets/micOpenIcon.svg';
import MainMicOff from '../assets/micCloseIcon.svg';
import MainCamOn from '../assets/videoOpenIcon.svg';
import MainCamOff from '../assets/videoCloseIcon.svg';
import screenShare from '../assets/screenShareIcon.svg';
import moreOption from '../assets/moreOptionIcon.svg';
import endVideo from '../assets/meetCloseIcon.svg';

// peersRef should be passed as a prop from MeetingSection to allow track replacement
const VideoCard = ({ video, name, roomId, socketRef, peersRef, localStreamRef, setMainVideo }) => {
  
  let [mainMic, setMic] = useState(true);
  let [mainCam, setCam] = useState(true);
  let [isSharing, setIsSharing] = useState(false);
  const screenStreamRef = useRef(null);
  const videoElementRef = useRef(null);

  useEffect(() => {
    if (video && videoElementRef.current) {
      videoElementRef.current.srcObject = video;
    }
    setCam(video !== null);
  }, [video]);

  // --- SCREEN SHARE LOGIC ---
  const handleScreenShare = async () => {
    if (!isSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });

        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace track for all connected peers
        if (peersRef && peersRef.current) {
          Object.values(peersRef.current).forEach((peer) => {
            const senders = peer.getSenders();
            const videoSender = senders.find((s) => s.track.kind === "video");
            if (videoSender) {
              videoSender.replaceTrack(screenTrack);
            }
          });
        }

        setMainVideo(screenStream); // Update UI to show screen
        setIsSharing(true);

        // Handle user clicking "Stop Sharing" on browser bar
        screenTrack.onended = () => stopScreenShare();

      } catch (err) {
        console.error("Screen share error:", err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    const cameraTrack = localStreamRef.current.getVideoTracks()[0];

    // Revert back to camera for all peers
    if (peersRef && peersRef.current) {
      Object.values(peersRef.current).forEach((peer) => {
        const senders = peer.getSenders();
        const videoSender = senders.find((s) => s.track.kind === "video");
        if (videoSender) {
          videoSender.replaceTrack(cameraTrack);
        }
      });
    }

    setMainVideo(localStreamRef.current);
    setIsSharing(false);
  };

  const toggleVideo = () => {
    const stream = localStreamRef.current; // Use the actual local stream ref
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
        socketRef.current.emit('video-toggle', { roomId, videoOff: !track.enabled });
      });
      setCam(prev => !prev);
    }
  };

  const toggleAudio = () => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
        socketRef.current.emit('audio-toggle', { roomId, muted: !track.enabled });
      });
      setMic(prev => !prev);
    }
  };

  return (
    <div>
      <div className='videoCnt'>
        <div className='hostScreen'>
          {video ? (
            <video
              ref={videoElementRef}
              autoPlay
              muted
              playsInline
              className='PrimeVideoDisplay'
            />
          ) : (
            <div className='PrimeVideoDisplay' style={{ display: "flex", justifyContent: "center", alignItems: "center", border: "2px solid gray" }}>
              <div style={{ width: "200px", height: "200px", backgroundColor: "gray", borderRadius: "50%", fontSize: "100px", textAlign: "center", lineHeight: "200px" }}>
                {name ? name[0] : ""}
              </div>
            </div>
          )}
          <p className='mainStreamerName'>{name}</p>
          <div className='expandIconCnt'>
            <img src={expandIcon} alt="Expand Icon" />
          </div>
          <div className='primaryHostIcons'>
            <div className="hostmicCnt commonHostIcons" onClick={toggleAudio}>
              <img src={mainMic ? MainMicOn : MainMicOff} alt="Mic Icon" />
            </div>
            <div className="hostCamCnt commonHostIcons" onClick={toggleVideo}>
              <img src={mainCam ? MainCamOn : MainCamOff} alt="Cam Icon" />
            </div>
            {/* --- SCREEN SHARE BUTTON --- */}
            <div 
              className={`hostScrShareCnt commonHostIcons ${isSharing ? 'active-share' : ''}`} 
              onClick={handleScreenShare}
              style={{ backgroundColor: isSharing ? '#ff4d4d' : '' }}
            >
              <img src={screenShare} alt="Screen Share Icon" />
            </div>
            <div className="hostMoreOptionCnt commonHostIcons">
              <img src={moreOption} alt="More Option Icon" />
            </div>
            <div className="hostEndCnt commonHostIcons" onClick={() => { window.location.href = "/" }}>
              <img src={endVideo} alt="Close Btn Icon" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoCard;