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
import CreateMeeting from './components/CreateMeeting';
import MyMeetings from './components/MyMeetings';
import { Navigate, useParams } from 'react-router-dom';

const JoinRedirect = () => {
  const { roomId } = useParams();
  const token = localStorage.getItem('token');
  if (token) {
    return <Navigate to={`/join-room?roomId=${roomId}`} replace />;
  }
  return <Navigate to={`/?roomId=${roomId}&openSignIn=true`} replace />;
};

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
            {/* <Route path="/create-room" element={<CreateRoom />} /> */}
            <Route path="/join-room" element={<JoinRoom/>} />

            <Route path="/room/:roomId" element={<MeetingSection />} />
<Route path="/join/:roomId" element={<JoinRedirect />} />
           <Route path='/guest-login' element={<Login onJoin={handleJoin}/>}/>

<Route path="/create-room" element={<CreateMeeting/>} />
<Route path="/my-meetings" element={<MyMeetings />} />
          </Routes>
        </BrowserRouter>
      </div>
    </SocketProvider>
  );
};

export default App;

// Add this new component above the App component

