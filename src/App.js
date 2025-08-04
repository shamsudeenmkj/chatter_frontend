import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SIGNALING_SERVER = 'https://chatter-backend-4i7g.onrender.com';
const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

const App = () => {
  const [roomId, setRoomId] = useState('room1');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const localVideoRef = useRef();
  const peersRef = useRef({});
  const socketRef = useRef();
  const localStreamRef = useRef();

  const remoteVideosRef = useRef({});

  useEffect(() => {
    socketRef.current = io(SIGNALING_SERVER);
  try{navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      socketRef.current.emit('join-room', roomId);

      socketRef.current.on('user-joined', async userId => {
        const peer = createPeer(userId);
        peersRef.current[userId] = peer;

        stream.getTracks().forEach(track => {
          peer.addTrack(track, stream);
        });
      });

      socketRef.current.on('signal', async ({ from, signal }) => {
        let peer = peersRef.current[from];
        if (!peer) {
          peer = addPeer(from);
          peersRef.current[from] = peer;

          stream.getTracks().forEach(track => {
            peer.addTrack(track, stream);
          });
        }

        await peer.setRemoteDescription(new RTCSessionDescription(signal));

        if (signal.type === 'offer') {
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          socketRef.current.emit('signal', {
            to: from,
            signal: peer.localDescription
          });
        }
      });

      socketRef.current.on('user-left', id => {
        if (peersRef.current[id]) {
          peersRef.current[id].close();
          delete peersRef.current[id];
        }
        delete remoteVideosRef.current[id];
        document.getElementById(id)?.remove();
      });
    });}
    catch(err){
 console.error('Error accessing media devices:', err.message);
    alert('Camera/Microphone not accessible: ' + err.message);
    }
  }, []);

  const createPeer = (userId) => {
    const peer = new RTCPeerConnection(ICE_SERVERS);

    peer.onicecandidate = e => {
      if (e.candidate) {
        socketRef.current.emit('signal', {
          to: userId,
          signal: e.candidate
        });
      }
    };

    peer.ontrack = e => {
      const video = document.createElement('video');
      video.srcObject = e.streams[0];
      video.autoplay = true;
      video.playsInline = true;
      video.id = userId;
      video.style.width = '45%';
      remoteVideosRef.current[userId] = video;
      document.getElementById('remote-container').appendChild(video);
    };

    peer.createOffer().then(offer => {
      peer.setLocalDescription(offer);
      socketRef.current.emit('signal', {
        to: userId,
        signal: offer
      });
    });

    return peer;
  };

  const addPeer = (userId) => {
    const peer = new RTCPeerConnection(ICE_SERVERS);

    peer.onicecandidate = e => {
      if (e.candidate) {
        socketRef.current.emit('signal', {
          to: userId,
          signal: e.candidate
        });
      }
    };

    peer.ontrack = e => {
      const video = document.createElement('video');
      video.srcObject = e.streams[0];
      video.autoplay = true;
      video.playsInline = true;
      video.id = userId;
      video.style.width = '45%';
      remoteVideosRef.current[userId] = video;
      document.getElementById('remote-container').appendChild(video);
    };

    return peer;
  };

  const toggleAudio = () => {
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
    setIsMuted(!audioTrack.enabled);
  };

  const toggleVideo = () => {
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
    setIsVideoOff(!videoTrack.enabled);
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <h2>Team Video Call App</h2>
      <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '45%' }} />
      <div id="remote-container" style={{ marginTop: 20 }} />
      <div style={{ marginTop: 20 }}>
        <button onClick={toggleAudio}>{isMuted ? 'Unmute' : 'Mute'}</button>
        <button onClick={toggleVideo}>{isVideoOff ? 'Turn Video On' : 'Turn Video Off'}</button>
      </div>
    </div>
  );
};

export default App;
