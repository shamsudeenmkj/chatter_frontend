import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../sockets/socket";

const CreateRoom = () => {
  const [name, setName] = useState("");
  const [roomLink, setRoomLink] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();
    const socketRef = useSocket();   // ✅ use same socket everywhere



  const handleCreateRoom = () => {
    if (!name.trim()) return alert("Enter your name!");
    socketRef.current.emit("create-room", { name ,hasVideo:false,hasAudio:false}, (response) => {
  if (response.success) {
       const userData = { name,roomId: response.roomId };
     localStorage.setItem("user", JSON.stringify(userData));
    
        const link = `${window.location.origin}/room/${response.roomId}`;
        setRoomLink(link);
        setShowPopup(true);
  }
});

  };

  const handleCopy = () => {
    navigator.clipboard.writeText(roomLink);
    alert("Link copied to clipboard!");
  };

  const handleGoToRoom = () => {
    navigate(`/room/${roomLink.split("/room/")[1]}`);
  };

  return (
    <div className="create-room-container">
      <div className="form-box">
        <h1>Create a New Meeting</h1>
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button onClick={handleCreateRoom}>Create Room</button>
      </div>

      {showPopup && (
        <div className="popup-overlay">
          <div className="popup">
            <h2>Room Created 🎉</h2>
            <p>Share this link with others:</p>
            <input type="text" value={roomLink} readOnly />
            <div className="popup-buttons">
              <button className="copy-btn" onClick={handleCopy}>Copy Link</button>
              <button className="go-btn" onClick={handleGoToRoom}>Go to Room</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateRoom;
