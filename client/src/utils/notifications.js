export const isNotificationUnread = (n) => Number(n?.is_read) === 0;

export const markNotificationReadLocally = (notifications, id) =>
    notifications.map(n => (n.id === id ? { ...n, is_read: 1 } : n));

export const markAllNotificationsReadLocally = (notifications) =>
    notifications.map(n => ({ ...n, is_read: 1 }));
