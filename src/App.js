import React, { useState } from 'react'
import './App.css';
import MeetingSection from './components/MeetingSection';
import { SocketProvider } from './sockets/socket';
import CreateRoom from './login/CreateRoom';
import Login from './login/Login';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ReJoinRoom from './login/reJoinRoom';

const App = () => {
  const [user, setUser] = useState(null);

  const handleJoin = (name, roomId) => {
    setUser({ name, roomId });
  };

  return (
    <SocketProvider>
      <div className="appRoot">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login onJoin={handleJoin} />} />
            <Route path="/create-room" element={<CreateRoom />} />
            <Route path="/room/:roomId" element={<MeetingSection />} />
            <Route path="/login/:getRoomId" element={<ReJoinRoom />} />
          </Routes>
        </BrowserRouter>
      </div>
    </SocketProvider>
  );
};

export default App;
