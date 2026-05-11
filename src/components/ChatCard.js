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

const ChatCard = ({ userList, onToggleChat, hostId }) => {
  const socketRef = useSocket();
  const { roomId } = useParams();
  const user = JSON.parse(localStorage.getItem("user"));

  const [participants, setParticipants]           = useState([]);
  const [groupMessages, setGroupMessages]         = useState([]);
  const [privateMessages, setPrivateMessages]     = useState({});
  const [groupText, setGroupText]                 = useState("");
  const [privateText, setPrivateText]             = useState("");
  const [activePrivateUser, setActivePrivateUser] = useState(null);
  const [unreadCount, setUnreadCount]             = useState(0);
  const [activeTabIndex, setActiveTabIndex]       = useState(0);

  // ✅ { [senderId]: count } — unread private messages per participant
  const [privateUnread, setPrivateUnread] = useState({});

  const activeTabRef        = useRef(0);
  const activePrivateRef    = useRef(null); // ✅ always-current active private user
  const groupChatEndRef     = useRef(null);
  const privateChatEndRef   = useRef(null);


  // ── Sync participants from props ──────────────────────────
  useEffect(() => {
    setParticipants(userList || []);
  }, [userList]);

  // ── Keep activePrivateRef in sync with state ──────────────
  useEffect(() => {
    activePrivateRef.current = activePrivateUser;
  }, [activePrivateUser]);

  // ── Socket listeners ──────────────────────────────────────
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !user) return;

      socket.emit("join-chat", { roomId }); // ✅ idempotent, safe to call again


    // Group chat
   socket.on("chat-message", (msg) => {
  setGroupMessages(prev => [...prev, msg]);
  const isFromMe = msg.id === socket.id;
  if (!isFromMe && activeTabRef.current !== 1) {
    setUnreadCount(c => c + 1);
  }
});

    // Private chat history
    socket.on("private-chat-history", ({ roomId, messages }) => {
      setPrivateMessages(prev => ({ ...prev, [roomId]: messages }));
    });

    // ✅ New private message received
    socket.on("receiveMessage", (msg) => {
      setPrivateMessages(prev => ({
        ...prev,
        [msg.roomId]: [...(prev[msg.roomId] || []), msg],
      }));

      // ✅ Only count as unread if:
      //    - message is NOT from me
      //    - the sender's private chat box is NOT currently open
      const isFromMe = msg.senderId === socket.id;
      const currentActive = activePrivateRef.current;
      const isCurrentlyOpen = currentActive?.privateRoomId === msg.roomId;

      if (!isFromMe && !isCurrentlyOpen) {
        setPrivateUnread(prev => ({
          ...prev,
          [msg.senderId]: (prev[msg.senderId] || 0) + 1,
        }));
      }
    });

    return () => {
      socket.off("chat-message");
      socket.off("private-chat-history");
      socket.off("receiveMessage");
    };
  }, [socketRef.current]);

  // ── Auto scroll ───────────────────────────────────────────
  useEffect(() => {
    groupChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupMessages]);

  useEffect(() => {
    privateChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [privateMessages, activePrivateUser]);

  // ── Tab change ────────────────────────────────────────────
// ✅ Replace:
const handleTabSelect = (index) => {
  activeTabRef.current = index;
  setActiveTabIndex(index);
  if (index === 1) setUnreadCount(0);       // clear group unread on Chats tab
  if (index === 0) {                         // clear private unread on Participants tab
    // Don't clear here — private unread clears per-user when chat box opens/scrolled
  }
};

  // ── Open private chat ─────────────────────────────────────
  const openPrivateChat = (participant) => {
    if (!participant || participant.userId === socketRef.current.id) return;

    const ids = [socketRef.current.id, participant.userId].sort();
    const privateRoomId = ids.join("_");
    socketRef.current.emit("join-private-chat", { roomId: privateRoomId });

    const newActive = { ...participant, privateRoomId };
    setActivePrivateUser(newActive);
    activePrivateRef.current = newActive;

    // ✅ Clear unread for this participant when chat box opens
    setPrivateUnread(prev => ({ ...prev, [participant.userId]: 0 }));
  };

  // ✅ Clear unread as user scrolls/reads — called on scroll
  const handlePrivateChatScroll = () => {
    if (!activePrivateUser) return;
    setPrivateUnread(prev => ({ ...prev, [activePrivateUser.userId]: 0 }));
  };

  // ── Close private chat ────────────────────────────────────
  const closePrivateChat = () => {
    setActivePrivateUser(null);
    activePrivateRef.current = null;
  };

  // ── Send group message ────────────────────────────────────
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

  // ── Send private message ──────────────────────────────────
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

const hasUnread = unreadCount > 0 && activeTabIndex !== 1;
  // ── Compute total unread private messages across all participants ──
const totalPrivateUnread = Object.values(privateUnread).reduce((sum, c) => sum + c, 0);
const hasPrivateUnread = totalPrivateUnread > 0;
  // ── Render ────────────────────────────────────────────────
  return (
    <div className="chatPollWholeCnt">
      <div className="tabsChatPollCnt">
        <Tabs selectedIndex={activeTabIndex} onSelect={handleTabSelect}>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <TabList>
              <Tab>
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      color: hasPrivateUnread ? "#ffffff" : "inherit",
      fontWeight: hasPrivateUnread ? 700 : "inherit",
      transition: "color 0.2s",
    }}>
      Participants
      {hasPrivateUnread && (
        <span style={{
          background: "#EF4444", color: "#fff",
          borderRadius: 20, minWidth: 18, height: 18,
          fontSize: 10, fontWeight: 700,
          display: "inline-flex", alignItems: "center",
          justifyContent: "center", padding: "0 5px", lineHeight: 1,
        }}>
          {totalPrivateUnread > 99 ? "99+" : totalPrivateUnread}
        </span>
      )}
    </span>
  </Tab>

      <Tab>
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      color: hasUnread ? "#1971FF" : "inherit",
      fontWeight: hasUnread ? 700 : "inherit",
      transition: "color 0.2s",
    }}>
      Chats
      {hasUnread && (
        <span style={{
          background: "#EF4444", color: "#fff",
          borderRadius: 20, minWidth: 18, height: 18,
          fontSize: 10, fontWeight: 700,
          display: "inline-flex", alignItems: "center",
          justifyContent: "center", padding: "0 5px", lineHeight: 1,
        }}>
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </span>
  </Tab>

              <Tab>Poll</Tab>
            </TabList>

            <button
              className="chatPollCnt"
              onClick={onToggleChat}
              style={{ color: "white", background: "transparent", height: "30px", width: "30px" }}
            >X</button>
          </div>

          {/* ── PARTICIPANTS TAB ── */}
          <TabPanel>
            <div className="commonChatPollHt participantCnt">
              {participants.map((p, i) => {
                const isHost      = p.authId?.toString() === hostId?.toString();
                const isMe        = p.userId === socketRef.current?.id;
                const unreadPriv  = privateUnread[p.userId] || 0; // ✅ per-user unread

                return (
                  <div
                    className="profileDetailCnt"
                    key={p.userId || i}
                    onClick={() => openPrivateChat(p)}
                    style={{ cursor: isMe ? "default" : "pointer" }}
                  >
                    <div className="profileAndName">

                      {/* ✅ Avatar with red dot overlay */}
                      <div style={{ position: "relative", flexShrink: 0 }}>
                        <div className="avatarCircle">
                          {p.name?.[0]?.toUpperCase()}
                        </div>
                        {unreadPriv > 0 && (
                          <span style={{
                            position: "absolute",
                            top: -3, right: -3,
                            width: 10, height: 10,
                            background: "#EF4444",
                            borderRadius: "50%",
                            border: "2px solid #272C35",
                            display: "block",
                          }} />
                        )}
                      </div>

                      <div className="NameAndDes">
                        {/* ✅ Name + Host badge + unread count */}
                        <p className="name" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          {p.name}
                          {isHost && (
                            <span style={{
                              background: "#F9C33C", color: "#000",
                              fontSize: 10, fontWeight: 700,
                              padding: "2px 7px", borderRadius: 50, lineHeight: 1.4,
                            }}>👑 Host</span>
                          )}
                          {/* ✅ Unread count badge next to name */}
                          {unreadPriv > 0 && (
                            <span style={{
                              background: "#EF4444", color: "#fff",
                              borderRadius: 20, minWidth: 18, height: 18,
                              fontSize: 10, fontWeight: 700,
                              display: "inline-flex", alignItems: "center",
                              justifyContent: "center", padding: "0 5px", lineHeight: 1,
                            }}>
                              {unreadPriv > 99 ? "99+" : unreadPriv}
                            </span>
                          )}
                        </p>
                        <p className="Designation">
                          {isMe ? "You" : isHost ? "Host" : "Participant"}
                        </p>
                      </div>
                    </div>

                    {/* ✅ Real mic + cam from live data */}
                    <div className="micAndCamCnt">
                      <div title={p.muted ? "Mic Off" : "Mic On"}>
                        <img src={p.muted ? UserMicOff : UserMicOn} alt="Mic" />
                      </div>
                      <div title={p.videoOff ? "Cam Off" : "Cam On"}>
                        <img src={p.videoOff ? UserCamOff : UserCamOn} alt="Cam" />
                      </div>
                      <div><img src={UserMoreIcon} alt="More" /></div>
                    </div>
                  </div>
                );
              })}

              {/* PRIVATE CHAT BOX */}
              {activePrivateUser && (
                <div className="privateChatBox">
                  <div className="hdAndClose">
                    <h4>Private Chat with {activePrivateUser.name}</h4>
                    <button onClick={closePrivateChat} style={{ marginTop: 6 }}>Close X</button>
                  </div>
                  {/* ✅ onScroll clears unread when user reads messages */}
                  <div
                    className="privateChatMessages"
                    onScroll={handlePrivateChatScroll}
                  >
                    {(privateMessages[activePrivateUser.privateRoomId] || []).map((msg, i) => {
                      const mine = msg.senderId === socketRef.current.id;
                      return (
                        <div key={i} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                          <div className="privateChatBgColor" style={{ marginBottom: 6 }}>
                            <p className="privateChatUserName"><b>{msg.userName}</b></p>
                            <p className="privateMsg">{msg.message}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={privateChatEndRef} />
                  </div>
                  <div className="msgBoxCnt">
                    <button><img src={DocAttachIcon} alt="Attachment" /></button>
                    <input
                      value={privateText}
                      placeholder={`Message ${activePrivateUser.name}`}
                      onChange={(e) => setPrivateText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendPrivateMessage()}
                    />
                    <button onClick={sendPrivateMessage}><img src={SentBtn} alt="Send" /></button>
                  </div>
                </div>
              )}
            </div>
          </TabPanel>

          {/* ── GROUP CHAT TAB ── */}
          <TabPanel>
            <div className="commonChatPollHt" style={{ overflowY: "auto", flex: 1 }}>
              {groupMessages.map((msg, i) => {
                const mine = msg.id === socketRef.current.id;
                return (
                  <div className="participantsChatCnt" key={i}
                    style={{ justifyContent: mine ? "flex-end" : "flex-start" }}>
                    <div className="chatProfile"><div>{msg.sender?.[0]}</div></div>
                    <div className="indProfileChat">
                      <div className="userCnt">
                        <div className="timeCnt">
                          <p className="userName">{msg.sender}</p>
                          <p className="timer">{msg.time}</p>
                        </div>
                        <p>{msg.text}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={groupChatEndRef} />
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

          {/* ── POLL TAB ── */}
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