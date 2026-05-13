import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../sockets/socket';
import LandingLogo from '../assets/CMeetingLandingLogo.png';

const SIGNALING_SERVER = "https://chatter-backend-4i7g.onrender.com";
// const SIGNALING_SERVER = 'http://localhost:8000';

const GuestLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const socketRef = useSocket();

  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [nameError, setNameError] = useState('');
  const [roomError, setRoomError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('form'); // 'form' | 'waiting' | 'rejected'

  const loadingRef = useRef(false);
  const setLoadingBoth = (val) => { loadingRef.current = val; setLoading(val); };

  // Pre-fill roomId from ?roomId= query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const rid = params.get('roomId');
    if (rid) setRoomId(rid);
  }, [location.search]);

  /* ── Validation ─────────────────────────────────────────────────────────── */
  const validate = () => {
    let valid = true;
    setNameError('');
    setRoomError('');

    if (!name.trim()) {
      setNameError('Please enter your display name.');
      valid = false;
    } else if (name.trim().length < 2) {
      setNameError('Name must be at least 2 characters.');
      valid = false;
    }

    const code = roomId.trim();
    if (!code) {
      setRoomError('Please enter a room code or meeting link.');
      valid = false;
    } else {
      const parsed = code.includes('/room/')
        ? code.split('/room/')[1]?.trim()
        : code;
      if (!parsed || parsed.length < 4) {
        setRoomError('That doesn\'t look like a valid room code.');
        valid = false;
      }
    }

    return valid;
  };

  /* ── Wait for socket ─────────────────────────────────────────────────────── */
  const getSocket = () => new Promise((resolve, reject) => {
    const socket = socketRef.current;
    if (socket && socket.connected) { resolve(socket); return; }
    if (socket) {
      const timer = setTimeout(() => { socket.off('connect', onConnect); reject(new Error('timeout')); }, 5000);
      const onConnect = () => { clearTimeout(timer); resolve(socket); };
      socket.once('connect', onConnect);
      return;
    }
    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      const s = socketRef.current;
      if (s && s.connected) { clearInterval(poll); resolve(s); }
      else if (attempts > 50) { clearInterval(poll); reject(new Error('no socket')); }
    }, 100);
  });

  /* ── Cancel waiting ─────────────────────────────────────────────────────── */
  const handleCancel = () => {
    const socket = socketRef.current;
    if (socket) {
      socket.off('waiting-for-approval');
      socket.off('join-approved');
      socket.off('join-rejected');
      socket.off('all-users');
      socket.off('room-not-found');
    }
    setStep('form');
    setLoadingBoth(false);
  };

  /* ── Join ────────────────────────────────────────────────────────────────── */
  const handleJoin = async () => {
    if (!validate()) return;

    const guestName = name.trim();
    const rawRoom = roomId.trim();
    const resolvedRoomId = rawRoom.includes('/room/')
      ? rawRoom.split('/room/')[1].trim()
      : rawRoom;

    setLoadingBoth(true);
    setNameError('');
    setRoomError('');

    // NOTE: /check-room requires auth, so guests skip the HTTP pre-check.
    // The socket's 'room-not-found' event below handles invalid room codes.

    // 1. Store guest identity (no token — guest flag tells MeetingSection)
    localStorage.setItem('guest', JSON.stringify({ name: guestName, roomId: resolvedRoomId }));
    // Clear any stale regular user token so MeetingSection doesn't get confused
    // but keep it if already logged in (edge case: logged-in user using guest join)
    // We intentionally do NOT remove the token here

    // 3. Wait for socket
    let socket;
    try {
      socket = await getSocket();
    } catch {
      setRoomError('Not connected. Please refresh the page.');
      setLoadingBoth(false);
      return;
    }

    // Clean up any stale listeners
    socket.off('waiting-for-approval');
    socket.off('join-approved');
    socket.off('join-rejected');
    socket.off('all-users');
    socket.off('room-not-found');

    // 4. Emit join as guest
    socket.emit('join-room', {
      roomId: resolvedRoomId,
      name: guestName,
      muted: false,
      isGuest: true,
    });

    // 5. Handle responses
    socket.once('waiting-for-approval', () => {
      setLoadingBoth(false);
      setStep('waiting');
    });

    socket.once('join-approved', () => {
      setStep('form');
      navigate(`/room/${resolvedRoomId}`);
    });

    socket.once('join-rejected', () => {
      setLoadingBoth(false);
      setStep('rejected');
    });

    socket.once('all-users', () => {
      setStep('form');
      navigate(`/room/${resolvedRoomId}`);
    });

    socket.once('room-not-found', () => {
      setLoadingBoth(false);
      setRoomError('Room not found or has ended.');
    });

    // Fallback timeout using ref to avoid stale closure
    setTimeout(() => {
      if (loadingRef.current) {
        setLoadingBoth(false);
        setRoomError('Connection timed out. Please try again.');
        socket.off('waiting-for-approval');
        socket.off('join-approved');
        socket.off('join-rejected');
        socket.off('all-users');
        socket.off('room-not-found');
      }
    }, 10000);
  };

  /* ── Avatar initials helper ─────────────────────────────────────────────── */
  const getInitials = (n) =>
    n.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  /* ════════════════════════════════ RENDER ═══════════════════════════════════ */
  return (
    <div style={styles.root}>
      {/* ── Header ── */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <img
            src={LandingLogo}
            alt="Logo"
            style={{ height: 36, cursor: 'pointer' }}
            onClick={() => navigate('/')}
          />
          <button style={styles.signInLink} onClick={() => navigate('/?openSignIn=true')}>
            Have an account? <span style={{ color: '#004ECC', fontWeight: 700 }}>Sign In</span>
          </button>
        </div>
      </header>

      {/* ── Main card ── */}
      <main style={styles.main}>
        <div style={styles.card}>

          {/* ── Guest avatar illustration ── */}
          <div style={styles.avatarRing}>
            <div style={styles.avatarCircle}>
              {name.trim() ? (
                <span style={styles.avatarInitials}>{getInitials(name)}</span>
              ) : (
                <GuestSVG />
              )}
            </div>
            {/* Animated ring */}
            <div style={styles.ring1} />
            <div style={styles.ring2} />
          </div>

          {/* ── FORM STATE ── */}
          {step === 'form' && (
            <>
              <h1 style={styles.title}>Join as Guest</h1>
              <p style={styles.subtitle}>
                No account needed — just enter your name and the room code.
              </p>

              {/* Name field */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Your Name</label>
                <input
                  style={{ ...styles.input, ...(nameError ? styles.inputError : {}) }}
                  type="text"
                  placeholder="e.g. Alex Johnson"
                  value={name}
                  maxLength={40}
                  onChange={(e) => { setName(e.target.value); if (nameError) setNameError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  autoFocus
                />
                {nameError && <span style={styles.errorMsg}>⚠ {nameError}</span>}
              </div>

              {/* Room code field */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Room Code or Meeting Link</label>
                <input
                  style={{ ...styles.input, ...(roomError ? styles.inputError : {}) }}
                  type="text"
                  placeholder="e.g. abc123 or https://…/room/abc123"
                  value={roomId}
                  onChange={(e) => { setRoomId(e.target.value); if (roomError) setRoomError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                />
                {roomError && <span style={styles.errorMsg}>⚠ {roomError}</span>}
              </div>

              {/* Join button */}
              <button
                style={{ ...styles.joinBtn, opacity: loading ? 0.75 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                onClick={handleJoin}
                disabled={loading}
              >
                {loading ? (
                  <span style={styles.spinnerRow}>
                    <span style={styles.spinner} /> Joining…
                  </span>
                ) : (
                  'Join Meeting'
                )}
              </button>

              <p style={styles.disclaimer}>
                Joining as a guest means the host may need to admit you.
              </p>
            </>
          )}

          {/* ── WAITING STATE ── */}
          {step === 'waiting' && (
            <div style={styles.statusBlock}>
              <div style={styles.waitingSpinnerWrap}>
                <div style={styles.waitingSpinner} />
                <span style={{ fontSize: 28, position: 'absolute' }}>⏳</span>
              </div>
              <h2 style={styles.statusTitle}>Waiting for Host</h2>
              <p style={styles.statusSub}>
                You've been placed in the waiting room.<br />
                The host will admit you shortly.
              </p>
              <div style={styles.dotsRow}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ ...styles.dot, animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
              <div style={styles.roomBadge}>
                <span style={styles.roomBadgeLabel}>Room</span>
                <span style={styles.roomBadgeCode}>
                  {roomId.includes('/room/')
                    ? roomId.split('/room/')[1]?.trim()
                    : roomId.trim()}
                </span>
              </div>
              <button style={styles.cancelBtn} onClick={handleCancel}>
                Cancel
              </button>
            </div>
          )}

          {/* ── REJECTED STATE ── */}
          {step === 'rejected' && (
            <div style={styles.statusBlock}>
              <div style={styles.rejectedIcon}>🚫</div>
              <h2 style={styles.statusTitle}>Entry Denied</h2>
              <p style={styles.statusSub}>
                The host declined your request to join this meeting.
              </p>
              <div style={styles.rejectedBtns}>
                <button style={styles.cancelBtn} onClick={handleCancel}>
                  Go Back
                </button>
                <button
                  style={styles.retryBtn}
                  onClick={() => { setStep('form'); setTimeout(handleJoin, 50); }}
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

        </div>

        {/* ── Bottom link ── */}
        {step === 'form' && (
          <p style={styles.bottomNote}>
            Want full features?{' '}
            <span
              style={{ color: '#004ECC', fontWeight: 700, cursor: 'pointer' }}
              onClick={() => navigate('/?openSignIn=true')}
            >
              Create a free account
            </span>
          </p>
        )}
      </main>

      {/* ── Animations ── */}
      <style>{`
        @keyframes guestSpin { to { transform: rotate(360deg); } }
        @keyframes guestBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 1; }
          40% { transform: translateY(-8px); opacity: 0.5; }
        }
        @keyframes guestPulse {
          0%, 100% { transform: scale(1); opacity: 0.35; }
          50% { transform: scale(1.12); opacity: 0.15; }
        }
        @keyframes guestPulse2 {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.18); opacity: 0.08; }
        }
      `}</style>
    </div>
  );
};

/* ── Guest silhouette SVG ─────────────────────────────────────────────────── */
const GuestSVG = () => (
  <svg width="42" height="42" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M17.982 18.7247C17.2833 17.7996 16.3793 17.0493 15.3412 16.5331C14.3031 16.0168 13.1594 15.7487 12 15.7497C10.8407 15.7487 9.6969 16.0168 8.65883 16.5331C7.62077 17.0493 6.71675 17.7996 6.01801 18.7247M17.982 18.7247C19.3455 17.5119 20.3071 15.9133 20.7412 14.1408C21.1753 12.3683 21.0603 10.5058 20.4115 8.80018C19.7627 7.09457 18.6107 5.62648 17.1084 4.5906C15.6061 3.55472 13.8244 3 11.9995 3C10.1747 3 8.39295 3.55472 6.89062 4.5906C5.38829 5.62648 4.23634 7.09457 3.58755 8.80018C2.93875 10.5058 2.82376 12.3683 3.25783 14.1408C3.6919 15.9133 4.65451 17.5119 6.01801 18.7247M17.982 18.7247C16.336 20.1929 14.2056 21.0028 12 20.9997C9.79404 21.0031 7.66425 20.1931 6.01801 18.7247M15 9.74971C15 10.5454 14.6839 11.3084 14.1213 11.871C13.5587 12.4336 12.7957 12.7497 12 12.7497C11.2044 12.7497 10.4413 12.4336 9.87869 11.871C9.31608 11.3084 9.00001 10.5454 9.00001 9.74971C9.00001 8.95406 9.31608 8.19099 9.87869 7.62838C10.4413 7.06578 11.2044 6.74971 12 6.74971C12.7957 6.74971 13.5587 7.06578 14.1213 7.62838C14.6839 8.19099 15 8.95406 15 9.74971Z"
      stroke="#004ECC"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ── Styles ──────────────────────────────────────────────────────────────── */
const styles = {
  root: {
    minHeight: '100vh',
    background: '#F5F7FB',
    fontFamily: "'Montserrat', sans-serif",
    display: 'flex',
    flexDirection: 'column',
  },

  // Header
  header: {
    background: '#fff',
    borderBottom: '1px solid #E5E7EB',
    padding: '0 30px',
  },
  headerInner: {
    maxWidth: 1100,
    margin: '0 auto',
    height: 64,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  signInLink: {
    background: 'none',
    border: 'none',
    fontSize: 13,
    color: '#6B7280',
    cursor: 'pointer',
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: 500,
  },

  // Layout
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 16px 60px',
  },

  // Card
  card: {
    background: '#fff',
    borderRadius: 20,
    boxShadow: '0 4px 32px rgba(0,78,204,0.08)',
    border: '1px solid #E5E7EB',
    padding: '48px 44px 40px',
    width: '100%',
    maxWidth: 440,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },

  // Avatar
  avatarRing: {
    position: 'relative',
    width: 88,
    height: 88,
    marginBottom: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: '#EFF6FF',
    border: '2px solid #BFDBFE',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    position: 'relative',
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: 800,
    color: '#004ECC',
    letterSpacing: '-0.5px',
  },
  ring1: {
    position: 'absolute',
    inset: -6,
    borderRadius: '50%',
    border: '2px solid rgba(0,78,204,0.2)',
    animation: 'guestPulse 2.4s ease-in-out infinite',
  },
  ring2: {
    position: 'absolute',
    inset: -14,
    borderRadius: '50%',
    border: '2px solid rgba(0,78,204,0.1)',
    animation: 'guestPulse2 2.4s ease-in-out 0.4s infinite',
  },

  // Typography
  title: {
    fontSize: 24,
    fontWeight: 800,
    color: '#111827',
    margin: '0 0 8px',
    letterSpacing: '-0.4px',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    margin: '0 0 28px',
    textAlign: 'center',
    lineHeight: 1.6,
  },

  // Fields
  fieldGroup: {
    width: '100%',
    marginBottom: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 10,
    border: '1.5px solid #D1D5DB',
    fontSize: 14,
    fontFamily: "'Montserrat', sans-serif",
    color: '#111827',
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  },
  inputError: {
    borderColor: '#EF4444',
    background: '#FFF9F9',
  },
  errorMsg: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: 500,
  },

  // Join button
  joinBtn: {
    width: '100%',
    marginTop: 8,
    padding: '13px',
    background: '#004ECC',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    fontFamily: "'Montserrat', sans-serif",
    transition: 'background 0.15s',
  },
  spinnerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  spinner: {
    display: 'inline-block',
    width: 16,
    height: 16,
    borderRadius: '50%',
    border: '2.5px solid rgba(255,255,255,0.3)',
    borderTop: '2.5px solid #fff',
    animation: 'guestSpin 0.7s linear infinite',
  },
  disclaimer: {
    marginTop: 16,
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 1.5,
  },

  // Bottom note
  bottomNote: {
    marginTop: 20,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Status blocks (waiting / rejected)
  statusBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    padding: '8px 0',
    width: '100%',
    textAlign: 'center',
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: '#111827',
    margin: 0,
  },
  statusSub: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 1.7,
    margin: 0,
  },

  // Waiting spinner
  waitingSpinnerWrap: {
    position: 'relative',
    width: 72,
    height: 72,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingSpinner: {
    position: 'absolute',
    inset: 0,
    borderRadius: '50%',
    border: '4px solid rgba(0,78,204,0.12)',
    borderTop: '4px solid #004ECC',
    animation: 'guestSpin 1s linear infinite',
  },

  // Bounce dots
  dotsRow: {
    display: 'flex',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#004ECC',
    animation: 'guestBounce 1.2s ease-in-out infinite',
  },

  // Room badge
  roomBadge: {
    background: '#F5F7FB',
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    padding: '8px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  roomBadgeLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  roomBadgeCode: {
    fontSize: 14,
    fontWeight: 700,
    color: '#111827',
    fontFamily: 'monospace',
  },

  // Buttons
  cancelBtn: {
    background: 'none',
    border: '1.5px solid #E5E7EB',
    borderRadius: 8,
    padding: '9px 22px',
    fontSize: 13,
    fontWeight: 600,
    color: '#6B7280',
    cursor: 'pointer',
    fontFamily: "'Montserrat', sans-serif",
  },
  retryBtn: {
    background: '#004ECC',
    border: 'none',
    borderRadius: 8,
    padding: '9px 22px',
    fontSize: 13,
    fontWeight: 700,
    color: '#fff',
    cursor: 'pointer',
    fontFamily: "'Montserrat', sans-serif",
  },
  rejectedIcon: {
    fontSize: 48,
    lineHeight: 1,
  },
  rejectedBtns: {
    display: 'flex',
    gap: 10,
    marginTop: 4,
  },
};

export default GuestLogin;