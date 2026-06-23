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

const SERVER_URL = "https://chatter-backend-4i7g.onrender.com";

// ─── Helper: deterministic private room key ───────────────────────────────────
function makePrivateRoomId(idA, idB) {
  return [idA, idB].sort().join("_");
}

// ─── File bubble ──────────────────────────────────────────────────────────────
function FileBubble({ msg }) {
  const isImage = msg.kind === "image" || (msg.fileMimeType || "").startsWith("image/");
  const fileName = msg.fileName || msg.text || "file";
  const fileUrl  = msg.fileUrl;
  const fileSize = msg.fileSize;

  // Swap /file/ → /download/ to force browser download
  const downloadUrl = fileUrl ? fileUrl.replace("/file/", "/download/") : fileUrl;

  const sizeLabel = fileSize
    ? fileSize > 1024 * 1024
      ? `${(fileSize / 1024 / 1024).toFixed(1)} MB`
      : `${Math.round(fileSize / 1024)} KB`
    : null;

  if (isImage) {
    return (
      
      <a  href={downloadUrl}
        download={fileName}        // ← forces download
        rel="noreferrer"
        style={{ display: "block" }}
      >
        <img
          src={fileUrl}            // ← still use /file/ for preview
          alt={fileName}
          style={{
            maxWidth: 200,
            maxHeight: 180,
            borderRadius: 8,
            display: "block",
            marginTop: 4,
            objectFit: "cover",
            cursor: "pointer",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        />
        {sizeLabel && <p style={{ color: "#aaa", fontSize: 10, margin: "2px 0 0" }}>{sizeLabel}</p>}
      </a>
    );
  }

  return (
    <a
      href={downloadUrl}
      download={fileName}          // ← forces download
      rel="noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 11px",
        background: "rgba(25,113,255,0.12)",
        border: "1px solid rgba(25,113,255,0.25)",
        borderRadius: 8,
        textDecoration: "none",
        marginTop: 4,
        maxWidth: 220,
      }}
    >
      <span style={{ fontSize: 20 }}>📎</span>
      <span style={{ overflow: "hidden" }}>
        <p style={{ color: "#fff", fontSize: 12, fontWeight: 600, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140 }}>
          {fileName}
        </p>
        {sizeLabel && <p style={{ color: "#aaa", fontSize: 10, margin: 0 }}>{sizeLabel}</p>}
      </span>
    </a>
  );
}

const ChatCard = ({
  userList, onToggleChat, hostId,
  privateMessages, setPrivateMessages, privateUnread, setPrivateUnread,
  mySocketIdRef: mySocketIdRefProp,
  defaultTabIndex = 0,
  groupMessages: groupMessagesProp, setGroupMessages: setGroupMessagesProp,
  lastSentFileMessageIdRef: lastSentFileMessageIdRefProp,  groupUnread = 0,           // ← add
  onClearGroupUnread, activeChatTabRef,   

   activePoll: activePollProp,
  setActivePoll: setActivePollProp,
  pollHistory: pollHistoryProp,
  setPollHistory: setPollHistoryProp,
  myVote: myVoteProp,
  setMyVote: setMyVoteProp,
}) => {
  const socketRef = useSocket();
  const { roomId } = useParams();
  const user = (() => {
    try {
      const u = localStorage.getItem("user");
      if (u) return JSON.parse(u);
      const g = localStorage.getItem("guest");
      if (g) return JSON.parse(g);
      return null;
    } catch { return null; }
  })();
  const myName = user?.name || "Guest";

  // ── State ──────────────────────────────────────────────────────────────────
  const [participants, setParticipants]       = useState([]);
  // const [groupMessages, setGroupMessages]     = useState([]);
  const [groupText, setGroupText]             = useState("");
  const [privateText, setPrivateText]         = useState("");
  const [activePrivateUser, setActivePrivateUser] = useState(null);
  const [unreadCount, setUnreadCount]   = useState(0);
 const [activeTabIndex, setActiveTabIndex] = useState(defaultTabIndex);

  // File upload state
  const [groupUploading, setGroupUploading]     = useState(false);
  const [privateUploading, setPrivateUploading] = useState(false);

  // Poll state
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [isEditingPoll, setIsEditingPoll]   = useState(false);
  const [pollQuestion, setPollQuestion]     = useState("");
  const [pollOptions, setPollOptions]       = useState(["", ""]);
// Poll state
  // ── Refs ───────────────────────────────────────────────────────────────────
  const activeTabRef      = useRef(0);
  const activePrivateRef  = useRef(null);
  const groupChatEndRef   = useRef(null);
  const privateChatEndRef = useRef(null);
  const groupFileInputRef   = useRef(null);
  const privateFileInputRef = useRef(null);
  const _localSocketIdRef = useRef(null);
  const mySocketIdRef = mySocketIdRefProp ?? _localSocketIdRef;
const [_localGroupMessages, _setLocalGroupMessages] = useState([]);
const groupMessages    = groupMessagesProp    ?? _localGroupMessages;
const setGroupMessages = setGroupMessagesProp ?? _setLocalGroupMessages;

const _localLastSentFileMessageIdRef = useRef(null);
const lastSentFileMessageIdRef = lastSentFileMessageIdRefProp ?? _localLastSentFileMessageIdRef;



const [_localActivePoll, _setLocalActivePoll]   = useState(null);
const [_localPollHistory, _setLocalPollHistory] = useState([]);
const [_localMyVote, _setLocalMyVote]           = useState(null);

const activePoll   = activePollProp   ?? _localActivePoll;
const setActivePoll = setActivePollProp ?? _setLocalActivePoll;
const pollHistory   = pollHistoryProp   ?? _localPollHistory;
const setPollHistory = setPollHistoryProp ?? _setLocalPollHistory;
const myVote        = myVoteProp        ?? _localMyVote;
const setMyVote     = setMyVoteProp     ?? _setLocalMyVote;
  // ── Build participants list ────────────────────────────────────────────────
  useEffect(() => {
    const socket = socketRef.current;
    const myId   = socket?.id || "me";
    mySocketIdRef.current = myId;

    const others = (userList || []).map(p => ({
      ...p,
      privateRoomId: makePrivateRoomId(myId, p.userId),
    }));

    setParticipants([...others]);
  }, [userList, myName]);

  // ── Keep activePrivateRef in sync ─────────────────────────────────────────
  useEffect(() => {
    activePrivateRef.current = activePrivateUser;
  }, [activePrivateUser]);

  // ── Socket listeners ───────────────────────────────────────────────────────
useEffect(() => {
  const socket = socketRef.current;
  if (!socket) return;
  // nothing poll-related here anymore
  return () => {};
}, [socketRef.current]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    groupChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupMessages]);

  useEffect(() => {
    privateChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [privateMessages, activePrivateUser]);

    useEffect(() => {
    setActiveTabIndex(defaultTabIndex);
    if (activeChatTabRef) activeChatTabRef.current = defaultTabIndex;
  }, [defaultTabIndex]);
  // ── Tab change ─────────────────────────────────────────────────────────────
  const handleTabSelect = (index) => {
    activeTabRef.current = index;
    setActiveTabIndex(index);
    if (activeChatTabRef) activeChatTabRef.current = index;
    if (index === 1) onClearGroupUnread?.();   // viewing Chats tab → clear group badge
  };

  

  // ── Open / close private chat panel ───────────────────────────────────────
  const openPrivateChat = (participant) => {
    if (!participant || participant._isMe) return;
    setActivePrivateUser(participant);
    activePrivateRef.current = participant;
    setPrivateUnread(prev => ({ ...prev, [participant.userId]: 0 }));
  };

  const handlePrivateChatScroll = () => {
    if (!activePrivateUser) return;
    setPrivateUnread(prev => ({ ...prev, [activePrivateUser.userId]: 0 }));
  };

  const closePrivateChat = () => {
    setActivePrivateUser(null);
    activePrivateRef.current = null;
  };

  // ── Send group message ─────────────────────────────────────────────────────
  const sendGroupMessage = () => {
    if (!groupText.trim()) return;
    socketRef.current.emit("react:meeting:message", {
      roomId,
      name: myName,
      text: groupText,
    });
    setGroupText("");
  };

  // ── Send private message ───────────────────────────────────────────────────
  const sendPrivateMessage = () => {
    if (!privateText.trim() || !activePrivateUser) return;
    const socket = socketRef.current;
    const myId   = mySocketIdRef.current || socket.id;

    const msg = {
      roomId:     activePrivateUser.privateRoomId,
      senderId:   myId,
      receiverId: activePrivateUser.userId,
      name:       myName,
      userName:   myName,
      message:    privateText,
      time:       new Date().toLocaleTimeString(),
    };

    socket.emit("react:meeting:private", msg);
    const key = activePrivateUser.privateRoomId;
setPrivateMessages(prev => ({
  ...prev,
  [key]: [...(prev[key] || []), { ...msg, _isFile: false }],
}));
    setPrivateText("");
  };

  // ── Upload file (group chat) ───────────────────────────────────────────────
  const handleGroupFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";           // reset so same file can be re-picked
    setGroupUploading(true);
    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("roomId", roomId);
      fd.append("senderName", myName);

      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res  = await fetch(`${SERVER_URL}/web/upload-file`, { method: "POST", headers, body: fd });
      const data = await res.json();

      if (!data.success) { alert("Upload failed: " + (data.message || "unknown error")); return; }
 lastSentFileMessageIdRef.current = data.messageId;

      // Broadcast to room via socket
      socketRef.current.emit("react:meeting:file", {
        roomId,
        messageId:    data.messageId,
        fileId:       data.fileId,
        fileUrl:      data.fileUrl,
        fileName:     data.fileName,
        fileSize:     data.fileSize,
        fileMimeType: data.fileMimeType,
        kind:         data.kind,
        sentAt:       data.sentAt,
        senderName:   myName,
      });
    } catch (err) {
      alert("Upload error: " + err.message);
    } finally {
      setGroupUploading(false);
    }
  };

  // ── Upload file (private chat) ─────────────────────────────────────────────
const handlePrivateFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activePrivateUser) return;
    e.target.value = "";
    setPrivateUploading(true);
    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("roomId", roomId);
      fd.append("senderName", myName);

      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res  = await fetch(`${SERVER_URL}/web/upload-file`, { method: "POST", headers, body: fd });
      const data = await res.json();

      if (!data.success) { alert("Upload failed: " + (data.message || "unknown error")); return; }

      const socket = socketRef.current;
      const myId   = mySocketIdRef.current || socket.id;

      const msg = {
        roomId:       activePrivateUser.privateRoomId,
        senderId:     myId,
        receiverId:   activePrivateUser.userId,
        name:         myName,
        userName:     myName,
        message:      data.fileName,
        time:         new Date().toLocaleTimeString(),
        _isFile:      true,                  // ← file flag
        fileUrl:      data.fileUrl,
        fileName:     data.fileName,
        fileSize:     data.fileSize,
        fileMimeType: data.fileMimeType,
        kind:         data.kind,
      };

      socket.emit("react:meeting:private", msg);

      // ✅ ADD THIS — show file bubble immediately for the sender
      const key = activePrivateUser.privateRoomId;
      setPrivateMessages(prev => ({
        ...prev,
        [key]: [
          ...(prev[key] || []),
          {
            ...msg,
            _isFile: true, // <- flag
          }
        ],
      }));

    } catch (err) {
      alert("Upload error: " + err.message);
    } finally {
      setPrivateUploading(false);
    }
  };


  // ── Poll handlers ──────────────────────────────────────────────────────────
  const handleVote = (optionId) => {
    if (myVote === optionId) return;
    setMyVote(optionId);
    socketRef.current.emit("react:meeting:poll:vote", { roomId, pollId: activePoll.pollId, optionId });
  };

  // create poll ---------------------------------

  const createPoll = () => {
    const validOptions = pollOptions.filter(o => o.trim());
    if (!pollQuestion.trim() || validOptions.length < 2) return;
    socketRef.current.emit("react:meeting:poll:create", { roomId, name: myName, question: pollQuestion, options: validOptions });
    setShowCreatePoll(false);
    setIsEditingPoll(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
  };

  const openEditPoll = () => {
    if (!activePoll) return;
    setPollQuestion(activePoll.question);
    setPollOptions(activePoll.options.map(o => o.label));
    setIsEditingPoll(true);
    setShowCreatePoll(true);
  };

  const submitEditPoll = () => {
    const validOptions = pollOptions.filter(o => o.trim());
    if (!pollQuestion.trim() || validOptions.length < 2) return;
    socketRef.current.emit("react:meeting:poll:close", { roomId });
    socketRef.current.emit("react:meeting:poll:create", { roomId, name: myName, question: pollQuestion, options: validOptions });
    setShowCreatePoll(false);
    setIsEditingPoll(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
  };

  const deletePoll = () => socketRef.current.emit("react:meeting:poll:close", { roomId });

  const cancelPollForm = () => {
    setShowCreatePoll(false);
    setIsEditingPoll(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
  };

  // ── Derived ────────────────────────────────────────────────────────────────
const hasUnread = groupUnread > 0 && activeTabIndex !== 1;
  const totalPrivateUnread = Object.values(privateUnread).reduce((s, c) => s + c, 0);
  const hasPrivateUnread   = totalPrivateUnread > 0;

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="chatPollWholeCnt">
      <div className="tabsChatPollCnt">
        <Tabs selectedIndex={activeTabIndex} onSelect={handleTabSelect}>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <TabList>

              {/* Participants tab */}
              <Tab>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: hasPrivateUnread ? "#ffffff" : "inherit", fontWeight: hasPrivateUnread ? 700 : "inherit" }}>
                  Participants
                  {hasPrivateUnread && (
                    <span style={{ background: "#EF4444", color: "#fff", borderRadius: 20, minWidth: 18, height: 18, fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>
                      {totalPrivateUnread > 99 ? "99+" : totalPrivateUnread}
                    </span>
                  )}
                </span>
              </Tab>

              {/* Chats tab */}
              <Tab>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: hasUnread ? "#1971FF" : "inherit", fontWeight: hasUnread ? 700 : "inherit" }}>
                  Chats
                  {hasUnread && (
                    <span style={{ background: "#EF4444", color: "#fff", borderRadius: 20, minWidth: 18, height: 18, fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </span>
              </Tab>

              <Tab>Poll</Tab>
            </TabList>

            <button className="chatPollCnt" onClick={onToggleChat}
              style={{ color: "white", background: "transparent", height: "30px", width: "30px" }}>X</button>
          </div>

          {/* ── PARTICIPANTS TAB ── */}
          <TabPanel>
            <div className="commonChatPollHt participantCnt">

              {
                participants.length===0?

                     <div style={{ display:"flex",justifyContent:"center",alignItems:"center",height:"100%"}}>
                  
                  <p style={{ color: "#aaa", marginTop: 10 }}>No Participants Other Then You</p>
                  
                </div>


                :
              
              participants.map((p, i) => {
                const isHost     = p.authId?.toString() === hostId?.toString();
                const isMe       = p._isMe === true;
                const unreadPriv = privateUnread[p.userId] || 0;
                const isActive   = activePrivateUser?.userId === p.userId;
                const isStreaming = p.stream != null;

                return (
                  <div
                    className="profileDetailCnt"
                    key={p.userId || i}
                    onClick={() => openPrivateChat(p)}
                    style={{
                      cursor: isMe ? "default" : "pointer",
                      background: isActive ? "rgba(25,113,255,0.08)" : undefined,
                      borderRadius: isActive ? 8 : undefined,
                    }}
                  >
                    <div className="profileAndName">
                      <div style={{ position: "relative", flexShrink: 0 }}>
                        <div className="avatarCircle">{p.name?.[0]?.toUpperCase()}</div>
                        {unreadPriv > 0 && (
                          <span style={{ position: "absolute", top: -3, right: -3, width: 10, height: 10, background: "#EF4444", borderRadius: "50%", border: "2px solid #272C35", display: "block" }} />
                        )}
                      </div>
                      <div className="NameAndDes">
                        <p className="name" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          {p.name}
                          {isHost && <span style={{ background: "#F9C33C", color: "#000", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 50 }}>👑 Host</span>}
                          {unreadPriv > 0 && (
                            <span style={{ background: "#EF4444", color: "#fff", borderRadius: 20, minWidth: 18, height: 18, fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>
                              {unreadPriv > 99 ? "99+" : unreadPriv}
                            </span>
                          )}
                        </p>
                        <p className="Designation">
                          {isMe ? "You" : isHost ? "Host" : "Participant"}
                          {!isMe && (
                            <span style={{ marginLeft: 6, fontSize: 10, color: "#1971FF", opacity: 0.7 }}>
                              · tap to DM
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="micAndCamCnt">
                      <div title={p.muted ? "Mic Off" : "Mic On"}><img src={p.muted ? UserMicOff : UserMicOn} alt="Mic" /></div>
                      <div title={isStreaming ? "Cam Off" : "Cam On"}><img src={isStreaming ? UserCamOn : UserCamOff} alt="Cam" /></div>
                      <div><img src={UserMoreIcon} alt="More" /></div>
                    </div>
                  </div>
                );
              })}

              {/* ── Private chat panel ── */}
              {activePrivateUser && (
                <div className="privateChatBox">
                  <div className="hdAndClose">
                    <h4>Private Chat with {activePrivateUser.name}</h4>
                    <button onClick={closePrivateChat} style={{ marginTop: 6 }}>Close X</button>
                  </div>

                  <div 
  className="privateChatMessages" 
  onScroll={handlePrivateChatScroll}
  style={{ overflowY: "auto", position: "relative", zIndex: 1 }}  // ← add this
>
  {(privateMessages[activePrivateUser.privateRoomId] || []).length === 0 ? (
    <p style={{ color: "#666", fontSize: 12, textAlign: "center", marginTop: 20 }}>
      No messages yet. Say hi! 👋
    </p>
  ) : (
    (privateMessages[activePrivateUser.privateRoomId] || []).map((msg, i) => {

      // ✅ CORRECT
const mine = msg.senderId === (mySocketIdRef.current || socketRef.current?.id);
      return (
        <div key={i} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
          <div className="privateChatBgColor" style={{ marginBottom: 6, position: "relative", zIndex: 1 }}>
            <p className="privateChatUserName"><b>{msg.userName || msg.name}</b></p>
            {msg._isFile || msg.fileUrl ? (   // ← check fileUrl too, not just _isFile
              <FileBubble msg={msg} />
            ) : (
              <p className="privateMsg">{msg.message}</p>
            )}
          </div>
        </div>
      );
    })
  )}
  <div ref={privateChatEndRef} />
</div>

                  {/* hidden file input for private chat */}
                  <input
                    ref={privateFileInputRef}
                    type="file"
                    style={{ display: "none" }}
                    onChange={handlePrivateFileChange}
                  />

                  <div className="msgBoxCnt">
                    <button
                      onClick={() => privateFileInputRef.current?.click()}
                      disabled={privateUploading}
                      title="Send file"
                      style={{ opacity: privateUploading ? 0.5 : 1, cursor: privateUploading ? "not-allowed" : "pointer" }}
                    >
                      {privateUploading
                        ? <span style={{ fontSize: 14 }}>⏳</span>
                        : <img src={DocAttachIcon} alt="Attachment" />}
                    </button>
                    <input
                      value={privateText}
                      placeholder={`Message ${activePrivateUser.name}`}
                      onChange={e => setPrivateText(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && sendPrivateMessage()}
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
               const mine =
  (msg._myUserId && msg.senderId === msg._myUserId) ||
  (msg.id && msg.id === socketRef.current?.id)
                      console.log("mine => ", msg.id,"  =>  ", msg.senderId ,"  =>  ",socketRef.current?.id)

                return (
                  <div className="participantsChatCnt" key={i} style={{ justifyContent: mine ? "flex-end" : "flex-start" }}>
                    <div className="chatProfile"><div>{msg.name?.[0]}</div></div>
                    <div className="indProfileChat">
                      <div className="userCnt">
                        <div className="timeCnt">
                          <p className="userName">{msg.name}</p>
                          <p className="timer">{msg.time}</p>
                        </div>
                        {msg._isFile ? (
                          <FileBubble msg={msg} />
                        ) : (
                          <p>{msg.text}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={groupChatEndRef} />
            </div>

            {/* hidden file input for group chat */}
            <input
              ref={groupFileInputRef}
              type="file"
              style={{ display: "none" }}
              onChange={handleGroupFileChange}
            />

            <div className="msgBoxCnt">
              <button
                onClick={() => groupFileInputRef.current?.click()}
                disabled={groupUploading}
                title="Send file"
                style={{ opacity: groupUploading ? 0.5 : 1, cursor: groupUploading ? "not-allowed" : "pointer" }}
              >
                {groupUploading
                  ? <span style={{ fontSize: 14 }}>⏳</span>
                  : <img src={DocAttachIcon} alt="Attachment" />}
              </button>
              <input type="text" placeholder="Type Something..." value={groupText}
                onChange={e => setGroupText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendGroupMessage()} />
              <button onClick={sendGroupMessage}><img src={SentBtn} alt="Send" /></button>
            </div>
          </TabPanel>


          

          {/* ── POLL TAB ── */}
          <TabPanel>
            <div className="commonChatPollHt pollCnt" style={{ overflowY: "auto", padding: 12 }}>
              {showCreatePoll ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <p style={{ color: "#aaa", fontSize: 12, margin: 0 }}>{isEditingPoll ? "Edit Poll" : "New Poll"}</p>
                  <input placeholder="Question" value={pollQuestion}
                    onChange={e => setPollQuestion(e.target.value)}
                    style={{ padding: 8, borderRadius: 6, border: "1px solid #2e3448", background: "#1e2330", color: "#fff" }} />
                  {pollOptions.map((opt, i) => (
                    <div key={i} style={{ display: "flex", gap: 6 }}>
                      <input placeholder={`Option ${i + 1}`} value={opt}
                        onChange={e => { const o = [...pollOptions]; o[i] = e.target.value; setPollOptions(o); }}
                        style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #2e3448", background: "#1e2330", color: "#fff" }} />
                      {pollOptions.length > 2 && (
                        <button onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))}
                          style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "none", borderRadius: 6, padding: "0 10px", cursor: "pointer", fontSize: 14 }}>✕</button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setPollOptions([...pollOptions, ""])}
                    style={{ background: "transparent", color: "#1971FF", border: "none", cursor: "pointer", textAlign: "left", padding: 0, fontSize: 13 }}>+ Add Option</button>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button onClick={isEditingPoll ? submitEditPoll : createPoll}
                      style={{ flex: 1, padding: 8, background: "#1971FF", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>
                      {isEditingPoll ? "Save Changes" : "Launch Poll"}
                    </button>
                    <button onClick={cancelPollForm}
                      style={{ flex: 1, padding: 8, background: "#2e3448", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              ) : activePoll ? (
                <div style={{ background: "#1e2330", borderRadius: 10, padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12, gap: 8 }}>
                    <p style={{ color: "#fff", fontWeight: 700, margin: 0, flex: 1 }}>{activePoll.question}</p>
                    {socketRef.current?.id === activePoll.createdBy && (
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button onClick={openEditPoll} title="Edit poll"
                          style={{ background: "rgba(25,113,255,0.15)", color: "#1971FF", border: "1px solid rgba(25,113,255,0.3)", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>Edit</button>
                        <button onClick={deletePoll} title="Delete poll"
                          style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>Delete</button>
                      </div>
                    )}
                  </div>
                  {activePoll.options.map(opt => {
                    const total = activePoll.options.reduce((s, o) => s + o.votes.length, 0);
                    const pct   = total > 0 ? Math.round((opt.votes.length / total) * 100) : 0;
                    const voted = myVote === opt.optionId;
                    return (
                      <div key={opt.optionId} onClick={() => handleVote(opt.optionId)}
                        style={{ position: "relative", marginBottom: 8, padding: "8px 12px", borderRadius: 8, cursor: "pointer", overflow: "hidden", border: voted ? "1px solid #1971FF" : "1px solid #2e3448", background: "#272c3a" }}>
                        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: voted ? "#1971FF33" : "#ffffff11", transition: "width 0.4s" }} />
                        <div style={{ position: "relative", display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: voted ? "#1971FF" : "#ddd", fontSize: 13 }}>{voted ? "✓ " : ""}{opt.label}</span>
                          <span style={{ color: "#aaa", fontSize: 12 }}>{pct}% ({opt.votes.length})</span>
                        </div>
                      </div>
                    );
                  })}
                  <p style={{ color: "#666", fontSize: 11, marginTop: 8 }}>by {activePoll.creatorName} · {activePoll.options.reduce((s, o) => s + o.votes.length, 0)} votes</p>
                  {socketRef.current?.id === activePoll.createdBy && (
                    <button onClick={() => { deletePoll(); setTimeout(() => setShowCreatePoll(true), 150); }}
                      style={{ marginTop: 10, width: "100%", padding: "7px 0", background: "transparent", color: "#1971FF", border: "1px dashed rgba(25,113,255,0.4)", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>+ Create Another Poll</button>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: "center", marginTop: 30 }}>
                  <img src={PollImage} alt="Poll" style={{ width: 80, opacity: 0.5 }} />
                  <p style={{ color: "#aaa", marginTop: 10 }}>No active poll</p>
                  <button onClick={() => setShowCreatePoll(true)}
                    style={{ marginTop: 12, padding: "8px 20px", background: "#1971FF", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Create Poll</button>
                </div>
              )}
            </div>
          </TabPanel>

        </Tabs>
      </div>
    </div>
  );
};

export default ChatCard;