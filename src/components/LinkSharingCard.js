import React from 'react'
import LinkShareIcon from '../assets/LinkShareIcon.png';
import Separator from '../assets/separator.png';
const LinkSharingCard = () => {
  return (
    <div>
      <div className="linkShareAndTimeSc">
        <div className="anchorLinkCnt">
          <a href="#"><div><img src={LinkShareIcon} alt="Link Icon" /></div></a>
          <div className="imgCnt">
            <img src={Separator} alt="Separator Icon" />
          </div>
          <a href="#">tcu-prwr-oua</a>
        </div>
        <div className="timeAndDateCnt">
          <p>3:06 AM</p>
          <p>11-08-2025</p>
        </div>
      </div>
    </div>
  )
}

export default LinkSharingCard
