import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './Login';
import VideoCall from './VideoCall';
import CreateRoom from './CreateRoom.js';
import { SocketProvider } from './socket.js';

const App = () => {
  const [user, setUser] = useState(null); // {name, roomId}

  const handleJoin = (name, roomId) => {
    setUser({ name, roomId });


  };

  return (
     <SocketProvider>
     
    <div style={{ height: '100vh', background: '#1e1e1e', color: 'white' }}>
      <BrowserRouter>
        <Routes>
          {/* Login Page */}
          <Route path="/" element={<Login onJoin={handleJoin} />} />

          {/* Create Room Page */}
          <Route path="/create-room" element={<CreateRoom />} />

          {/* Room Page (dynamic route) */}
          <Route path="/room/:roomId" element={<VideoCall user={user} />} />
        </Routes>
      </BrowserRouter>
    </div>
    </SocketProvider>
  );
};

export default App;
