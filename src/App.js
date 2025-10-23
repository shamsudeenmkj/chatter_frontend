import React, { useState } from 'react'
import './App.css';
import MeetingSection from './components/MeetingSection';
import { SocketProvider } from './sockets/socket';
import CreateRoom from './login/CreateRoom';
import Login from './login/Login';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ReJoinRoom from './login/reJoinRoom';



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
          <Route path="/room/:roomId" element={<MeetingSection/>} />
                    <Route path="/login/:getRoomId" element={<ReJoinRoom/>} />

        </Routes>
      </BrowserRouter>
    </div>
    </SocketProvider>
  );
};





export default App
