import React, { useState } from 'react'
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import ChatProfileImg from '../assets/participantChatProfile.png';
import DocAttachIcon from '../assets/docAttachmentIcon.svg';
import SentBtn from '../assets/msgSendIcons.svg';
import SanjanaProfile from '../assets/sanjana.png';
import KamalProfile from '../assets/kamal.png';
import ShamProfile from '../assets/sham.png';
import UserMicOn from '../assets/userMicOn.png';
import UserMicOff from '../assets/userMicOff.png';
import UserCamOn from '../assets/userCamOn.png';
import UserCamOff from '../assets/userCamOff.png';
import UserMoreIcon from '../assets/userMoreIcon.png';
import PollImage from '../assets/pollImage.png';
// import 'react-chat-elements/dist/main.css';
// import { MessageBox, MessageInput } from 'react-chat-elements';


const ChatCard = () => {

    let [mic,setMic]=useState(true)
    let [cam,setCam]=useState(true)


  return (
    <div>
      <div className='chatPollWholeCnt'>
            <div className='tabsChatPollCnt'>
                <Tabs>
                    <TabList>
                        <Tab>Participants</Tab>
                        <Tab>Chats</Tab>
                        <Tab>Poll</Tab>
                    </TabList>

                    <TabPanel>
                        <div className='commonChatPollHt participantCnt'>
                            <div className='profileDetailCnt'>
                                <div className="profileAndName">
                                    <div className="imgCnt">
                                        <img src={SanjanaProfile} alt="Profile Image" />
                                    </div>
                                    <div className="NameAndDes">
                                        <p className='name'>Sanjana</p>
                                        <p className='Designation'>Project Manager</p>
                                    </div>
                                </div>
                                <div className="hostAndMic">
                                    <span className='hostId'>Host</span>
                                    <div className="micAndCamCnt">
                                        <div className="micIconCnt" onClick={()=>{setMic(!mic)}}>
                                           <img src={mic?UserMicOn:UserMicOff} alt="Mic On Icon" />
                                        </div>
                                        <div className="camIconCnt" onClick={()=>{setCam(!cam)}}>
                                            <img src={cam?UserCamOn:UserCamOff} alt="Cam On Icon" />
                                        </div>
                                        <div className="moreIconCnt">
                                            <img src={UserMoreIcon} alt="More Icon" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className='profileDetailCnt'>
                                <div className="profileAndName">
                                    <div className="imgCnt">
                                        <img src={KamalProfile} alt="Profile Image" />
                                    </div>
                                    <div className="NameAndDes">
                                        <p className='name'>Kamal</p>
                                        <p className='Designation'>VP</p>
                                    </div>
                                </div>
                                <div className="hostAndMic">
                                    {/* <span className='hostId'>Host</span> */}
                                    <div className="micAndCamCnt">
                                        <div className="micIconCnt" onClick={()=>{setMic(!mic)}}>
                                           <img src={mic?UserMicOn:UserMicOff} alt="Mic On Icon" />
                                        </div>
                                        <div className="camIconCnt" onClick={()=>{setCam(!cam)}}>
                                            <img src={cam?UserCamOn:UserCamOff} alt="Cam On Icon" />
                                        </div>
                                        <div className="moreIconCnt">
                                            <img src={UserMoreIcon} alt="More Icon" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className='profileDetailCnt'>
                                <div className="profileAndName">
                                    <div className="imgCnt">
                                        <img src={ShamProfile} alt="Profile Image" />
                                    </div>
                                    <div className="NameAndDes">
                                        <p className='name'>Sham</p>
                                        <p className='Designation'>Developer</p>
                                    </div>
                                </div>
                                <div className="hostAndMic">
                                    {/* <span className='hostId'>Host</span> */}
                                    <div className="micAndCamCnt">
                                        <div className="micIconCnt" onClick={()=>{setMic(!mic)}}>
                                           <img src={mic?UserMicOn:UserMicOff} alt="Mic On Icon" />
                                        </div>
                                        <div className="camIconCnt" onClick={()=>{setCam(!cam)}}>
                                            <img src={cam?UserCamOn:UserCamOff} alt="Cam On Icon" />
                                        </div>
                                        <div className="moreIconCnt">
                                            <img src={UserMoreIcon} alt="More Icon" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className='profileDetailCnt'>
                                <div className="profileAndName">
                                    <div className="imgCnt">
                                        <img src={SanjanaProfile} alt="Profile Image" />
                                    </div>
                                    <div className="NameAndDes">
                                        <p className='name'>Santhosh</p>
                                        <p className='Designation'>Developer</p>
                                    </div>
                                </div>
                                <div className="hostAndMic">
                                    {/* <span className='hostId'>Host</span> */}
                                    <div className="micAndCamCnt">
                                        <div className="micIconCnt" onClick={()=>{setMic(!mic)}}>
                                           <img src={mic?UserMicOn:UserMicOff} alt="Mic On Icon" />
                                        </div>
                                        <div className="camIconCnt" onClick={()=>{setCam(!cam)}}>
                                            <img src={cam?UserCamOn:UserCamOff} alt="Cam On Icon" />
                                        </div>
                                        <div className="moreIconCnt">
                                            <img src={UserMoreIcon} alt="More Icon" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className='profileDetailCnt'>
                                <div className="profileAndName">
                                    <div className="imgCnt">
                                        <img src={KamalProfile} alt="Profile Image" />
                                    </div>
                                    <div className="NameAndDes">
                                        <p className='name'>Vicky</p>
                                        <p className='Designation'>Developer</p>
                                    </div>
                                </div>
                                <div className="hostAndMic">
                                    {/* <span className='hostId'>Host</span> */}
                                    <div className="micAndCamCnt">
                                        <div className="micIconCnt" onClick={()=>{setMic(!mic)}}>
                                           <img src={mic?UserMicOn:UserMicOff} alt="Mic On Icon" />
                                        </div>
                                        <div className="camIconCnt" onClick={()=>{setCam(!cam)}}>
                                            <img src={cam?UserCamOn:UserCamOff} alt="Cam On Icon" />
                                        </div>
                                        <div className="moreIconCnt">
                                            <img src={UserMoreIcon} alt="More Icon" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className='profileDetailCnt'>
                                <div className="profileAndName">
                                    <div className="imgCnt">
                                        <img src={ShamProfile} alt="Profile Image" />
                                    </div>
                                    <div className="NameAndDes">
                                        <p className='name'>Karan</p>
                                        <p className='Designation'>Developer</p>
                                    </div>
                                </div>
                                <div className="hostAndMic">
                                    {/* <span className='hostId'>Host</span> */}
                                    <div className="micAndCamCnt">
                                        <div className="micIconCnt" onClick={()=>{setMic(!mic)}}>
                                           <img src={mic?UserMicOn:UserMicOff} alt="Mic On Icon" />
                                        </div>
                                        <div className="camIconCnt" onClick={()=>{setCam(!cam)}}>
                                            <img src={cam?UserCamOn:UserCamOff} alt="Cam On Icon" />
                                        </div>
                                        <div className="moreIconCnt">
                                            <img src={UserMoreIcon} alt="More Icon" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className='profileDetailCnt'>
                                <div className="profileAndName">
                                    <div className="imgCnt">
                                        <img src={SanjanaProfile} alt="Profile Image" />
                                    </div>
                                    <div className="NameAndDes">
                                        <p className='name'>Karpagam</p>
                                        <p className='Designation'>Developer</p>
                                    </div>
                                </div>
                                <div className="hostAndMic">
                                    {/* <span className='hostId'>Host</span> */}
                                    <div className="micAndCamCnt">
                                        <div className="micIconCnt" onClick={()=>{setMic(!mic)}}>
                                           <img src={mic?UserMicOn:UserMicOff} alt="Mic On Icon" />
                                        </div>
                                        <div className="camIconCnt" onClick={()=>{setCam(!cam)}}>
                                            <img src={cam?UserCamOn:UserCamOff} alt="Cam On Icon" />
                                        </div>
                                        <div className="moreIconCnt">
                                            <img src={UserMoreIcon} alt="More Icon" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className='profileDetailCnt'>
                                <div className="profileAndName">
                                    <div className="imgCnt">
                                        <img src={KamalProfile} alt="Profile Image" />
                                    </div>
                                    <div className="NameAndDes">
                                        <p className='name'>Mr. XXX</p>
                                        <p className='Designation'>Developer</p>
                                    </div>
                                </div>
                                <div className="hostAndMic">
                                    {/* <span className='hostId'>Host</span> */}
                                    <div className="micAndCamCnt">
                                        <div className="micIconCnt" onClick={()=>{setMic(!mic)}}>
                                           <img src={mic?UserMicOn:UserMicOff} alt="Mic On Icon" />
                                        </div>
                                        <div className="camIconCnt" onClick={()=>{setCam(!cam)}}>
                                            <img src={cam?UserCamOn:UserCamOff} alt="Cam On Icon" />
                                        </div>
                                        <div className="moreIconCnt">
                                            <img src={UserMoreIcon} alt="More Icon" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className='profileDetailCnt'>
                                <div className="profileAndName">
                                    <div className="imgCnt">
                                        <img src={ShamProfile} alt="Profile Image" />
                                    </div>
                                    <div className="NameAndDes">
                                        <p className='name'>Mr. XXX</p>
                                        <p className='Designation'>Developer</p>
                                    </div>
                                </div>
                                <div className="hostAndMic">
                                    {/* <span className='hostId'>Host</span> */}
                                    <div className="micAndCamCnt">
                                        <div className="micIconCnt" onClick={()=>{setMic(!mic)}}>
                                           <img src={mic?UserMicOn:UserMicOff} alt="Mic On Icon" />
                                        </div>
                                        <div className="camIconCnt" onClick={()=>{setCam(!cam)}}>
                                            <img src={cam?UserCamOn:UserCamOff} alt="Cam On Icon" />
                                        </div>
                                        <div className="moreIconCnt">
                                            <img src={UserMoreIcon} alt="More Icon" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>                        
                    </TabPanel>
                    <TabPanel>
                        <div className='commonChatPollHt'>
                            <div className='participantsChatCnt'>
                            <div className='chatProfile'>
                                <img src={ChatProfileImg} alt="Profile Image" />
                            </div>
                            <div className='indProfileChat'>
                                <div className='userCnt'>
                                    <div className='timeCnt'>
                                        <p id='' className='userName'>Kamal</p>
                                        <p className='timer'>12:04 AM</p>
                                    </div>
                                    <p>Hey Team, here is our new meeting application for our cmots info tech.</p>
                                </div>
                            </div>
                        </div>
                        <div className='participantsChatCnt'>
                            <div className='chatProfile'>
                                <img src={ChatProfileImg} alt="Profile Image" />
                            </div>
                            <div className='indProfileChat'>
                                <div className='userCnt'>
                                    <div className='timeCnt'>
                                        <p id='' className='userName'>Kamal</p>
                                        <p className='timer'>12:04 AM</p>
                                    </div>
                                    <p>Hey Team, here is our new meeting application for our cmots info tech.</p>
                                </div>
                            </div>
                        </div>
                        <div className='participantsChatCnt'>
                            <div className='chatProfile'>
                                <img src={ChatProfileImg} alt="Profile Image" />
                            </div>
                            <div className='indProfileChat'>
                                <div className='userCnt'>
                                    <div className='timeCnt'>
                                        <p id='' className='userName'>Kamal</p>
                                        <p className='timer'>12:04 AM</p>
                                    </div>
                                    <p>Hey Team, here is our new meeting application for our cmots info tech.</p>
                                </div>
                            </div>
                        </div>
                        <div className='participantsChatCnt'>
                            <div className='chatProfile'>
                                <img src={ChatProfileImg} alt="Profile Image" />
                            </div>
                            <div className='indProfileChat'>
                                <div className='userCnt'>
                                    <div className='timeCnt'>
                                        <p id='' className='userName'>Kamal</p>
                                        <p className='timer'>12:04 AM</p>
                                    </div>
                                    <p>Hey Team, here is our new meeting application for our cmots info tech.</p>
                                </div>
                            </div>
                        </div>
                        <div className='participantsChatCnt'>
                            <div className='chatProfile'>
                                <img src={ChatProfileImg} alt="Profile Image" />
                            </div>
                            <div className='indProfileChat'>
                                <div className='userCnt'>
                                    <div className='timeCnt'>
                                        <p id='' className='userName'>Kamal</p>
                                        <p className='timer'>12:04 AM</p>
                                    </div>
                                    <p>Hey Team, here is our new meeting application for our cmots info tech.</p>
                                </div>
                            </div>
                        </div>
                        </div>
                        <div className='msgBoxCnt'>
                            <button><img src={DocAttachIcon} alt="Attachment Icon" /></button>
                            <input type="text" placeholder='Type Something...' />
                            <button><img src={SentBtn} alt="" /></button>
                        </div>
                        
                     </TabPanel>
                     <TabPanel>
                         <div className='commonChatPollHt pollCnt'>
                            <div className="pollImgCnt">
                                <img src={PollImage} alt="Poll Image" />
                            </div>
                            <div className='btnCnt'>
                                <button>Create Poll</button>
                            </div>                            
                        </div> 
                     </TabPanel>
                    </Tabs>
            </div>
      </div>
    </div>
  )
}

export default ChatCard
