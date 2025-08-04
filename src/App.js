// App.js
import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

// const SIGNALING_SERVER = 'http://localhost:8000';
const SIGNALING_SERVER = "https://chatter-frontend-hq9b.onrender.com/";
const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

const App = () => {
  const [roomId] = useState('room1');
  const localVideoRef = useRef();
  const socketRef = useRef();
  const localStreamRef = useRef();
  const peersRef = useRef({});

  useEffect(() => {
    socketRef.current = io(SIGNALING_SERVER);

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      localStreamRef.current = stream;
      localVideoRef.current.srcObject = stream;

      socketRef.current.emit('join-room', roomId);

      socketRef.current.on('user-joined', async (userId) => {
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
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

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
        remoteVideo.style.width = '45%';
        document.getElementById('remote-container').appendChild(remoteVideo);
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

  return (
    <div style={{ textAlign: 'center' }}>
      <h2>🔴 WebRTC Video Call</h2>
      <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '45%' }} />
      <div id="remote-container" style={{ marginTop: 20 }} />
    </div>
  );
};

export default App;
