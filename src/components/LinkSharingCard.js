import React, { useEffect, useState } from 'react'
import LinkShareIcon from '../assets/LinkShareIcon.png';
import Separator from '../assets/separator.png';
import { useParams } from 'react-router-dom';

const LinkSharingCard = () => {
  const { roomId } = useParams();
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [copied, setCopied] = useState(false);

  /* ===============================
      LIVE CLOCK
  ================================*/
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      setCurrentTime(now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      }));

      setCurrentDate(now.toLocaleDateString("en-GB").replace(/\//g, "-"));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  /* ===============================
      COPY LINK
  ================================*/
  const handleCopyLink = (e) => {
    e.preventDefault();
    const link = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // reset after 2s
    });
  };

  return (
    <div>
      <div className="linkShareAndTimeSc">
        <div className="anchorLinkCnt">

          <a href="#" onClick={handleCopyLink} title="Copy meeting link">
            <div><img src={LinkShareIcon} alt="Link Icon" /></div>
          </a>

          <div className="imgCnt">
            <img src={Separator} alt="Separator Icon" />
          </div>

          <a href="#" onClick={handleCopyLink} title="Click to copy">
            {copied ? "Copied!" : (roomId || "loading...")}
          </a>

        </div>

        <div className="timeAndDateCnt">
          <p>{currentTime}</p>
          <p>{currentDate}</p>
        </div>
      </div>
    </div>
  );
};

export default LinkSharingCard;