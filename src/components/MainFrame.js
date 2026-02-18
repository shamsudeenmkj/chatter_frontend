import React, { useState } from 'react'
import LandingHeroImg from '../assets/LandingPageImg.svg';
import SecondLogo from '../assets/videoMeetingIcon.svg';
import AddBanner from '../assets/landingAddBanner.png';
import { Link } from 'react-router-dom';
import { Offcanvas, Button } from "react-bootstrap";
import SignInForm from './SignInForm';
import SignUpForm from './SignUpForm';
const MainFrame = () => {

      const [show, setShow] = useState(false);
      // New
      const [currentForm,setCurrentForm] = useState("signin");
    

    //  const [name, setName] = useState('');
    //   const [roomId, setRoomId] = useState('');
    //   const navigate = useNavigate();
    //     const socketRef = useSocket();   // ✅ use same socket everywhere
    
    
    //   const handleJoin = () => {
    //     if (name && roomId) {
    //         const userData = { name, roomId };
    
    //             socketRef.current.emit("login-room", { roomId }, (response) => {
    //   if (response.success) {
    //          localStorage.setItem("user", JSON.stringify(userData));
    //   navigate(`/room/${roomId}`)
    //   console.log("success")
    //   }else{
    //           alert('Invalid Room Id');
    
    //   }
    // });
            
    
    //     } else {
    //       alert('Please enter your name and meet code.');
    //     }
    
    // };
    
    
    
    
  return (
    <div>
      <section className='mainFrameSc'>
        <div className="container-fluid">
            <div className="row">
                <div className='col-12 col-sm-12 col-md-6 col-lg-6 col-xl-6 col-xxl-6'>
                    <div className='heroTitle'>
                        <h2>Empowering Teams to <span>Meet Smarter.</span></h2>
                        <p className='col-xl-10'>Seamless Collaboration: Share files, notes, and updates in real-time for greater team alignment.</p>
                        <div className="joinAndCreateBtn">

   <Button variant="primary" className='joinMBtn' onClick={() => setShow(false)}>
        Join Meeting
      </Button>

      


      <Offcanvas className='canvaWidth' show={show} onHide={() => setShow(false)} placement="end">
        <Offcanvas.Header closeButton>
          {/* <Offcanvas.Title>Menu</Offcanvas.Title> */}
        </Offcanvas.Header>

        <Offcanvas.Body>
            {currentForm === "signin" ? (
            <SignInForm onSwitch={setCurrentForm} />
          ) : (
            <SignUpForm onSwitch={setCurrentForm} />
          )}
        </Offcanvas.Body>
      </Offcanvas>

                            
                            <button className='createmBtn'>
                                <Link to="/create-room">
                                
                                Create Meeting
                                </Link>
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
