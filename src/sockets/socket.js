// SocketContext.js
import React, { createContext, useContext, useRef, useEffect } from "react";
import io from "socket.io-client";

const SocketContext = createContext(null);
const SIGNALING_SERVER = "https://chatter-backend-4i7g.onrender.com";
// const SIGNALING_SERVER = 'http://localhost:8000/';

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const guestRaw = localStorage.getItem("guest");

    // Logged-in users pass their JWT. Guests pass isGuest flag so the
    // backend middleware can let them through without a token.
    const authPayload = token
      ? { token }
      : guestRaw
      ? { isGuest: true, guestName: (() => { try { return JSON.parse(guestRaw).name; } catch { return "Guest"; } })() }
      : { isGuest: true };

    socketRef.current = io(SIGNALING_SERVER, {
      auth: authPayload,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.on("connect_error", (err) => {
      console.warn("[Socket] connect_error:", err.message);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socketRef}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);