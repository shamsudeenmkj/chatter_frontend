import React, { useEffect, useRef } from 'react'
import SubPrimeMicOn from '../assets/subPrimeMic.png';
import SubPrimeMicOff from '../assets/subPrimeMicOff.png';

const SubPrimeVideoCard = ({ userList }) => {
  return (
    <div className="subPrimeVideoCardCnt">
      {userList.map(({ userId, name, stream }) => (
        <UserTile
          key={userId}
          userId={userId}
          name={name}
          stream={stream}
        />
      ))}
    </div>
  );
};

const UserTile = ({ userId, name, stream, muted }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      if (stream) {
        videoRef.current.srcObject = stream;
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [stream]);

  return (
    <div className="detailedvideoCardCnt">
      {stream ? (
        <div className="videoCnt">
          <video
            autoPlay
            playsInline
            ref={videoRef}
            style={{ width: "220px", height: "150px" }}
          />
          <span className="userName">{name}</span>
          <div className="micContainer">
            <img src={muted ? SubPrimeMicOff : SubPrimeMicOn} alt="Mic Icon" />
          </div>
        </div>
      ) : (
        <div
          className="videoCnt"
          style={{ width: "220px", height: "150px", textAlign: "center", border: "1px solid blue" }}
        >
          <div
            style={{
              width: "50px",
              height: "50px",
              backgroundColor: "gray",
              borderRadius: "50%",
              fontSize: "30px",
              lineHeight: "50px",
              margin: "50px auto 10px"
            }}
          >
            {name?.[0] ?? ""}
          </div>
          <span className="userName">{name}</span>
          <div className="micContainer">
            <img src={muted ? SubPrimeMicOff : SubPrimeMicOn} alt="Mic Icon" />
          </div>
        </div>
      )}
    </div>
  );
};

export default SubPrimeVideoCard;
