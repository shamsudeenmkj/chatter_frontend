import React, { useEffect, useRef, useState } from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import { useSocket } from "../sockets/socket";
import { useParams } from "react-router-dom";

import DocAttachIcon from "../assets/docAttachmentIcon.svg";
import SentBtn from "../assets/msgSendIcons.svg";

import UserMicOn from "../assets/userMicOn.png";
import UserMicOff from "../assets/userMicOff.png";
import UserCamOn from "../assets/userCamOn.png";
import UserCamOff from "../assets/userCamOff.png";
import UserMoreIcon from "../assets/userMoreIcon.png";

import PollImage from "../assets/pollImage.png";

const ChatCard = () => {
  const socketRef = useSocket();
  const { roomId } = useParams();
  const user = JSON.parse(localStorage.getItem("user"));

  const [participants, setParticipants] = useState([]);
  const [groupMessages, setGroupMessages] = useState([]);
  
  // Stores messages keyed by roomId: { room_id: [messages] }
  const [privateMessages, setPrivateMessages] = useState({});

  const [groupText, setGroupText] = useState("");
  const [privateText, setPrivateText] = useState("");
  const [activePrivateUser, setActivePrivateUser] = useState(null);

  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);

  const groupChatEndRef = useRef(null);
  const privateChatEndRef = useRef(null);

  // ================== SOCKET LISTENERS ==================
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !user) return;

    socket.emit("join-room", { roomId, name: user.name });

    socket.on("all-users", (users) => setParticipants(users));
    socket.on("user-joined", (newUser) => setParticipants((prev) => [...prev, newUser]));
    socket.on("user-left", (userId) => setParticipants((prev) => prev.filter((u) => u.userId !== userId)));

    // GROUP CHAT
    socket.on("chat-message", (msg) => {
      setGroupMessages((prev) => [...prev, msg]);
    });

    // PRIVATE CHAT HISTORY (Sent by server when you join-private-chat)
    socket.on("private-chat-history", ({ roomId, messages }) => {
      setPrivateMessages((prev) => ({
        ...prev,
        [roomId]: messages,
      }));
    });

    // RECEIVE NEW PRIVATE MESSAGE
    socket.on("receiveMessage", (msg) => {
      setPrivateMessages((prev) => ({
        ...prev,
        [msg.roomId]: [...(prev[msg.roomId] || []), msg],
      }));
    });

    return () => {
      socket.off("all-users");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("chat-message");
      socket.off("private-chat-history");
      socket.off("receiveMessage");
    };
  }, [roomId, socketRef.current, user?.name]);

  // ================== AUTO SCROLL ==================
  useEffect(() => {
    groupChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupMessages]);

  useEffect(() => {
    privateChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [privateMessages, activePrivateUser]);

  // ================== SEND GROUP MESSAGE ==================
  const sendGroupMessage = () => {
    if (!groupText.trim()) return;
    const msg = {
      sender: user?.name || "Guest",
      id: socketRef.current.id,
      text: groupText,
      roomId,
      time: new Date().toLocaleTimeString(),
    };
    socketRef.current.emit("chat-message", msg);
    setGroupText("");
  };

  // ================== OPEN PRIVATE CHAT ==================
  const openPrivateChat = (participant) => {
    if (!participant || participant.userId === socketRef.current.id) return;

    const ids = [socketRef.current.id, participant.userId].sort();
    const privateRoomId = ids.join("_");

    // Tell server to join this specific chat room and send history
    socketRef.current.emit("join-private-chat", { roomId: privateRoomId });

    setActivePrivateUser({
      ...participant,
      privateRoomId,
    });
  };

  // ================== SEND PRIVATE MESSAGE ==================
  const sendPrivateMessage = () => {
    if (!privateText.trim() || !activePrivateUser) return;

    const msg = {
      roomId: activePrivateUser.privateRoomId,
      senderId: socketRef.current.id,
      receiverId: activePrivateUser.userId,
      userName: user.name,
      message: privateText,
      dateTime: new Date().toISOString(),
    };

    socketRef.current.emit("privateChat", msg);
    setPrivateText("");
  };

  return (
    <div className="chatPollWholeCnt">
      <div className="tabsChatPollCnt">
        <Tabs>
          <TabList>
            <Tab>Participants</Tab>
            <Tab>Chats</Tab>
            <Tab>Poll</Tab>
          </TabList>

          {/* PARTICIPANTS TAB */}
          <TabPanel>
            <div className="commonChatPollHt participantCnt">
              {participants.map((p, i) => (
                <div className="profileDetailCnt" key={i} onClick={() => openPrivateChat(p)}>
                  <div className="profileAndName">
                    <div className="avatarCircle">{p.name?.[0]?.toUpperCase()}</div>
                    <div className="NameAndDes">
                      <p className="name">{p.name}</p>
                      <p className="Designation">{p.userId === socketRef.current.id ? "You" : "Participant"}</p>
                    </div>
                  </div>
                  <div className="micAndCamCnt">
                    <div onClick={(e) => { e.stopPropagation(); setMic(!mic); }}>
                      <img src={mic ? UserMicOn : UserMicOff} alt="Mic" />
                    </div>
                    <div onClick={(e) => { e.stopPropagation(); setCam(!cam); }}>
                      <img src={cam ? UserCamOn : UserCamOff} alt="Cam" />
                    </div>
                    <div><img src={UserMoreIcon} alt="More" /></div>
                  </div>
                </div>
              ))}

              {/* PRIVATE CHAT BOX */}
              {activePrivateUser && (
                <div className="privateChatBox">
                  <h4>Private Chat with {activePrivateUser.name}</h4>
                  <div className="privateChatMessages">
                    {(privateMessages[activePrivateUser.privateRoomId] || []).map((msg, i) => {
                      const mine = msg.senderId === socketRef.current.id;
                      return (
                        <div key={i} style={{ textAlign: mine ? "right" : "left", marginBottom: 6 }}>
                          <p style={{ fontSize: 12 }}><b>{msg.userName}</b></p>
                          <p>{msg.message}</p>
                        </div>
                      );
                    })}
                    <div ref={privateChatEndRef}></div>
                  </div>
                  <div className="msgBoxCnt">
                    <input
                      value={privateText}
                      placeholder={`Message ${activePrivateUser.name}`}
                      onChange={(e) => setPrivateText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendPrivateMessage()}
                    />
                    <button onClick={sendPrivateMessage}><img src={SentBtn} alt="Send" /></button>
                  </div>
                  <button onClick={() => setActivePrivateUser(null)} style={{ marginTop: 6 }}>← Close</button>
                </div>
              )}
            </div>
          </TabPanel>

          {/* GROUP CHAT TAB */}
          <TabPanel>
            <div className="commonChatPollHt" style={{ overflowY: "auto", flex: 1 }}>
              {groupMessages.map((msg, i) => {
                const mine = msg.id === socketRef.current.id;
                return (
                  <div className="participantsChatCnt" key={i} style={{ justifyContent: mine ? "flex-end" : "flex-start" }}>
                    <div className="chatProfile"><div>{msg.sender?.[0]}</div></div>
                    <div className="indProfileChat">
                      <p className="timer">{msg.time}</p>
                      <div className="userCnt">
                        <p className="userName">{msg.sender}</p>
                        <p>{msg.text}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={groupChatEndRef}></div>
            </div>
            <div className="msgBoxCnt">
              <button><img src={DocAttachIcon} alt="Attachment" /></button>
              <input
                type="text"
                placeholder="Type Something..."
                value={groupText}
                onChange={(e) => setGroupText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendGroupMessage()}
              />
              <button onClick={sendGroupMessage}><img src={SentBtn} alt="Send" /></button>
            </div>
          </TabPanel>

          <TabPanel>
            <div className="commonChatPollHt pollCnt">
               <div className="pollImgCnt"><img src={PollImage} alt="Poll" /></div>
               <div className="btnCnt"><button>Create Poll</button></div>
            </div>
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
};

export default ChatCard;