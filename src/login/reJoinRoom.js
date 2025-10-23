import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../sockets/socket';

const ReJoinRoom = () => {
  const [name, setName] = useState('');
    const {getRoomId} = useParams();

  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();
    const socketRef = useSocket();   // ✅ use same socket everywhere

    useEffect(()=>{
        setRoomId(getRoomId)
    },[])


  const handleJoin = () => {
    if (name && roomId) {
        const userData = { name, roomId };

            socketRef.current.emit("login-room", { roomId }, (response) => {
  if (response.success) {
         localStorage.setItem("user", JSON.stringify(userData));
  navigate(`/room/${roomId}`)
  console.log("success")
  }else{
          alert('Room Unavailable');

  }
});
        

    } else {
      alert('Please enter your name and meet code.');
    }

};





 
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
      }}
    >
      <div
        
        style={{
          background: '#2c2c2c',
          padding: '30px',
          borderRadius: '15px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          width: '300px',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
        }}
      >
        <h2 style={{ textAlign: 'center' }}>Join Meeting</h2>

        <input
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            padding: '10px',
            borderRadius: '8px',
            border: 'none',
            outline: 'none',
            fontSize: '16px',
          }}
        />

        <input
          type="text"
          placeholder="Meet Code"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          style={{
            padding: '10px',
            borderRadius: '8px',
            border: 'none',
            outline: 'none',
            fontSize: '16px',
          }}
        />

        <button
       
       
         onClick={handleJoin}
          style={{
            padding: '12px',
            background: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          Join
        </button>

        
        <Link to="/create-room"
         
          style={{
            padding: '12px',
            background: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          Create
        </Link>
      </div>
    </div>
  );
};

export default ReJoinRoom;
