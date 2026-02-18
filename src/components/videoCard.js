import React, { useEffect, useRef, useState } from "react";


const VideoCard = ({
  video,
  name,
  isSharing,
}) => {

 
  const videoElementRef = useRef(null);

  useEffect(() => {
    if (video && videoElementRef.current) {
      videoElementRef.current.srcObject = video;
    }
  }, [video]);


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

      
      </div>
    </div>
  );
};

export default VideoCard;
