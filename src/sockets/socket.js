// SocketContext.js
import React, { createContext, useContext, useRef, useEffect } from "react";
import io from "socket.io-client";

const SocketContext = createContext(null);
// const SIGNALING_SERVER = "https://chatter-backend-4i7g.onrender.com";
const SIGNALING_SERVER = 'http://localhost:8000/';


export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(SIGNALING_SERVER);

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socketRef}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
