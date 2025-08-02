import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SIGNALING_SERVER_URL = 'https://chatter-backend-4i7g.onrender.com'; // change to your server URL
const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

function App() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);

  const [roomId, setRoomId] = useState('testroom');

  useEffect(() => {
    // Setup socket
    socketRef.current = io(SIGNALING_SERVER_URL);

    socketRef.current.on('connect', async () => {
      console.log('Connected to signaling server');
      await startLocalStream();
      socketRef.current.emit('join-video-room', roomId);
    });

    socketRef.current.on('user-connected', async (userId) => {
      console.log('User connected:', userId);
      await createOffer(userId);
    });

    socketRef.current.on('receive-signal', async (data) => {
      const signal = data.signal;
      const from = data.from;

      if (signal.type === 'offer') {
        await handleOffer(signal, from);
      } else if (signal.type === 'answer') {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(signal));
      } else if (signal.candidate) {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    });

    return () => socketRef.current.disconnect();
  }, []);

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      localStreamRef.current = stream;
      localVideoRef.current.srcObject = stream;
    } catch (err) {
      console.error('Error accessing media devices.', err);
    }
  };

  const createOffer = async (toUserId) => {
    peerRef.current = new RTCPeerConnection(ICE_SERVERS);

    localStreamRef.current.getTracks().forEach((track) => {
      peerRef.current.addTrack(track, localStreamRef.current);
    });

    peerRef.current.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current.emit('send-signal', {
          to: toUserId,
          from: socketRef.current.id,
          signal: { candidate: e.candidate },
        });
      }
    };

    peerRef.current.ontrack = (e) => {
      remoteVideoRef.current.srcObject = e.streams[0];
    };

    const offer = await peerRef.current.createOffer();
    await peerRef.current.setLocalDescription(offer);

    socketRef.current.emit('send-signal', {
      to: toUserId,
      from: socketRef.current.id,
      signal: offer,
    });
  };

  const handleOffer = async (offer, fromUserId) => {
    peerRef.current = new RTCPeerConnection(ICE_SERVERS);

    localStreamRef.current.getTracks().forEach((track) => {
      peerRef.current.addTrack(track, localStreamRef.current);
    });

    peerRef.current.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current.emit('send-signal', {
          to: fromUserId,
          from: socketRef.current.id,
          signal: { candidate: e.candidate },
        });
      }
    };

    peerRef.current.ontrack = (e) => {
      remoteVideoRef.current.srcObject = e.streams[0];
    };

    await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerRef.current.createAnswer();
    await peerRef.current.setLocalDescription(answer);

    socketRef.current.emit('send-signal', {
      to: fromUserId,
      from: socketRef.current.id,
      signal: answer,
    });
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <h2>React WebRTC Video Call</h2>
      <div>
        <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '45%' }} />
        <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '45%' }} />
      </div>
    </div>
  );
}

export default App;
