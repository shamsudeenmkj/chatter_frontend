// SocketContext.js
import React, { createContext, useContext, useRef, useEffect } from "react";
import io from "socket.io-client";

const SocketContext = createContext(null);
const SIGNALING_SERVER = "https://chatter-backend-4i7g.onrender.com";
// const SIGNALING_SERVER = 'http://localhost:8000/';

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);

  useEffect(() => {
    const token    = localStorage.getItem("token");
    const guestRaw = localStorage.getItem("guest");

    // ✅ FIX 1: Read guestName safely — GuestLogin stores it before navigating
    // but the SocketProvider mounts once on app load (before guest data exists),
    // so we must re-read localStorage at connection time, not at render time.
    let guestName = "Guest";
    if (!token && guestRaw) {
      try { guestName = JSON.parse(guestRaw).name || "Guest"; } catch { /* keep default */ }
    }

    const authPayload = token
      ? { token, clientType: "react" }
      : { isGuest: true, guestName };

    socketRef.current = io(SIGNALING_SERVER, {
      auth: authPayload,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on("connect_error", (err) => {
      console.warn("[Socket] connect_error:", err.message);
    });

    // ✅ FIX 2: Rejoin the public room after every reconnect.
    // The backend auto-joins on 'connection', but after a socket reconnect
    // the server fires 'connection' again — however the client must also
    // re-emit presence:join so the server re-runs the room join logic.
    // Simplest fix: emit a dedicated re-join on every 'connect' event.
    socket.on("connect", () => {
      socket.emit("room:join", { room: "public" });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socketRef}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);