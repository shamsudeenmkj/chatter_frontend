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

        // 1. Update State first
        setIsSharing(true);

        // 2. Replace track for everyone already in the call
        Object.values(peersRef.current).forEach(peer => {
          const sender = peer.getSenders().find(s => s.track?.kind === "video");
          if (sender) sender.replaceTrack(screenTrack);
        });

        setMainVideo(screenStream);

        screenTrack.onended = () => stopScreenShare();
      } catch (err) { console.error("Sharing failed", err); }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0];

    // If camera exists, swap back. If no camera, they just see the avatar.
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
    if (localStreamRef.current && localStreamRef.current.getVideoTracks()[0]) {
      const track = localStreamRef.current.getVideoTracks()[0];
      track.enabled = !track.enabled;
      setCam(track.enabled);
      socketRef.current.emit('video-toggle', { roomId, videoOff: !track.enabled });
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current && localStreamRef.current.getAudioTracks()[0]) {
      const track = localStreamRef.current.getAudioTracks()[0];
      track.enabled = !track.enabled;
      setMic(track.enabled);
      socketRef.current.emit('audio-toggle', { roomId, muted: !track.enabled });
    }
  };

  return (
    <div className='videoCnt'>
      <div className='hostScreen'>
        {video ? (
            <video ref={videoElementRef} autoPlay muted playsInline className='PrimeVideoDisplay' />
        ) : (
            <div className='PrimeVideoDisplay' style={{backgroundColor: '#333', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                <div style={{fontSize: '5rem', color: 'white'}}>{name[0]}</div>
            </div>
        )}
        <p className='mainStreamerName'>{name} {isSharing ? "(Presenting Screen)" : ""}</p>
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