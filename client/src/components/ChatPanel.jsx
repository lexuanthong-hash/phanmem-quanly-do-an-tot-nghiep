import { useState, useEffect, useRef, useCallback } from 'react';
import { FiMessageSquare, FiX, FiSend, FiChevronDown } from 'react-icons/fi';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const ChatPanel = ({ isOpen, onClose, initialConversationId, onUnreadChange }) => {
    const { user, isLecturer, isStudent } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const lastMessageIdRef = useRef(0);
    const pickerRef = useRef(null);

    const activeConv = conversations.find(c => c.id === activeId);

    const scrollToBottom = (smooth = true) => {
        messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    };

    const fetchConversations = useCallback(async () => {
        try {
            const res = await api.get('/messages/conversations');
            const list = res.data.data || [];
            setConversations(list);
            return list;
        } catch (err) {
            return [];
        }
    }, []);

    const fetchMessages = useCallback(async (convId, silent = false) => {
        if (!convId) return;
        try {
            if (!silent) setLoading(true);
            const params = lastMessageIdRef.current > 0 && silent
                ? { after_id: lastMessageIdRef.current, limit: 50 }
                : { limit: 100 };

            const res = await api.get(`/messages/conversations/${convId}/messages`, { params });
            const newMsgs = res.data.data.messages || [];

            if (silent && lastMessageIdRef.current > 0) {
                if (newMsgs.length > 0) {
                    setMessages(prev => {
                        const ids = new Set(prev.map(m => m.id));
                        const merged = [...prev, ...newMsgs.filter(m => !ids.has(m.id))];
                        return merged;
                    });
                    lastMessageIdRef.current = Math.max(lastMessageIdRef.current, ...newMsgs.map(m => m.id));
                }
            } else {
                setMessages(newMsgs);
                lastMessageIdRef.current = newMsgs.length > 0 ? newMsgs[newMsgs.length - 1].id : 0;
            }

            await api.put(`/messages/conversations/${convId}/read`);
            onUnreadChange?.();
            window.dispatchEvent(new Event('chatRead'));
        } catch (err) {
            if (!silent) setMessages([]);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [onUnreadChange]);

    const selectConversation = useCallback(async (convId) => {
        setActiveId(convId);
        setShowPicker(false);
        lastMessageIdRef.current = 0;
        setMessages([]);
        await fetchMessages(convId, false);
    }, [fetchMessages]);

    useEffect(() => {
        if (!isOpen) return;

        const init = async () => {
            const list = await fetchConversations();
            if (initialConversationId) {
                const exists = list.find(c => c.id === initialConversationId);
                if (exists) {
                    await selectConversation(initialConversationId);
                } else if (list.length > 0) {
                    await selectConversation(list[0].id);
                }
            } else if (list.length > 0) {
                await selectConversation(list[0].id);
            }
        };
        init();
    }, [isOpen, initialConversationId, fetchConversations, selectConversation]);

    useEffect(() => {
        if (!isOpen || !activeId) return;
        scrollToBottom(false);
        const interval = setInterval(() => fetchMessages(activeId, true), 5000);
        return () => clearInterval(interval);
    }, [isOpen, activeId, fetchMessages]);

    useEffect(() => {
        if (messages.length > 0) scrollToBottom();
    }, [messages.length]);

    useEffect(() => {
        const handler = (e) => {
            if (e.detail?.conversationId) {
                selectConversation(e.detail.conversationId);
            }
        };
        window.addEventListener('selectChatConversation', handler);
        return () => window.removeEventListener('selectChatConversation', handler);
    }, [selectConversation]);

    useEffect(() => {
        const handler = (e) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target)) {
                setShowPicker(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSend = async (e) => {
        e.preventDefault();
        const text = input.trim();
        if (!text || !activeId || sending) return;

        setSending(true);
        setInput('');
        try {
            const res = await api.post(`/messages/conversations/${activeId}/messages`, { content: text });
            const msg = res.data.data;
            setMessages(prev => [...prev, msg]);
            lastMessageIdRef.current = msg.id;
            scrollToBottom();
            fetchConversations();
        } catch (err) {
            setInput(text);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend(e);
        }
    };

    if (!isOpen) return null;

    const emptyState = conversations.length === 0;

    return (
        <>
            <div className="chat-overlay" onClick={onClose} />
            <aside className="chat-panel">
                <div className="chat-panel-header">
                    <div className="chat-panel-title">
                        <FiMessageSquare />
                        <span>Trao đổi</span>
                    </div>
                    <button type="button" className="chat-panel-close" onClick={onClose} aria-label="Đóng">
                        <FiX />
                    </button>
                </div>

                {emptyState ? (
                    <div className="chat-empty">
                        <FiMessageSquare size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                        <p><strong>Chưa có hội thoại</strong></p>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                            {isStudent
                                ? 'Chat sẽ mở sau khi bạn được phân công đề tài.'
                                : 'Chưa có sinh viên nào được phân công đề tài của bạn.'}
                        </p>
                    </div>
                ) : (
                    <>
                        {isLecturer && conversations.length > 0 && (
                            <div className="chat-conv-picker" ref={pickerRef}>
                                <button
                                    type="button"
                                    className="chat-conv-picker-btn"
                                    onClick={() => setShowPicker(!showPicker)}
                                >
                                    <div className="chat-conv-picker-info">
                                        <strong>{activeConv?.student_name || 'Chọn sinh viên'}</strong>
                                        <span>{activeConv?.student_code} · {activeConv?.topic_title}</span>
                                    </div>
                                    <FiChevronDown className={showPicker ? 'rotated' : ''} />
                                </button>
                                {showPicker && (
                                    <div className="chat-conv-picker-dropdown">
                                        {conversations.map(c => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                className={`chat-conv-option ${c.id === activeId ? 'active' : ''}`}
                                                onClick={() => selectConversation(c.id)}
                                            >
                                                <div>
                                                    <strong>{c.student_name}</strong>
                                                    <span>{c.student_code} · {c.topic_title}</span>
                                                </div>
                                                {c.unread_count > 0 && (
                                                    <span className="chat-conv-unread">{c.unread_count}</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {isStudent && activeConv && (
                            <div className="chat-conv-info">
                                <strong>{activeConv.lecturer_name}</strong>
                                <span>{activeConv.topic_title}</span>
                            </div>
                        )}

                        <div className="chat-messages" ref={messagesContainerRef}>
                            {loading ? (
                                <div className="chat-loading"><div className="spinner" /></div>
                            ) : messages.length === 0 ? (
                                <div className="chat-no-messages">
                                    <p>Chưa có tin nhắn. Hãy bắt đầu trao đổi!</p>
                                </div>
                            ) : (
                                messages.map(msg => {
                                    const isMine = msg.sender_id === user?.id;
                                    return (
                                        <div key={msg.id} className={`chat-bubble-row ${isMine ? 'mine' : 'theirs'}`}>
                                            {!isMine && (
                                                <div className="chat-avatar">
                                                    {msg.sender_name?.charAt(0) || '?'}
                                                </div>
                                            )}
                                            <div className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`}>
                                                {!isMine && isLecturer && (
                                                    <span className="chat-bubble-name">{msg.sender_name}</span>
                                                )}
                                                <p>{msg.content}</p>
                                                <time>{formatTime(msg.created_at)}</time>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <form className="chat-input-bar" onSubmit={handleSend}>
                            <textarea
                                className="chat-input"
                                placeholder="Nhập tin nhắn... (Enter gửi, Shift+Enter xuống dòng)"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                rows={1}
                                disabled={!activeId}
                            />
                            <button
                                type="submit"
                                className="chat-send-btn"
                                disabled={!input.trim() || sending || !activeId}
                                aria-label="Gửi"
                            >
                                <FiSend />
                            </button>
                        </form>
                    </>
                )}
            </aside>
        </>
    );
};

export default ChatPanel;
