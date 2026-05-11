import React, { useEffect, useState } from 'react'
import LandingHeroImg from '../assets/LandingPageImg.svg';
import SecondLogo from '../assets/videoMeetingIcon.svg';
import AddBanner from '../assets/landingAddBanner.png';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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

                // Inside MainFrame component, replace the existing useState for show:
const location = useLocation();

useEffect(() => {
  const params = new URLSearchParams(location.search);
  if (params.get('openSignIn') === 'true') {
    setShow(true);
  }
}, [location.search]);


useEffect(() => {
 autoSignIn();
}, []);

 const [searchCode, setSearchCode] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);


  const handleSearch = (e) => {
    e.preventDefault();
    const code = searchCode.trim();
    if (code) navigate(`/room/${code}`);
  };

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setDropdownOpen(false);
    navigate('/');
  };

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '';

  const avatarColors = ['#004ECC','#0EA5E9','#8B5CF6','#EC4899','#10B981'];
  const avatarBg = user?.name
    ? avatarColors[user.name.charCodeAt(0) % avatarColors.length]
    : '#004ECC';



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


// function autoSignIn(){
// setShow(false)
//    const token = localStorage.getItem("token");

//   if (token) {
//     fetch(`${SIGNALING_SERVER}/autosignin`, {
//       headers: {
//         Authorization: `Bearer ${token}`
//       }
//     })
//       .then(res => res.json())
//       .then(data => {
//         if (data.success) {
//           setUser(data.user);
//         }
//       })
//       .catch((e) => {
//         console.log("error",e)
//         localStorage.removeItem("token");
//       });
//   }
// }
    

    //  const [name, setName] = useState('');
    //   const [roomId, setRoomId] = useState('');
   

    function autoSignIn() {
  setShow(false);
  const token = localStorage.getItem('token');
  if (token) {
    fetch(`${SIGNALING_SERVER}/autosignin`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUser(data.user);
          // ✅ After sign-in, redirect to join-room if roomId was in URL
          const params = new URLSearchParams(window.location.search);
          const pendingRoomId = params.get('roomId');
          if (pendingRoomId) {
            navigate(`/join-room?roomId=${pendingRoomId}`);
          }
        }
      })
      .catch(() => localStorage.removeItem('token'));
  }
}
   
   
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
    
    
//     <div>

//       <section className='headerSc'>
//         <div className="container-fluid">
//             <div className="row">
//               <div>
//                 <div className="headerMainCnt">
//                     <div className="logoCnt">
//                         <img src={LandingLogo} alt="Logo" />
//                     </div>
//                     <div className="searchLoginCnt">
//                         <div className='meetingCodeFinder'>
//                             <input type="text" placeholder='Enter Meeting Code' value={roomId} onChange={(e) => inputBtn(e.target.value)}/>
//                             {

//                               roomId.length===0?
                              
//                               <button><img src={SearchIcon} alt="" /></button>
// :

//                             <Link>Join</Link>
// }

        
//                         </div>
//                         {/* <button className='signInBtn'>Sign In</button> */}

// {user ? (

//    <div style={{
//             width:  44,
//             height:  44,
//             borderRadius: "50%", background:"#004ECC",
//             display: "flex", alignItems: "center", justifyContent: "center",
//             fontSize:16,
//             fontWeight: 700, color: "#fff",
//             fontFamily: "'DM Sans', sans-serif",
//             boxShadow: `0 0 24px #004ECC55`,
//           }}>
//            {user.name.charAt(0).toUpperCase()}
//           </div>
       
   
//   ) : 
  



//                         <div>
      // <Button variant="primary" className='signInBtn' onClick={() => setShow(true)}>
      //  Sign In
      // </Button>

//       <Offcanvas className='canvaWidth' show={show} onHide={() => setShow(false)} placement="end">
//         <Offcanvas.Header closeButton>
//           {/* <Offcanvas.Title>Menu</Offcanvas.Title> */}
//         </Offcanvas.Header>

//         <Offcanvas.Body>
//             {currentForm === "signin" ? (
//             <SignInForm onSwitch={setCurrentForm} autoSignIn={autoSignIn}/>
//           ) : (
//             <SignUpForm onSwitch={setCurrentForm} />
//           )}
//         </Offcanvas.Body>
//       </Offcanvas>
//     </div>
// }
//                     </div>
//                 </div>
//               </div>
//             </div>
//         </div>
//       </section>
//     </div>
    
  return (
    <div>

         <div>
      <section className='headerSc'>
        <div className="container-fluid">
          <div className="row">
            <div>
              <div className="headerMainCnt">

                {/* Logo */}
                <div className="logoCnt" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
                  <img src={LandingLogo} alt="Logo" />
                </div>

                {/* Right side */}
                <div className="searchLoginCnt">

                  {/* Meeting code search */}
                  <form className='meetingCodeFinder' onSubmit={handleSearch} style={{ display: 'flex' }}>
                    <input
                      type="text"
                      placeholder='Enter Meeting Code'
                      value={searchCode}
                      onChange={(e) => setSearchCode(e.target.value)}
                    />
                    <button type="submit"><img src={SearchIcon} alt="Search" /></button>
                  </form>

                  {user ? (
                    /* ── Logged-in nav ── */
                    <div style={styles.loggedInNav}>

                      {/* My Meetings button */}
                      <button
                        style={styles.myMeetingsBtn}
                        onClick={() => navigate('/my-meetings')}
                      >
                        <CalIcon />
                        <span>My Meetings</span>
                      </button>

                      {/* New Meeting button */}
                      {/* <button
                        style={styles.newMeetingBtn}
                        onClick={() => navigate('/create-room')}
                      >
                        + New
                      </button> */}

                      {/* Avatar dropdown */}
                      <div style={styles.avatarWrap}>
                        <div
                          style={{ ...styles.avatar, background: avatarBg }}
                          onClick={() => setDropdownOpen((v) => !v)}
                          title={user.name}
                        >
                          {initials}
                        </div>

                        {dropdownOpen && (
                          <>
                            {/* backdrop */}
                            <div
                              style={styles.backdrop}
                              onClick={() => setDropdownOpen(false)}
                            />
                            <div style={styles.dropdown}>
                              <div style={styles.dropdownHeader}>
                                <div style={{ ...styles.dropdownAvatar, background: avatarBg }}>
                                  {initials}
                                </div>
                                <div>
                                  <p style={styles.dropdownName}>{user.name}</p>
                                  <p style={styles.dropdownEmail}>{user.email}</p>
                                </div>
                              </div>
                              <div style={styles.dropdownDivider} />
                              <button
                                style={styles.dropdownItem}
                                onClick={() => { navigate('/my-meetings'); setDropdownOpen(false); }}
                              >
                                <CalIcon size={14} /> My Meetings
                              </button>
                              <button
                                style={styles.dropdownItem}
                                onClick={() => { navigate('/create-room'); setDropdownOpen(false); }}
                              >
                                <PlusIcon /> New Meeting
                              </button>
                              <div style={styles.dropdownDivider} />
                              <button
                                style={{ ...styles.dropdownItem, color: '#EF4444' }}
                                onClick={handleSignOut}
                              >
                                <SignOutIcon /> Sign Out
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* ── Logged-out ── */
                    // <LoginSideBar
                    //   name='signup'
                    //   onSignIn={() => {
                    //     /* re-read user after sign-in */
                    //     try {
                    //       const stored = localStorage.getItem('user');
                    //       setUser(stored ? JSON.parse(stored) : null);
                    //     } catch {}
                    //     window.dispatchEvent(new Event('user-login'));
                    //   }}
                    // />

                       <Button variant="primary" className='signInBtn' onClick={() => setShow(true)}>
       Sign In
      </Button>
                  )}
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
      <div className="modal" id="myModal">
  <div className="modal-dialog modal-dialog-centered">
    <div className="modal-content">

  
      <div className="modal-header">        
        <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
      </div>

      <div className="modal-body">
        <h4 className="modal-title">Meeting Code</h4>
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

/* ── Icons ───────────────────────────────────────────────────────────────────── */
const CalIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const SignOutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

/* ── Styles ──────────────────────────────────────────────────────────────────── */
const styles = {
  loggedInNav: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  myMeetingsBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: '#EFF6FF',
    color: '#004ECC',
    border: '1.5px solid #BFDBFE',
    borderRadius: 8,
    padding: '7px 14px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Montserrat, sans-serif',
    whiteSpace: 'nowrap',
  },
  newMeetingBtn: {
    background: '#004ECC',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Montserrat, sans-serif',
    whiteSpace: 'nowrap',
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    userSelect: 'none',
    fontFamily: 'Montserrat, sans-serif',
    flexShrink: 0,
  },
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 99,
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    background: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    minWidth: 220,
    zIndex: 100,
    overflow: 'hidden',
  },
  dropdownHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 16px',
    background: '#F9FAFB',
  },
  dropdownAvatar: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 700,
    fontSize: 14,
    flexShrink: 0,
    fontFamily: 'Montserrat, sans-serif',
  },
  dropdownName: {
    fontSize: 14,
    fontWeight: 700,
    color: '#111827',
    margin: 0,
    fontFamily: 'Montserrat, sans-serif',
  },
  dropdownEmail: {
    fontSize: 12,
    color: '#9CA3AF',
    margin: 0,
    fontFamily: 'Montserrat, sans-serif',
    maxWidth: 140,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  dropdownDivider: {
    height: 1,
    background: '#F3F4F6',
    margin: '4px 0',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '10px 16px',
    background: 'none',
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    cursor: 'pointer',
    fontFamily: 'Montserrat, sans-serif',
    textAlign: 'left',
  },
};

export default MainFrame
