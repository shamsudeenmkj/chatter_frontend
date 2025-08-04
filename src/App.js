import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const SIGNALING_SERVER = 'http://localhost:8000';
const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

const App = () => {
  const [roomId] = useState('room1');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const localVideoRef = useRef();
  const socketRef = useRef();
  const localStreamRef = useRef();
  const peersRef = useRef({});

  useEffect(() => {
    socketRef.current = io(SIGNALING_SERVER);

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      socketRef.current.emit('join-room', roomId);

      socketRef.current.on('user-joined', userId => {
        const peer = createPeer(userId, true);
        peersRef.current[userId] = peer;


        if (!peer._tracksAdded) {
  stream.getTracks().forEach(track => {
      console.log(`ADDtrack triggered from ${track} ${stream}`);
    peer.addTrack(track, stream);
  });
  peer._tracksAdded = true;
}


        // stream.getTracks().forEach(track => {
        //        console.log(`ADDtrack triggered from ${track} ${stream}`);
        //   peer.addTrack(track, stream);
        // });
      });

      socketRef.current.on('signal', async ({ from, signal }) => {
        let peer = peersRef.current[from];
        if (!peer) {
          peer = createPeer(from, false);
          
          peersRef.current[from] = peer;
          
          // Add tracks only if not already added
         if (!peer._tracksAdded) {
  localStreamRef.current.getTracks().forEach(track => {
    peer.addTrack(track, localStreamRef.current);
  });
  peer._tracksAdded = true;
}

        }

        if (signal.type === 'offer' || signal.type === 'answer') {
          await peer.setRemoteDescription(new RTCSessionDescription(signal));
          if (signal.type === 'offer') {
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socketRef.current.emit('signal', {
              to: from,
              signal: answer
            });
          }
        } else if (signal.candidate) {
          try {
            await peer.addIceCandidate(new RTCIceCandidate(signal));
          } catch (e) {
            console.error('❌ Failed to add ICE candidate:', e);
          }
        }
      });

      socketRef.current.on('user-left', id => {
        if (peersRef.current[id]) {
          peersRef.current[id].close();
          delete peersRef.current[id];
        }
        const video = document.getElementById(id);
        if (video) video.remove();
      });
    }).catch(err => {
      alert('Camera/Mic Error: ' + err.message);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  // const createPeer = (userId, initiator) => {
  //   const peer = new RTCPeerConnection(ICE_SERVERS);

  //   peer.onicecandidate = event => {
  //     if (event.candidate) {
  //       socketRef.current.emit('signal', {
  //         to: userId,
  //         signal: event.candidate
  //       });
  //     }
  //   };

  //   console.log(`ontrack triggered from ${userId} ${peer.ontrack}`);

  //   peer.ontrack = e => {
  //     console.log(`🔁 ontrack triggered from ${userId}`, e.streams);
  //     if (!document.getElementById(userId)) {
  //       const video = document.createElement('video');
  //       video.srcObject = e.streams[0];
  //       video.autoplay = true;
  //       video.playsInline = true;
  //       video.id = userId;
  //       video.style.width = '45%';
  //       document.getElementById('remote-container').appendChild(video);
  //     }
  //   };

  //   if (initiator) {
  //     peer.createOffer()
  //       .then(offer => peer.setLocalDescription(offer))
  //       .then(() => {
  //         socketRef.current.emit('signal', {
  //           to: userId,
  //           signal: peer.localDescription
  //         });
  //       });
  //   }

  //   return peer;
  // };

const createPeer = (userId, initiator) => {
  const peer = new RTCPeerConnection(ICE_SERVERS);

  // 🧠 Must set before negotiation
  peer.ontrack = e => {
    console.log(`✅ ontrack triggered from ${userId}`, e.streams);
    const remoteStream = e.streams[0];

    let remoteVideo = document.getElementById(userId);
    if (!remoteVideo) {
      remoteVideo = document.createElement('video');
      remoteVideo.id = userId;
      remoteVideo.autoplay = true;
      remoteVideo.playsInline = true;
      remoteVideo.style.width = '45%';
      document.getElementById('remote-container').appendChild(remoteVideo);
    }
    remoteVideo.srcObject = remoteStream;
  };

  //  console.log(`✅ ontrack triggered from ${userId}`, peer.ontrack);

  peer.onicecandidate = e => {
    if (e.candidate) {
      socketRef.current.emit('signal', {
        to: userId,
        signal: e.candidate,
      });
    }
  };

  peer.onconnectionstatechange = () => {
    console.log(`📶 Connection state with ${userId}:`, peer.connectionState);
  };

  // 🎯 Only initiator creates offer
  if (initiator) {
    peer.createOffer()
      .then(offer => peer.setLocalDescription(offer))
      .then(() => {
        socketRef.current.emit('signal', {
          to: userId,
          signal: peer.localDescription,
        });
      });
  }

  return peer;
};


  const toggleAudio = () => {
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    }
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <h2>🔴 Team Video Call</h2>
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
