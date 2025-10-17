"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import debounce from "lodash/debounce";
import { motion, AnimatePresence } from "framer-motion";

// Minimal inline Message + TypingIndicator so this file is self-contained and previewable.
function MessageBubble({ msg, isMe, onDelete, onEdit, onReact }) {
  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className={`max-w-[78%] break-words p-3 rounded-2xl shadow-sm ${isMe ? "bg-gradient-to-br from-blue-600 to-blue-500 text-white" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"}`}
      >
        <div className="text-sm leading-5">{msg.type === 'image' ? <img src={msg.content} alt="sent" className="rounded-md max-h-48 object-cover" /> : msg.content}</div>
        <div className="mt-1 text-[11px] opacity-70 flex items-center justify-end gap-2">
          {msg.edited && <span>(edited)</span>}
          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {isMe && <span className="ml-1">{msg.status}</span>}
        </div>
      </motion.div>
    </div>
  );
}

function TypingIndicator({ name }) {
  return (
    <div className="flex items-center gap-2 text-sm text-neutral-500">
      <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">💬</div>
      <div className="bg-neutral-100 dark:bg-neutral-800 px-3 py-2 rounded-lg">{name} is typing</div>
    </div>
  );
}

const TOP_EMOJIS = ["😀","😂","😍","🤣","😊","😭","🥰","😎","👍","🙏","😘","😅","🎉","🤔","🙄","😢","🔥","💯","❤️","👏"];

export default function ChatBox({
  socket,
  roomId,
  userId,
  soundOn = true,
  partnerName = "Stranger",
  partnerAge,
  partnerCountry,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);

  const messagesEndRef = useRef(null);
  const sentSoundRef = useRef(null);
  const receiveSoundRef = useRef(null);

  // auto-scroll with smooth behavior
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, partnerTyping, scrollToBottom]);

  // sound helper (gracefully fail if disabled by browser)
  const playSound = useCallback(async (type) => {
    if (!soundOn || muted) return;
    try {
      const ref = type === "sent" ? sentSoundRef : receiveSoundRef;
      await ref.current?.play();
    } catch (err) {
      // don't spam console in production — keep lightweight dev info
      console.debug("audio play blocked or unavailable", err?.message || err);
    }
  }, [soundOn, muted]);

  // initial connected state
  useEffect(() => {
    if (roomId && socket) setConnected(true);
  }, [roomId, socket]);

  // socket listeners
  useEffect(() => {
    if (!socket) return;

    const onTyping = ({ sender }) => {
      if (sender !== userId) {
        setPartnerTyping(true);
        // keep typing visible while events keep coming, hide after 2s of no events
        clearTimeout((onTyping as any)._t);
        (onTyping as any)._t = setTimeout(() => setPartnerTyping(false), 2000);
      }
    };

    const onReceive = (msg) => {
      setMessages(prev => [...prev, { ...msg, status: 'delivered' }]);
      socket.emit('message-status', { roomId, messageId: msg.id, status: 'seen' });
      playSound('receive');
    };

    const onStatus = ({ messageId, status }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status } : m));
    };

    socket.on('typing', onTyping);
    socket.on('receive-message', onReceive);
    socket.on('message-status-update', onStatus);

    // lightweight handlers for edits/deletes/reactions
    socket.on('message-deleted', ({ messageId }) => setMessages(prev => prev.filter(m => m.id !== messageId)));
    socket.on('message-edited', ({ id, content }) => setMessages(prev => prev.map(m => m.id === id ? { ...m, content, edited: true } : m)));
    socket.on('message-react', ({ messageId, reaction, user }) => setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: { ...m.reactions, [user]: reaction } } : m)));

    const onPartnerLeft = () => {
      setConnected(false);
      // keep messages but show disconnected state — less disruptive UX
    };
    socket.on('partner-left', onPartnerLeft);

    return () => {
      socket.off('typing', onTyping);
      socket.off('receive-message', onReceive);
      socket.off('message-status-update', onStatus);
      socket.off('message-deleted');
      socket.off('message-edited');
      socket.off('message-react');
      socket.off('partner-left', onPartnerLeft);
    };
  }, [socket, roomId, userId, playSound]);

  // debounce typing emitter
  const debouncedTyping = useRef(debounce(() => socket?.emit('typing', { roomId, sender: userId }), 400)).current;

  const sendMessage = useCallback((content, type = 'text') => {
    if (!content?.toString().trim() || !roomId || !connected) return;
    const id = uuidv4();
    const msg = { id, sender: userId, content, timestamp: new Date().toISOString(), type, status: 'sent', reactions: {} };
    socket.emit('send-message', { roomId, ...msg });
    setMessages(prev => [...prev, msg]);
    playSound('sent');
    setInput('');
    setShowEmojiPicker(false);
  }, [roomId, connected, socket, userId, playSound]);

  const handleFile = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => sendMessage(reader.result, file.type.startsWith('image') ? 'image' : 'file');
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [sendMessage]);

  const handleDelete = useCallback((id) => {
    socket?.emit('delete-message', { roomId, messageId: id });
    setMessages(prev => prev.filter(m => m.id !== id));
  }, [socket, roomId]);

  const handleEdit = useCallback((id, content) => {
    socket?.emit('edit-message', { roomId, messageId: id, content });
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content, edited: true } : m));
  }, [socket, roomId]);

  const handleReact = useCallback((id, emoji) => {
    socket?.emit('react-message', { roomId, messageId: id, reaction: emoji, user: userId });
    setMessages(prev => prev.map(m => m.id === id ? { ...m, reactions: { ...m.reactions, [userId]: emoji } } : m));
  }, [socket, roomId, userId]);

  // leave room on unload
  useEffect(() => {
    const before = () => socket && roomId && socket.emit('leave-room', roomId);
    window.addEventListener('beforeunload', before);
    return () => window.removeEventListener('beforeunload', before);
  }, [socket, roomId]);

  // memoized grouped messages (optional: group by sender/time)
  const grouped = useMemo(() => messages, [messages]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 border rounded-2xl overflow-hidden">
      <audio ref={sentSoundRef} src="/sounds/sent.mp3" preload="auto" />
      <audio ref={receiveSoundRef} src="/sounds/receive.mp3" preload="auto" />

      {/* Header */}
      <div className="px-4 py-3 bg-white dark:bg-neutral-900 border-b flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-semibold`}>{partnerName?.charAt(0) || 'S'}</div>
          <div className="leading-tight">
            <div className="font-medium text-sm flex items-center gap-2">
              <span className="text-sky-600 dark:text-sky-400">{partnerName}</span>
              <span className="text-xs text-neutral-400">{partnerAge ? `(${partnerAge})` : ''}</span>
            </div>
            <div className="text-xs text-neutral-500">{partnerCountry ? `from ${partnerCountry}` : (connected ? 'Online' : 'Offline')}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button aria-pressed={muted} onClick={() => setMuted(m => !m)} title={muted ? 'Unmute sounds' : 'Mute sounds'} className="px-2 py-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800">
            {muted ? '🔇' : '🔊'}
          </button>
          <button title="Copy room ID" onClick={() => navigator.clipboard?.writeText(roomId)} className="px-2 py-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800">🔗</button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-white/30 to-transparent dark:from-neutral-900/20">
        <AnimatePresence initial={false} mode="sync">
          {grouped.map(msg => (
            <MessageBubble key={msg.id} msg={msg} isMe={msg.sender === userId} onDelete={() => handleDelete(msg.id)} onEdit={(c) => handleEdit(msg.id, c)} onReact={(e) => handleReact(msg.id, e)} />
          ))}
        </AnimatePresence>

        {partnerTyping && <div><TypingIndicator name={partnerName} /></div>}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji picker (floating) */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }} className="absolute bottom-20 left-4 bg-white dark:bg-neutral-800 border rounded-xl shadow-xl p-3 w-64 max-h-64 overflow-y-auto grid grid-cols-6 gap-2 z-30">
            {TOP_EMOJIS.map(e => (
              <button key={e} onClick={() => setInput(prev => prev + e)} className="text-2xl hover:scale-110 transition-transform" aria-label={`insert ${e}`}>
                {e}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="border-t px-4 py-3 flex items-center gap-3 bg-white dark:bg-neutral-900">
        <button onClick={() => setShowEmojiPicker(s => !s)} className="text-2xl" aria-label="Toggle emoji picker">😊</button>
        <input
          type="text"
          placeholder={connected ? "Type a message..." : "Waiting for partner..."}
          value={input}
          disabled={!connected}
          onChange={(e) => { setInput(e.target.value); debouncedTyping(); }}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
          className="flex-1 bg-neutral-100 dark:bg-neutral-800 px-4 py-2 rounded-full focus:outline-none"
          aria-label="Message input"
        />

        <label className="cursor-pointer p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800" title="Attach file">
          📎
          <input type="file" accept="image/*,audio/*,video/*" hidden onChange={handleFile} disabled={!connected} />
        </label>

        <button onClick={() => sendMessage(input)} disabled={!input.trim() || !connected} className="px-4 py-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 text-white disabled:opacity-50">
          Send
        </button>
      </div>
    </div>
  );
}
