import React, { useState } from 'react'
import './App.css';
import MeetingSection from './components/MeetingSection';
import { SocketProvider } from './sockets/socket';
import { BrowserRouter, Route, Routes, Navigate, useParams, useSearchParams } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import JoinRoom from './components/JoinRoom';
import CreateMeeting from './components/CreateMeeting';
import MyMeetings from './components/MyMeetings';
import GuestLogin from './components/Guestlogin';
import MeetingDetails from './components/MeetingDetails';
import AdminPanel from './components/AdminPanel';

// ── Guard /admin — only signed-in admins may enter ─────────────────────────
const AdminGuard = () => {
  const token = localStorage.getItem('token');
  const userRaw = localStorage.getItem('user');
  if (!token) return <Navigate to="/" replace />;
  try {
    const user = JSON.parse(userRaw || '{}');
    if (!user.isAdmin) return <Navigate to="/" replace />;
  } catch {
    return <Navigate to="/" replace />;
  }
  return <AdminPanel />;
};

// Handles deep-link from Flutter: stores token then redirects
const AutoLogin = () => {
  const [params] = useSearchParams();
  const token    = params.get('token') || '';
  const redirect = params.get('redirect') || '/join-room';

  if (token) {
    // Validate token with server before storing, then redirect
    const SIGNALING_SERVER = 'https://chatter-backend-4i7g.onrender.com';
    fetch(`${SIGNALING_SERVER}/autosignin`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      })
      .catch(() => {})
      .finally(() => {
        // Always redirect — if token is bad they'll hit the login wall there
        window.location.replace(redirect);
      });
  } else {
    window.location.replace(redirect);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Montserrat, sans-serif', color: '#6B7280' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #E5E7EB', borderTop: '3px solid #004ECC', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ fontSize: 14 }}>Signing you in…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
};

const JoinRedirect = () => {
  const { roomId } = useParams();
  const token    = localStorage.getItem('token');
  const guestRaw = localStorage.getItem('guest');

  if (token) return <Navigate to={`/join-room?roomId=${roomId}`} replace />;
  if (guestRaw) {
    try {
      const guest = JSON.parse(guestRaw);
      if (guest.roomId === roomId) return <Navigate to={`/room/${roomId}`} replace />;
    } catch {}
  }
  return <Navigate to={`/guest-login?roomId=${roomId}`} replace />;
};
// ── Guard /room/:roomId — unauthenticated users go to join-room ───────────────
const RoomGuard = () => {
  const { roomId } = useParams();
  const token    = localStorage.getItem('token');
  const guestRaw = localStorage.getItem('guest');

  if (token) return <MeetingSection />;

  if (guestRaw) {
    try {
      const guest = JSON.parse(guestRaw);
      if (guest.roomId === roomId) return <MeetingSection />;
    } catch {}
  }

  return <Navigate to={`/guest-login?roomId=${roomId}`} replace />;
};
const App = () => (
  <SocketProvider>
    <div className="appRoot">
      <BrowserRouter>
        <Routes>
          <Route path="/"             element={<LandingPage />} />
          <Route path="/autologin"    element={<AutoLogin />} />   {/* ← NEW */}
          <Route path="/join-room"    element={<JoinRoom />} />
          <Route path="/room/:roomId" element={<RoomGuard />} />
          <Route path="/join/:roomId" element={<JoinRedirect />} />
          <Route path="/guest-login"  element={<GuestLogin />} />
          <Route path="/create-room"  element={<CreateMeeting />} />
          <Route path="/my-meetings"  element={<MyMeetings />} />
          <Route path="/meeting-details/:roomId"  element={<MeetingDetails />} />
          <Route path="/admin"  element={<AdminGuard />} />

          {/* /signup removed — registration is app-only */}
        </Routes>
      </BrowserRouter>
    </div>
  </SocketProvider>
);

export default App;