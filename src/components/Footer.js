import React from 'react';
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <div>
      <section className='footerSc'>
        <div className="container-fluid">
            <div className="row">
                {/* <div className='footerMainCnt'>
                    <div className="importantLinksCnt">
                        <Link>About Us</Link>
                        <Link>Feedback</Link>
                        <Link>Privacy Policy</Link>
                        <Link>Report Issue</Link>
                    </div>
                    <div className='copyRights'>
                        <Link>Copyright © 2024 CMOTS Internet Technologies Pvt. Ltd. All Rights Reserved</Link>
                    </div>
                </div> */}
                <div>
                    <div className='footerMainCnt'>
                        <div className="importantLinksCnt">
                            <a href="">About Us</a>
                            <a href="">Feedback</a>
                            <a href="">Privacy Policy</a>
                            <a href="">Report Issue</a>
                        </div>
                        <div className='copyRights'>
                            <a href="">Copyright © 2024 CMOTS Internet Technologies Pvt. Ltd. All Rights Reserved</a>
                        </div>
                    </div>
                </div>                
            </div>
        </div>
      </section>
    </div>
  )
}

export default Footer
