import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiBell, FiMenu } from 'react-icons/fi';
import api from '../api/axios';

const Header = ({ title }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unread, setUnread] = useState(0);
    const [showNotif, setShowNotif] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);

        const handleSync = () => fetchNotifications();
        window.addEventListener('notificationsRead', handleSync);

        return () => {
            clearInterval(interval);
            window.removeEventListener('notificationsRead', handleSync);
        };
    }, []);

    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowNotif(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data.data.notifications);
            setUnread(res.data.data.unreadCount);
        } catch (err) { /* silent */ }
    };

    const handleNotificationClick = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            fetchNotifications();
            window.dispatchEvent(new Event('notificationsRead'));
        } catch (err) { /* silent */ }
        
        setShowNotif(false);
        navigate('/notifications');
    };

    const markAllRead = async () => {
        try {
            await api.put('/notifications/read-all');
            fetchNotifications();
            window.dispatchEvent(new Event('notificationsRead'));
        } catch (err) { /* silent */ }
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
        <header className="header">
            <h2 className="header-title">{title}</h2>
            <div className="header-actions">
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
                                        className={`notification-item ${!n.is_read ? 'unread' : ''}`}
                                        onClick={() => handleNotificationClick(n.id)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <h4>{n.title}</h4>
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
    );
};

export default Header;
