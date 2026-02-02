import React, { useEffect, useRef, useState } from 'react';
import MainMicOn from '../assets/micOpenIcon.svg';
import MainMicOff from '../assets/micCloseIcon.svg';
import MainCamOn from '../assets/videoOpenIcon.svg';
import MainCamOff from '../assets/videoCloseIcon.svg';
import screenShare from '../assets/screenShareIcon.svg';
import endVideo from '../assets/meetCloseIcon.svg';

const VideoCard = ({ video, name, peersRef, localStreamRef, screenStreamRef, setMainVideo, isSharing, setIsSharing, socketRef, roomId }) => {
  const [mainMic, setMic] = useState(true);
  const [mainCam, setCam] = useState(true);
  const videoElementRef = useRef(null);

  useEffect(() => {
    if (video && videoElementRef.current) {
      videoElementRef.current.srcObject = video;
    }
  }, [video]);

  const handleScreenShare = async () => {
    if (!isSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace track for ALL current peers
        Object.values(peersRef.current).forEach(peer => {
          const sender = peer.getSenders().find(s => s.track?.kind === "video");
          if (sender) sender.replaceTrack(screenTrack);
        });

        setMainVideo(screenStream);
        setIsSharing(true);

        screenTrack.onended = () => stopScreenShare();
      } catch (err) { console.error("Sharing failed", err); }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0];

    if (cameraTrack) {
        Object.values(peersRef.current).forEach(peer => {
            const sender = peer.getSenders().find(s => s.track?.kind === "video");
            if (sender) sender.replaceTrack(cameraTrack);
        });
    }

    setMainVideo(localStreamRef.current);
    setIsSharing(false);
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
        socketRef.current.emit('video-toggle', { roomId, videoOff: !track.enabled });
      });
      setCam(prev => !prev);
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
        socketRef.current.emit('audio-toggle', { roomId, muted: !track.enabled });
      });
      setMic(prev => !prev);
    }
  };

  return (
    <div className='videoCnt'>
      <div className='hostScreen'>
        <video ref={videoElementRef} autoPlay muted playsInline className='PrimeVideoDisplay' />
        <p className='mainStreamerName'>{name} {isSharing ? "(Presenting)" : ""}</p>
        <div className='primaryHostIcons'>
          <div className="commonHostIcons" onClick={toggleAudio}>
            <img src={mainMic ? MainMicOn : MainMicOff} alt="Mic" />
          </div>
          <div className="commonHostIcons" onClick={toggleVideo}>
            <img src={mainCam ? MainCamOn : MainCamOff} alt="Cam" />
          </div>
          <div className="commonHostIcons" onClick={handleScreenShare} style={{ backgroundColor: isSharing ? '#ff4d4d' : '' }}>
            <img src={screenShare} alt="Share" />
          </div>
          <div className="commonHostIcons" onClick={() => window.location.href = "/"}>
            <img src={endVideo} alt="End" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;