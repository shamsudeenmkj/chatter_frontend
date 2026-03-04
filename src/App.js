import React, { useState } from 'react'
import './App.css';
import MeetingSection from './components/MeetingSection';
import { SocketProvider } from './sockets/socket';
import CreateRoom from './components/CreateMeeting';
import Login from './login/Login';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ReJoinRoom from './login/reJoinRoom';
import LandingPage from './components/LandingPage';
import LoginSideBar from './components/LoginSideBar';
import JoinRoom from './components/JoinRoom';

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
            <Route path="/" element={<LandingPage/>} />
            {/* <Route path="/" element={<Login onJoin={handleJoin} />} /> */}
            <Route path="/create-room" element={<CreateRoom />} />
            <Route path="/join-room" element={<JoinRoom/>} />

            <Route path="/room/:roomId" element={<MeetingSection />} />
            <Route path="/login/:getRoomId" element={<ReJoinRoom />} />

           <Route path='/guest-login' element={<Login onJoin={handleJoin}/>}/>
          </Routes>
        </BrowserRouter>
      </div>
    </SocketProvider>
  );
};

export default App;
