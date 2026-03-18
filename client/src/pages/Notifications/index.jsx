import { useState, useEffect } from 'react';
import api from '../../api/axios';
import Header from '../../components/Header';
import { FiBell, FiCheck } from 'react-icons/fi';

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
        const handleSync = () => fetchNotifications();
        window.addEventListener('notificationsRead', handleSync);
        return () => window.removeEventListener('notificationsRead', handleSync);
    }, []);

    const fetchNotifications = async () => {
        try { const res = await api.get('/notifications'); setNotifications(res.data.data.notifications); } catch (err) { } finally { setLoading(false); }
    };

    const markAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            fetchNotifications();
            window.dispatchEvent(new Event('notificationsRead'));
        } catch (err) { }
    };

    const markAllRead = async () => {
        try {
            await api.put('/notifications/read-all');
            fetchNotifications();
            window.dispatchEvent(new Event('notificationsRead'));
        } catch (err) { }
    };

    const typeIcon = { deadline: '⏰', approval: '✅', grade: '📊', system: '🔔', reminder: '📌' };

    const formatTime = (d) => {
        const diff = Math.floor((new Date() - new Date(d)) / 60000);
        if (diff < 1) return 'Vừa xong';
        if (diff < 60) return `${diff} phút trước`;
        if (diff < 1440) return `${Math.floor(diff / 60)} giờ trước`;
        return new Date(d).toLocaleDateString('vi-VN');
    };

    return (
        <>
            <Header title="Thông báo" />
            <div className="page-content animate-fade">
                <div className="page-header">
                    <div><h1><FiBell style={{ verticalAlign: 'middle' }} /> Thông báo</h1><p>Xem các thông báo từ hệ thống</p></div>
                    <button className="btn btn-outline" onClick={markAllRead}><FiCheck /> Đọc tất cả</button>
                </div>

                {loading ? <div className="loading"><div className="spinner"></div></div> : (
                    <div className="card" style={{ padding: 0 }}>
                        {notifications.length === 0 ? <div className="empty-state"><h3>Chưa có thông báo</h3></div> :
                            notifications.map(n => (
                                <div key={n.id} className={`notification-item ${!n.is_read ? 'unread' : ''}`} onClick={() => !n.is_read && markAsRead(n.id)} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: 24 }}>{typeIcon[n.type] || '🔔'}</span>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ color: !n.is_read ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{n.title}</h4>
                                        <p>{n.message}</p>
                                        <time>{formatTime(n.created_at)}</time>
                                    </div>
                                    {!n.is_read && <span className="badge badge-primary" style={{ flexShrink: 0 }}>Mới</span>}
                                </div>
                            ))
                        }
                    </div>
                )}
            </div>
        </>
    );
};

export default Notifications;
