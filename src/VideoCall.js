import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { useSocket } from './socket';
import { useParams } from 'react-router-dom';

// const SIGNALING_SERVER = 'https://chatter-backend-4i7g.onrender.com';
// const SIGNALING_SERVER = 'http://localhost:8000/';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: "turn:relay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject"
    },
    {
      urls: "turn:relay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject"
    },
    {
      urls: "turn:relay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject"
    }
  ]
};

const VideoCall = () => {
  const {roomId} = useParams();
  const localVideoRef = useRef();
  const socketRef = useSocket();
  const localStreamRef = useRef();
  const peersRef = useRef({});
    const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  useEffect(() => {
    // socketRef.current = io(SIGNALING_SERVER);
  const storedUser = localStorage.getItem("user");
     const name=JSON.parse(storedUser).name;
    // if (storedUser) {
    //    if (paresedData.name) {
    //   // setUser(paresedData);
    //   // setName(paresedData.name)
    //   // joinRoom(paresedData.name);
    // }}
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Set local stream to main video initially
      const mainVideo = document.getElementById('main-video');
      if (mainVideo) {
        mainVideo.srcObject = stream;
      }

      socketRef.current.emit('join-room', roomId,name);

      socketRef.current.on('user-joined', (userId) => {
        const peer = createPeer(userId, true);
        peersRef.current[userId] = peer;

        stream.getTracks().forEach((track) => {
          peer.addTrack(track, stream);
          
        });
      });

      socketRef.current.on('signal', async ({ from, signal }) => {
        let peer = peersRef.current[from];
        if (!peer) {
          peer = createPeer(from, false);
          peersRef.current[from] = peer;
          
          stream.getTracks().forEach((track) => {
            peer.addTrack(track, stream);
          });
        }

        if (signal.type === 'offer' || signal.type === 'answer') {
          await peer.setRemoteDescription(new RTCSessionDescription(signal));
          if (signal.type === 'offer') {
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socketRef.current.emit('signal', { to: from, signal: peer.localDescription });
          }
        } else if (signal.candidate) {
          await peer.addIceCandidate(new RTCIceCandidate(signal));
        }
      });

      socketRef.current.on('user-left', (id) => {
        if (peersRef.current[id]) {
          peersRef.current[id].close();
          delete peersRef.current[id];
        }
        const video = document.getElementById(id);
        if (video) video.remove();
      });
      socketRef.current.on('audio-toggle', ({ userId, muted }) => {
  const label = document.getElementById(`audio-label-${userId}`);
  if (label) {
    label.textContent = muted ? '🔇 Muted' : '🎤 Unmuted';
  }
});

socketRef.current.on('video-toggle', ({ userId, videoOff }) => {
  const video = document.getElementById(userId);
  if (video) {
    video.style.opacity = videoOff ? '0.4' : '1';
  }
});

    })

    return () => {
      socketRef.current.disconnect();
    };
  }, []);
//commit
  const createPeer = (userId, initiator) => {
    const peer = new RTCPeerConnection(ICE_SERVERS);

    peer.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current.emit('signal', {
          to: userId,
          signal: e.candidate,
        });
      }
    };

    peer.ontrack = (e) => {
      let remoteVideo = document.getElementById(userId);
      if (!remoteVideo) {
         remoteVideo = document.createElement('video');
        remoteVideo.id = userId;
        remoteVideo.autoplay = true;
        remoteVideo.playsInline = true;
        remoteVideo.muted = false;
        remoteVideo.style.width = '100%';
        remoteVideo.style.borderRadius = '15px';
        remoteVideo.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
        remoteVideo.style.border = '2px solid #444';
        remoteVideo.style.marginBottom = '10px';
        document.getElementById('remote-container').appendChild(remoteVideo);

        remoteVideo.onclick = () => {
          const mainVideo = document.getElementById('main-video');
          if (mainVideo) {
            mainVideo.srcObject = remoteVideo.srcObject;
          }
        };

        const container = document.createElement('div');
container.style.position = 'relative';
container.style.width = '100%';

const label = document.createElement('div');
label.id = `audio-label-${userId}`;
label.style.position = 'absolute';
label.style.bottom = '10px';
label.style.left = '10px';
label.style.backgroundColor = 'rgba(0,0,0,0.6)';
label.style.color = 'white';
label.style.padding = '4px 8px';
label.style.borderRadius = '5px';
label.style.fontSize = '12px';
label.innerText = '🎤 Unmuted';

container.appendChild(remoteVideo);
container.appendChild(label);
document.getElementById('remote-container').appendChild(container);
      }
      remoteVideo.srcObject = e.streams[0];
    };

    if (initiator) {
      peer.onnegotiationneeded = async () => {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socketRef.current.emit('signal', {
          to: userId,
          signal: peer.localDescription,
        });
      };
    }

    return peer;
  };


    const toggleAudio = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
          socketRef.current.emit('audio-toggle', { roomId, muted: !audioTrack.enabled });

    }
  };





  const toggleVideo = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
          socketRef.current.emit('video-toggle', { roomId, videoOff: !videoTrack.enabled });

    }
  };

  return (
  <div
    style={{
      display: 'flex',
      flexDirection: window.innerWidth < 768 ? 'column' : 'row',
      height: '100vh',
      background: '#1e1e1e',
      color: 'white'
    }}
  >
    {/* Main Video Section */}
    <div
      style={{
        flex: 3,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: window.innerWidth < 768 ? '100%' : '75%',
        height: window.innerWidth < 768 ? '50%' : '100%',
      }}
    >
      <video
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        id="main-video"
        style={{
          width: '95%',
          height: '90%',
          objectFit: 'cover',
          borderRadius: '20px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)',
          border: '3px solid #444'
        }}
      />

      {/* Controls */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: window.innerWidth < 500 ? 'column' : 'row',
          gap: '10px',
          alignItems: 'center',
        }}
      >
        <button
          onClick={toggleAudio}
          style={{
            padding: '10px 20px',
            backgroundColor: isMuted ? '#f44336' : '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '25px',
            cursor: 'pointer',
            fontSize: '14px',
            width: window.innerWidth < 500 ? '80%' : 'auto'
          }}
        >
          {isMuted ? 'Unmute' : 'Mute'}
        </button>

        <button
          onClick={toggleVideo}
          style={{
            padding: '10px 20px',
            backgroundColor: isVideoOff ? '#f44336' : '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '25px',
            cursor: 'pointer',
            fontSize: '14px',
            width: window.innerWidth < 500 ? '80%' : 'auto'
          }}
        >
          {isVideoOff ? 'Turn On Video' : 'Turn Off Video'}
        </button>
      </div>
    </div>

    {/* Remote Video Section */}
    <div
      id="remote-container"
      style={{
        flex: 1,
        overflowX: window.innerWidth < 768 ? 'scroll' : 'hidden',
        overflowY: window.innerWidth < 768 ? 'hidden' : 'auto',
        padding: '10px',
        background: '#121212',
        display: 'flex',
        flexDirection: window.innerWidth < 768 ? 'row' : 'column',
        gap: '12px',
        borderTop: window.innerWidth < 768 ? '1px solid #333' : 'none',
        borderLeft: window.innerWidth < 768 ? 'none' : '1px solid #333',
        width: window.innerWidth < 768 ? '100%' : '25%',
        height: window.innerWidth < 768 ? '50%' : '100%',
      }}
    />
  </div>
);

};

export default VideoCall;
