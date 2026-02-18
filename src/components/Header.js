import React from 'react'; 
import LandingLogo from '../assets/CMeetingLandingLogo.png';
import SearchIcon from '../assets/SearchIcon.svg';
import LoginBtn from './LoginSideBar';
import LoginSideBar from './LoginSideBar';
const Header = () => {
  return (
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
                            <input type="text" placeholder='Enter Meeting Code' />
                            <button><img src={SearchIcon} alt="" /></button>
                        </div>
                        {/* <button className='signInBtn'>Sign In</button> */}
                        <LoginSideBar name='signup'/>
                    </div>
                </div>
              </div>
            </div>
        </div>
      </section>
    </div>
  )
}

export default Header
