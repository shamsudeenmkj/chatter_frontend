import { useLocation, useNavigate } from 'react-router-dom';
import LandingLogo from '../assets/CMeetingLandingLogo.png';
import Footer from './Footer';
import CopyIcon from '../assets/copyIcon.svg';
import { useEffect, useRef, useState } from 'react';
import MainMicOff from "../assets/micCloseIcon.svg";
import MainCamOff from "../assets/videoCloseIcon.svg";
import DummyCam from '../assets/dummyCam Image.svg';
import NavMicOpen from '../assets/micOpenIcon.svg';
import { useSocket } from '../sockets/socket';


// const SIGNALING_SERVER = 'http://localhost:8000';
const SIGNALING_SERVER = "https://chatter-backend-4i7g.onrender.com";


const CreateMeeting = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const socketRef = useSocket();

  const localStreamRef = useRef(null);

  const [roomLink, setRoomLink] = useState("");
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamMuted, setIsCamMuted] = useState(false);
  const [user, setUser] = useState(null);

  /* ===============================
      INITIAL LOAD
  ================================*/
  useEffect(() => {
    autoSignIn();
    startPreview();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  /* ===============================
      AUTO SIGN IN
  ================================*/
  function autoSignIn() {
    const token = localStorage.getItem("token");

    if (!token) return;

    fetch(`${SIGNALING_SERVER}/autosignin`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {

       
        if (data.success) {
          setUser(data.user);
         
        }
      })
      .catch(() => {
        localStorage.removeItem("token");
      });
  }

  /* ===============================
      START CAMERA PREVIEW
  ================================*/
  const startPreview = async () => {
  try {
    // Try both first
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    attachStream(stream);

  } catch (err) {

    console.log("Full media failed:", err);

    try {
      // Try audio only
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      attachStream(audioStream);
      setIsCamMuted(true);

    } catch {

      try {
        // Try video only
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: true
        });

        attachStream(videoStream);
        setIsMicMuted(true);

      } catch {

        console.log("No media devices available");

        // No camera & no mic
        setIsMicMuted(true);
        setIsCamMuted(true);
      }
    }
  }
};

const attachStream = (stream) => {
  const video = document.getElementById("previewVideo");
  if (video) video.srcObject = stream;
  localStreamRef.current = stream;
};

  /* ===============================
      CREATE ROOM
  ================================*/
  const handleCreateRoom = (currentUser) => {
    if (!socketRef.current) return;

    socketRef.current.emit(
      "create-room",
      {
        name: currentUser.name,
        hasVideo: !isCamMuted,
        hasAudio: !isMicMuted
      },
      (response) => {

        if (response.success) {
          const link = `${window.location.origin}/room/${response.roomId}`;
          setRoomLink(link);
        }
      }
    );
  };

  /* ===============================
      MIC TOGGLE
  ================================*/
  const handleMicToggle = () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    audioTrack.enabled = !audioTrack.enabled;

    const newMutedState = !audioTrack.enabled;
    setIsMicMuted(newMutedState);
  };

  /* ===============================
      CAMERA TOGGLE
  ================================*/
  const handleCamToggle = () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    videoTrack.enabled = !videoTrack.enabled;

    const newCamState = !videoTrack.enabled;
    setIsCamMuted(newCamState);
  };

  /* ===============================
      START MEETING
  ================================*/
  const handleGoToRoom = () => {
    if (!roomLink) return;

    navigate(`/room/${roomLink.split("/room/")[1]}`, {
      state: {
        name: user?.name,
        isMicMuted,
        isCamMuted
      }
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(roomLink);
    alert("Link copied to clipboard!");
  };

  return (
    <div>
      <section className='headerSc'>
        <div className="container-fluid">
          <div className="headerMainCnt">
            <div className="logoCnt">
              <img src={LandingLogo} alt="Logo" />
            </div>

            <div className="searchLoginCnt">
              {user && (
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "#004ECC",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#fff"
                }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className='createNewMeetingSc'>
        <div className='container-fluid'>
          <div className='row'>
            <div className='col-md-6 col-lg-7 col-xl-7 col-xxl-7'>
              <div className='CreateVideoCnt'>
                <h4>Create New Meeting</h4>

                <video
                  id="previewVideo"
                  autoPlay
                  muted
                  playsInline
                  style={{ width: "50vw", height: "60vh", background: "black" }}
                />

                <div className='row'>
                <div className='micAndVideoCnt'>
                    <div className='micAndVideoBackShadow' onClick={handleMicToggle} style={{ cursor: "pointer" }}>
                    <img src={isMicMuted ? MainMicOff : NavMicOpen} alt="Mic" />
                  </div>

                  <div className='micAndVideoBackShadow' onClick={handleCamToggle} style={{ cursor: "pointer" }}>
                    <img src={isCamMuted ? MainCamOff : DummyCam} alt="Cam" />
                  </div>
                </div>                  

                </div>
              </div>
            </div>

            <div className='col-md-6 col-lg-5 col-xl-5 col-xxl-5'>
              <div className='createMeetingLinkCnt'>


                {
                    roomLink?
               
                    
               <>   
               
                 <h4>Copy Meeting Link</h4>

                <div className="meetingCodeFinder modalJoinBtn">
                  <input type="text" value={roomLink} disabled />
                  <button onClick={handleCopy}>
                    Copy <img src={CopyIcon} alt='Copy Icon' />
                  </button>
                </div>
                
           
            
            <div className='startMeetingBtnCnt'>
               <button className="createStartMeetingBtn" onClick={handleGoToRoom}>
                 Start Meeting
               </button>
             </div>
                </>
             
             
             :


<>
                                <h4>Confirm The Mic and Camera Availabiity</h4>


               <div className='startMeetingBtnCnt'>
                  <button className="createStartMeetingBtn" onClick={ ()=>{handleCreateRoom(user)}}>
Create Meeting                  </button>
                </div>

                </>
                
            }



              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CreateMeeting;