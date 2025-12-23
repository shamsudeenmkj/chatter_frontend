import React, { useEffect, useRef, useState } from 'react';
import expandIcon from '../assets/expandIcon.svg';
import MainMicOn from '../assets/micOpenIcon.svg';
import MainMicOff from '../assets/micCloseIcon.svg';
import MainCamOn from '../assets/videoOpenIcon.svg';
import MainCamOff from '../assets/videoCloseIcon.svg';
import screenShare from '../assets/screenShareIcon.svg';
import moreOption from '../assets/moreOptionIcon.svg';
import endVideo from '../assets/meetCloseIcon.svg';

const VideoCard = ({video,name,roomId,socketRef}) => {
  
  let [mainMic,setMic]=useState(true)
  let [mainCam,setCam]=useState(true)

 

  const videoElementRef = useRef(null);

  useEffect(() => {
    if (video && videoElementRef.current) {
      videoElementRef.current.srcObject = video;
    }
      setCam(video!==null)
    
  }, [video]);


  const toggleVideo = () => {

    console.log("video -->",video,mainCam)

    const stream = videoElementRef.current?.srcObject;
 
  if (stream && stream.getVideoTracks) {
   
    stream.getVideoTracks().forEach(track => {
      
      track.enabled = !track.enabled; // toggle camera on/off
                socketRef.current.emit('video-toggle', { roomId, videoOff: !track.enabled });

    });
    setCam(prev =>!prev);
  }
};
const toggleAudio = () => {
  const stream = videoElementRef.current?.srcObject;
     console.log("mic tiggle 1 : ",stream)
  if (stream && stream.getAudioTracks) {
      console.log("mic tiggle 2 : ",stream.getAudioTracks)
    stream.getAudioTracks().forEach(track => {
       console.log("mic tiggle 3 : ",track)
      track.enabled = !track.enabled; // toggle mute/unmute
      socketRef.current.emit('audio-toggle', { roomId, muted: !track.enabled });
    });
    
    setMic(prev => !prev);
  }
};


  //     const toggleAudio = () => {
  //   const audioTrack = videoElementRef.current?.getAudioTracks()[0];
  //   if (audioTrack) {
  //     audioTrack.enabled = !audioTrack.enabled;
  //     setMic(!audioTrack.enabled);
  //         videoElementRef.current.emit('audio-toggle', { roomId, muted: !audioTrack.enabled });

  //   }
  // };

  // const toggleVideo = () => {
  //   const videoTrack = videoElementRef.current?.getVideoTracks()[0];
  //   if (videoTrack) {
  //     videoTrack.enabled = !videoTrack.enabled;
  //     setCam(!videoTrack.enabled);
  //         videoElementRef.current.emit('video-toggle', { roomId, videoOff: !videoTrack.enabled });

  //   }
  // };

  console.log("name",name)

  return (
    <div>
      <div className='videoCnt'>
        <div className='hostScreen'>
      {video?
     <video
        ref={videoElementRef}
        autoPlay
        playsInline
       alt="host Display" className='PrimeVideoDisplay'
      />: <div 
      
       alt="host Display" className='PrimeVideoDisplay' style={{display:"flex",justifyContent:"center",alignItems:"center",border:"2px solid gray"}}>

        <div style={{width:"200px",height:"200px",backgroundColor:"gray",borderRadius:"50%",fontSize:"100px",textAlign:"center"}}>

          {
            name[0]??""
          }

        </div>
        
      </div>
      
      }
          
            {/* <img src={videoImage} alt="host Display" className='PrimeVideoDisplay' /> */}
            <p className='mainStreamerName'>{name}</p>
        <div className='expandIconCnt'>
            <img src={expandIcon} alt="Expand Icon" />
        </div>
        <div className='primaryHostIcons'>
            <div className="hostmicCnt commonHostIcons" onClick={toggleAudio}>
                <img src={mainMic?MainMicOn:MainMicOff} alt="Mic On and Off Icon" />
            </div>
            <div className="hostCamCnt commonHostIcons" onClick={toggleVideo}>
                <img src={mainCam?MainCamOn:MainCamOff} alt="Cam On and Off Icon" />
            </div>
            <div className="hostScrShareCnt commonHostIcons">
                <img src={screenShare} alt="Screen Share Icon" />
            </div>
            <div className="hostMoreOptionCnt commonHostIcons">
                <img src={moreOption} alt="More Option Icon" />
            </div>
            <div className="hostEndCnt commonHostIcons" onClick={()=>{ }}>
                <img src={endVideo} alt="Close Btn Icon" />
            </div>
        </div>
        </div>
        
      </div>
    </div>
  )
}

export default VideoCard
