import React from 'react'; 
import Header from './Header'; 
import HeroSec from './MainFrame';
import Footer from './Footer';
import "../SignInForm.css"
import "../MainFrame.css"
import "../Footer.css"
import "../Header.css"

const LandingPage = () => {
  return (
    <div>
      <Header/>
      <HeroSec/>
      <Footer/>
    </div>
  )
}

export default LandingPage
