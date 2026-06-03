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

// ─── Helper: deterministic private room key ───────────────────────────────────
// Given two socket IDs, always produces the same key regardless of order.
function makePrivateRoomId(idA, idB) {
  return [idA, idB].sort().join("_");
}

const ChatCard = ({ userList, onToggleChat, hostId, privateMessages, setPrivateMessages, privateUnread, setPrivateUnread, mySocketIdRef: mySocketIdRefProp }) => {
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
  const [groupMessages, setGroupMessages]     = useState([]);
  // privateMessages and privateUnread are lifted to MeetingSection — received as props.
  const [groupText, setGroupText]             = useState("");
  const [privateText, setPrivateText]         = useState("");

  // activePrivateUser: the participant whose DM panel is currently open.
  // null = no panel open (but messages are still being received & stored).
  const [activePrivateUser, setActivePrivateUser] = useState(null);

  const [unreadCount, setUnreadCount]   = useState(0);
  const [activeTabIndex, setActiveTabIndex] = useState(0);


  // Poll state (unchanged)
  const [activePoll, setActivePoll]         = useState(null);
  const [myVote, setMyVote]                 = useState(null);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [isEditingPoll, setIsEditingPoll]   = useState(false);
  const [pollQuestion, setPollQuestion]     = useState("");
  const [pollOptions, setPollOptions]       = useState(["", ""]);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const activeTabRef      = useRef(0);
  const activePrivateRef  = useRef(null);
  const groupChatEndRef   = useRef(null);
  const privateChatEndRef = useRef(null);
  // mySocketIdRef: always call useRef (Rules of Hooks — no conditional).
  // When MeetingSection passes mySocketIdRefProp we use that ref object;
  // the local ref below is just a stable fallback slot, never written to.
  const _localSocketIdRef = useRef(null);
  const mySocketIdRef = mySocketIdRefProp ?? _localSocketIdRef;



  // ── Build participants list + PRE-INITIALISE private message buckets ───────
  //
  // This is the core fix. Previously private message buckets only existed after
  // `openPrivateChat` was called (i.e. the user clicked a name). That meant:
  //   - Incoming messages before the first click were stored under an orphan key
  //     that the UI never looked up.
  //   - The chat box was only shown after a click, so there was no way to see
  //     unread messages without clicking first.
  //
  // Now, as soon as a participant appears in userList we:
  //   1. Add them to the participants array (with their privateRoomId computed).
  //   2. Ensure their privateMessages bucket exists (empty if no messages yet).
  //
  useEffect(() => {
    const socket = socketRef.current;
    const myId   = socket?.id || "me";
    mySocketIdRef.current = myId;

    const myEntry = {
      userId: myId,
      name:   myName,
      muted:  false,
      videoOff: false,
      authId: null,
      _isMe:  true,
      privateRoomId: null, // self has no private room
    };

    const others = (userList || []).map(p => ({
      ...p,
      // Attach the canonical key right on the participant object.
      // Every piece of code that needs the key reads it from here — one
      // source of truth, no re-computation, no mismatches.
      privateRoomId: makePrivateRoomId(myId, p.userId),
    }));

    setParticipants([myEntry, ...others]);

    // Message buckets are pre-initialised in MeetingSection — nothing to do here.
  }, [userList, myName]);

  // ── Keep activePrivateRef in sync ─────────────────────────────────────────
  useEffect(() => {
    activePrivateRef.current = activePrivateUser;
  }, [activePrivateUser]);

  // ── Socket listeners ───────────────────────────────────────────────────────
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.emit("join-chat", { roomId });

    // ── Group chat ──
    socket.on("react:meeting:message", (msg) => {
      setGroupMessages(prev => [...prev, msg]);
      if (activeTabRef.current !== 1) setUnreadCount(c => c + 1);
    });

    // react:meeting:private is handled in MeetingSection (always-on).

    // ── Polls ──
    socket.on("react:meeting:poll:new",    ({ poll }) => { setActivePoll(poll); setMyVote(null); });
    socket.on("react:meeting:poll:update", ({ poll }) => setActivePoll(poll));
    socket.on("react:meeting:poll:closed", ()         => { setActivePoll(null); setMyVote(null); });

    return () => {
      socket.off("react:meeting:message");
      // react:meeting:private is cleaned up in MeetingSection
      socket.off("react:meeting:poll:new");
      socket.off("react:meeting:poll:update");
      socket.off("react:meeting:poll:closed");
    };
  }, [socketRef.current]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    groupChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupMessages]);

  useEffect(() => {
    privateChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [privateMessages, activePrivateUser]);

  // ── Tab change ─────────────────────────────────────────────────────────────
  const handleTabSelect = (index) => {
    activeTabRef.current = index;
    setActiveTabIndex(index);
    if (index === 1) setUnreadCount(0);
  };

  // ── Open / close private chat panel ───────────────────────────────────────
  // Now this just changes which participant's panel is visible —
  // the message bucket already exists regardless.
  const openPrivateChat = (participant) => {
    if (!participant || participant._isMe) return;
    setActivePrivateUser(participant); // participant already has privateRoomId
    activePrivateRef.current = participant;
    // Clear unread for this person when we open their panel
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
      roomId:     activePrivateUser.privateRoomId, // sorted-IDs key
      senderId:   myId,
      receiverId: activePrivateUser.userId,        // server routes to this socket
      name:       myName,
      userName:   myName,
      message:    privateText,
      time:       new Date().toLocaleTimeString(),
    };

    socket.emit("react:meeting:private", msg);

    // Add sender-side copy immediately (server echo also arrives but dedup by
    // the fact that the socket listener stores ALL messages including own echoes —
    // we DON'T add it here a second time; let the echo be the single source).
    // Actually: the server echoes back to the sender, so we let that be the
    // single write. No local optimistic insert needed, avoiding double messages.

    setPrivateText("");
  };

  // ── Poll handlers (unchanged) ──────────────────────────────────────────────
  const handleVote = (optionId) => {
    if (myVote === optionId) return;
    setMyVote(optionId);
    socketRef.current.emit("react:meeting:poll:vote", { roomId, pollId: activePoll.pollId, optionId });
  };

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
  const hasUnread          = unreadCount > 0 && activeTabIndex !== 1;
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

              {/* Participant list */}
              {participants.map((p, i) => {
                const isHost     = p.authId?.toString() === hostId?.toString();
                const isMe       = p._isMe === true;
                const unreadPriv = privateUnread[p.userId] || 0;
                const isActive   = activePrivateUser?.userId === p.userId;

                return (
                  <div
                    className="profileDetailCnt"
                    key={p.userId || i}
                    onClick={() => openPrivateChat(p)}
                    style={{
                      cursor: isMe ? "default" : "pointer",
                      // Highlight the currently open DM
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
                      <div title={p.videoOff ? "Cam Off" : "Cam On"}><img src={p.videoOff ? UserCamOff : UserCamOn} alt="Cam" /></div>
                      <div><img src={UserMoreIcon} alt="More" /></div>
                    </div>
                  </div>
                );
              })}

              {/* ── Private chat panel ── */}
              {/* Shown when a participant is selected. The message bucket always
                  exists now, so messages sent before the panel was opened are
                  visible immediately. */}
              {activePrivateUser && (
                <div className="privateChatBox">
                  <div className="hdAndClose">
                    <h4>Private Chat with {activePrivateUser.name}</h4>
                    <button onClick={closePrivateChat} style={{ marginTop: 6 }}>Close X</button>
                  </div>

                  <div className="privateChatMessages" onScroll={handlePrivateChatScroll}>
                    {(privateMessages[activePrivateUser.privateRoomId] || []).length === 0 ? (
                      <p style={{ color: "#666", fontSize: 12, textAlign: "center", marginTop: 20 }}>
                        No messages yet. Say hi! 👋
                      </p>
                    ) : (
                      (privateMessages[activePrivateUser.privateRoomId] || []).map((msg, i) => {
                        const mine = msg.senderId === (mySocketIdRef.current || socketRef.current?.id);
                        return (
                          <div key={i} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                            <div className="privateChatBgColor" style={{ marginBottom: 6 }}>
                              <p className="privateChatUserName"><b>{msg.userName || msg.name}</b></p>
                              <p className="privateMsg">{msg.message}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={privateChatEndRef} />
                  </div>

                  <div className="msgBoxCnt">
                    <button><img src={DocAttachIcon} alt="Attachment" /></button>
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
                const mine = msg.id === socketRef.current?.id;
                return (
                  <div className="participantsChatCnt" key={i} style={{ justifyContent: mine ? "flex-end" : "flex-start" }}>
                    <div className="chatProfile"><div>{msg.name?.[0]}</div></div>
                    <div className="indProfileChat">
                      <div className="userCnt">
                        <div className="timeCnt">
                          <p className="userName">{msg.name}</p>
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