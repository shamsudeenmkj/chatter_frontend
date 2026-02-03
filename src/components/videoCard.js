import React, { useEffect, useRef, useState } from "react";
import MainMicOn from "../assets/micOpenIcon.svg";
import MainMicOff from "../assets/micCloseIcon.svg";
import MainCamOn from "../assets/videoOpenIcon.svg";
import MainCamOff from "../assets/videoCloseIcon.svg";
import screenShare from "../assets/screenShareIcon.svg";
import endVideo from "../assets/meetCloseIcon.svg";

const VideoCard = ({
  video,
  name,
  peersRef,
  localStreamRef,
  screenStreamRef,
  setMainVideo,
  isSharing,
  setIsSharing,
  socketRef,
  roomId
}) => {

  const [mainMic, setMic] = useState(true);
  const [mainCam, setCam] = useState(true);
  const videoElementRef = useRef(null);

  useEffect(() => {
    if (video && videoElementRef.current) {
      videoElementRef.current.srcObject = video;
    }
  }, [video]);

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
        if (sender) sender.replaceTrack(screenTrack);
      });

      screenTrack.onended = stopScreenShare;

    } catch (err) {
      console.error("Screen share failed:", err);
    }
  };

  const stopScreenShare = () => {
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    setIsSharing(false);

    const cameraTrack = localStreamRef.current?.getVideoTracks()[0];

    if (cameraTrack) {
      Object.values(peersRef.current).forEach(peer => {
        const sender = peer.getSenders().find(s => s.track?.kind === "video");
        if (sender) sender.replaceTrack(cameraTrack);
      });

      setMainVideo(localStreamRef.current);
    }
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
    <div className="videoCnt">
      <div className="hostScreen">

        {video ? (
          <video ref={videoElementRef} autoPlay muted playsInline className="PrimeVideoDisplay" />
        ) : (
          <div className="PrimeVideoDisplay" style={{
            backgroundColor: "#1a1a1a",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
          }}>
            <div style={{ fontSize: "80px", color: "white" }}>{name?.[0]}</div>
          </div>
        )}

        <p className="mainStreamerName">
          {name} {isSharing ? "(Presenting)" : ""}
        </p>

        <div className="primaryHostIcons">

          <div className="commonHostIcons" onClick={toggleAudio}>
            <img src={mainMic ? MainMicOn : MainMicOff} alt="Mic" />
          </div>

          <div className="commonHostIcons" onClick={toggleVideo}>
            <img src={mainCam ? MainCamOn : MainCamOff} alt="Cam" />
          </div>

          <div className="commonHostIcons" onClick={handleScreenShare}
            style={{ backgroundColor: isSharing ? "red" : "" }}>
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
