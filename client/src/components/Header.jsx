import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiBell, FiMessageSquare } from 'react-icons/fi';
import api from '../api/axios';
import ChatPanel from './ChatPanel';
import {
    isNotificationUnread,
    markNotificationReadLocally,
    markAllNotificationsReadLocally,
} from '../utils/notifications';

const Header = ({ title }) => {
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unread, setUnread] = useState(0);
    const [chatUnread, setChatUnread] = useState(0);
    const [showNotif, setShowNotif] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [chatConversationId, setChatConversationId] = useState(null);
    const dropdownRef = useRef(null);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data.data.notifications);
            setUnread(Number(res.data.data.unreadCount) || 0);
        } catch (err) { /* silent */ }
    };

    const markOneRead = async (n) => {
        if (!isNotificationUnread(n)) return;

        setNotifications(prev => markNotificationReadLocally(prev, n.id));
        setUnread(prev => Math.max(0, prev - 1));

        try {
            await api.put(`/notifications/${n.id}/read`);
            await fetchNotifications();
            window.dispatchEvent(new Event('notificationsRead'));
        } catch (err) {
            await fetchNotifications();
        }
    };

    const fetchChatUnread = async () => {
        if (isAdmin) return;
        try {
            const res = await api.get('/messages/unread-count');
            setChatUnread(res.data.data.unreadCount);
        } catch (err) { /* silent */ }
    };

    useEffect(() => {
        fetchNotifications();
        fetchChatUnread();
        const interval = setInterval(() => {
            fetchNotifications();
            if (!showChat) fetchChatUnread();
        }, 30000);

        const handleSync = () => fetchNotifications();
        const handleChatRead = () => fetchChatUnread();
        const handleOpenChat = (e) => {
            const convId = e.detail?.conversationId;
            if (convId) setChatConversationId(convId);
            setShowNotif(false);
            setShowChat(true);
        };

        window.addEventListener('notificationsRead', handleSync);
        window.addEventListener('chatRead', handleChatRead);
        window.addEventListener('openChat', handleOpenChat);

        return () => {
            clearInterval(interval);
            window.removeEventListener('notificationsRead', handleSync);
            window.removeEventListener('chatRead', handleChatRead);
            window.removeEventListener('openChat', handleOpenChat);
        };
    }, [isAdmin, showChat]);

    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowNotif(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleNotificationClick = async (n) => {
        await markOneRead(n);
        setShowNotif(false);

        if (n.type === 'message' && n.link?.startsWith('chat:')) {
            const convId = parseInt(n.link.replace('chat:', ''), 10);
            setChatConversationId(convId);
            setShowChat(true);
            return;
        }

        navigate('/notifications');
    };

    const markAllRead = async () => {
        setNotifications(prev => markAllNotificationsReadLocally(prev));
        setUnread(0);

        try {
            await api.put('/notifications/read-all');
            await fetchNotifications();
            window.dispatchEvent(new Event('notificationsRead'));
        } catch (err) {
            await fetchNotifications();
        }
    };

    const openChatPanel = () => {
        setShowNotif(false);
        setChatConversationId(null);
        setShowChat(true);
    };

    const closeChatPanel = () => {
        setShowChat(false);
        setChatConversationId(null);
        fetchChatUnread();
    };

    const formatTime = (dateStr) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now - d) / 60000);
        if (diff < 1) return 'Vừa xong';
        if (diff < 60) return `${diff} phút trước`;
        if (diff < 1440) return `${Math.floor(diff / 60)} giờ trước`;
        return d.toLocaleDateString('vi-VN');
    };

    return (
        <>
            <header className="header">
                <h2 className="header-title">{title}</h2>
                <div className="header-actions">
                    {!isAdmin && (
                        <button
                            className="header-btn"
                            onClick={openChatPanel}
                            id="chat-btn"
                            title="Trao đổi"
                        >
                            <FiMessageSquare />
                            {chatUnread > 0 && (
                                <span className="badge">{chatUnread > 9 ? '9+' : chatUnread}</span>
                            )}
                        </button>
                    )}

                    <div style={{ position: 'relative' }} ref={dropdownRef}>
                        <button className="header-btn" onClick={() => setShowNotif(!showNotif)} id="notification-btn">
                            <FiBell />
                            {unread > 0 && <span className="badge">{unread > 9 ? '9+' : unread}</span>}
                        </button>

                        {showNotif && (
                            <div className="notification-dropdown animate-slide">
                                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <strong style={{ fontSize: '14px' }}>Thông báo</strong>
                                    {unread > 0 && (
                                        <button className="btn btn-sm btn-outline" onClick={markAllRead}>Đọc tất cả</button>
                                    )}
                                </div>
                                {notifications.length === 0 ? (
                                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                        Không có thông báo
                                    </div>
                                ) : (
                                    notifications.slice(0, 10).map(n => (
                                        <div
                                            key={n.id}
                                            className={`notification-item ${isNotificationUnread(n) ? 'unread' : ''}`}
                                            onClick={() => handleNotificationClick(n)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                                                <h4 style={{ color: isNotificationUnread(n) ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{n.title}</h4>
                                                {isNotificationUnread(n) && (
                                                    <span className="badge badge-primary" style={{ flexShrink: 0, fontSize: 10 }}>Mới</span>
                                                )}
                                            </div>
                                            <p>{n.message}</p>
                                            <time>{formatTime(n.created_at)}</time>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {!isAdmin && (
                <ChatPanel
                    isOpen={showChat}
                    onClose={closeChatPanel}
                    initialConversationId={chatConversationId}
                    onUnreadChange={fetchChatUnread}
                />
            )}
        </>
    );
};

export default Header;
