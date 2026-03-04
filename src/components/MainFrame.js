import React, { useEffect, useState } from 'react'
import LandingHeroImg from '../assets/LandingPageImg.svg';
import SecondLogo from '../assets/videoMeetingIcon.svg';
import AddBanner from '../assets/landingAddBanner.png';
import { Link, useNavigate } from 'react-router-dom';
import { Offcanvas, Button } from "react-bootstrap";
import SignInForm from './SignInForm';
import SignUpForm from './SignUpForm';
import { useSocket } from '../sockets/socket';
import LoginSideBar from './LoginSideBar';


import LandingLogo from '../assets/CMeetingLandingLogo.png';
import SearchIcon from '../assets/SearchIcon.svg';


// const SIGNALING_SERVER = 'http://localhost:8000';
const SIGNALING_SERVER = "https://chatter-backend-4i7g.onrender.com";



const MainFrame = () => {

      const [show, setShow] = useState(false);

      const [showPop,setShowPop]=useState(false)
      // New
      const [currentForm,setCurrentForm] = useState("signin");


        const [user, setUser] = useState(null);

        const [roomId,setRoomId]=useState("")
                const [popRoomId,setPopRoomId]=useState("")


useEffect(() => {
 autoSignIn();
}, []);


function inputBtn(value){


  const token = localStorage.getItem("token");    
  
  if(value && token){

    setRoomId(value)

  }else{
      if(!token){

        setShow(true)
      }
      setRoomId("")
  }


}


function autoSignIn(){
setShow(false)
   const token = localStorage.getItem("token");

  if (token) {
    fetch(`${SIGNALING_SERVER}/autosignin`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUser(data.user);
        }
      })
      .catch((e) => {
        console.log("error",e)
        localStorage.removeItem("token");
      });
  }
}
    

    //  const [name, setName] = useState('');
    //   const [roomId, setRoomId] = useState('');
      const navigate = useNavigate();
        const socketRef = useSocket();   // ✅ use same socket everywhere
    
    
      const handleJoin=() => {
        setShowPop(false)
const token = localStorage.getItem("token");
        if(token){

        
        
        if (popRoomId && popRoomId.length===6) {
         
    
                socketRef.current.emit("login-room", {roomId: popRoomId }, (response) => {
                    console.log("response",response)
      if (response.success) {
        
navigate(`/room/${popRoomId}`, { state: { name: user.name } });
setShowPop(true)
      console.log("success")
      }else{
              alert("Room Id doesn't exist");
    
      }
    });
            
    
        } else {
              alert('Invalid Room Id');
        }

      }else{
    setShow(true)
      }
    
    };
    
    
    
    
  return (
    <div>
       <div>

      <section className='headerSc'>
        <div className="container-fluid">
            <div className="row">
              <div>
                <div className="headerMainCnt">
                    <div className="logoCnt">
                        <img src={LandingLogo} alt="Logo" />
                    </div>
                    <div className="searchLoginCnt">
                        <div className='meetingCodeFinder'>
                            <input type="text" placeholder='Enter Meeting Code' value={roomId} onChange={(e) => inputBtn(e.target.value)}/>
                            {

                              roomId.length===0?
                              
                              <button><img src={SearchIcon} alt="" /></button>
:

                            <Link>Join</Link>
}

        
                        </div>
                        {/* <button className='signInBtn'>Sign In</button> */}

{user ? (

   <div style={{
            width:  44,
            height:  44,
            borderRadius: "50%", background:"#004ECC",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize:16,
            fontWeight: 700, color: "#fff",
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: `0 0 24px #004ECC55`,
          }}>
           {user.name.charAt(0).toUpperCase()}
          </div>
       
   
  ) : 
  



                        <div>
      <Button variant="primary" className='signInBtn' onClick={() => setShow(true)}>
       Sign In
      </Button>

      <Offcanvas className='canvaWidth' show={show} onHide={() => setShow(false)} placement="end">
        <Offcanvas.Header closeButton>
          {/* <Offcanvas.Title>Menu</Offcanvas.Title> */}
        </Offcanvas.Header>

        <Offcanvas.Body>
            {currentForm === "signin" ? (
            <SignInForm onSwitch={setCurrentForm} autoSignIn={autoSignIn}/>
          ) : (
            <SignUpForm onSwitch={setCurrentForm} />
          )}
        </Offcanvas.Body>
      </Offcanvas>
    </div>
}
                    </div>
                </div>
              </div>
            </div>
        </div>
      </section>
    </div>
        
 
      <section className='mainFrameSc'>
        <div className="container-fluid">
            <div className="row">
                <div className='col-12 col-sm-12 col-md-6 col-lg-6 col-xl-6 col-xxl-6'>
                    <div className='heroTitle'>
                        <h2>Empowering Teams to <span>Meet Smarter.</span></h2>
                        <p className='col-xl-10'>Seamless Collaboration: Share files, notes, and updates in real-time for greater team alignment.</p>
                        
                        
                    
                        
                        <div className="joinAndCreateBtn">

   <Button variant="primary" className='joinMBtn' type="button" onClick={()=>{if(!user){setShow(true)}else{navigate("/join-room")}}}>
        Join Meeting
      </Button>
      <div class="modal" id="myModal">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">

  
      <div class="modal-header">        
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>

      <div class="modal-body">
        <h4 class="modal-title">Meeting Code</h4>
             <div className='meetingCodeFinder modalJoinBtn'>
                            <input type="text" placeholder='Enter Meeting Code' value={popRoomId} onChange={(e) => setPopRoomId(e.target.value)}/>
                           

                             <Button variant="primary" data-bs-dismiss="modal"  onClick={handleJoin} className='joinMBtn' type="button" data-bs-toggle="modal" data-bs-target="#myModal">
        Join
      </Button>

        
                        </div>

      </div>

    </div>
  </div>
</div>


      <Offcanvas className='canvaWidth' show={show} onHide={() => setShow(false)} placement="end">
        <Offcanvas.Header closeButton>
          {/* <Offcanvas.Title>Menu</Offcanvas.Title> */}
        </Offcanvas.Header>

        <Offcanvas.Body>
            {currentForm === "signin" ? (
            <SignInForm onSwitch={setCurrentForm} autoSignIn={autoSignIn}/>
          ) : (
            <SignUpForm onSwitch={setCurrentForm} />
          )}
        </Offcanvas.Body>
      </Offcanvas>

                            
                            <button className='createmBtn' onClick={()=>{

                              if(user){
                                navigate("/create-room", { state: { user,} })
                              }else{
                                setShow(true)
                              }
                            }}>
                               
                                
                                Create Meeting
                             
                                </button>
                        </div>
                    </div>
                </div>
                <div className='col-12 col-sm-12 col-md-6 col-lg-6 col-xl-6 col-xxl-6'>
                    <div className="landingImgCnt">
                        <img src={LandingHeroImg} alt="Landing Hero Image" className='img-fluid' />
                    </div>
                </div>
            </div>
        </div>
      </section>
      <section className='secondaryLogoSc'>
        <div className="container-fluid">
            <div className="row">
                <div className="secondLogoImgCnt">
                    <img src={SecondLogo} alt="Secondary Logo" className='img-fluid'/>
                </div>
            </div>
        </div>
      </section>
      <section className='landingAddBannerSc'>
        <div className="container-fluid">
            <div className="row">
                <div className="addBannerCnt">
                    <img src={AddBanner} alt="Add Banner" className='img-fluid' />
                </div>
            </div>
        </div>
      </section>
    </div>
  )
}

export default MainFrame
