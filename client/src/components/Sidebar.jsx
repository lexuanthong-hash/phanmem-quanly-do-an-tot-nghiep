import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    FiHome, FiBook, FiHeart, FiCheckSquare, FiBarChart2,
    FiUsers, FiBell, FiFileText, FiList, FiAward, FiLogOut, FiTarget
} from 'react-icons/fi';

const Sidebar = () => {
    const { user, logout, isAdmin, isLecturer, isStudent } = useAuth();
    const location = useLocation();

    const roleLabel = { admin: 'Quản trị viên', lecturer: 'Giảng viên', student: 'Sinh viên' };

    const menuItems = [
        { to: '/', icon: FiHome, label: 'Dashboard', roles: ['admin', 'lecturer', 'student'] },
        { section: 'Quản lý' },
        { to: '/topics', icon: FiBook, label: 'Đề tài', roles: ['admin', 'lecturer', 'student'] },
        { to: '/wishes', icon: FiHeart, label: isStudent ? 'Đăng ký NV' : 'Duyệt NV', roles: ['admin', 'lecturer', 'student'] },
        { section: 'Tiến độ' },
        { to: '/milestones', icon: FiTarget, label: 'Mốc tiến độ', roles: ['admin', 'lecturer'] },
        { to: '/progress', icon: FiCheckSquare, label: isStudent ? 'Nộp tiến độ' : 'Xem tiến độ', roles: ['admin', 'lecturer', 'student'] },
        { section: 'Đánh giá' },
        { to: '/grades', icon: FiAward, label: isStudent ? 'Xem điểm' : 'Chấm điểm', roles: ['admin', 'lecturer', 'student'] },
        { section: 'Hệ thống' },
        { to: '/users', icon: FiUsers, label: isAdmin ? 'Tài khoản' : 'Sinh viên', roles: ['admin', 'lecturer', 'student'] },
        { to: '/notifications', icon: FiBell, label: 'Thông báo', roles: ['admin', 'lecturer', 'student'] },
        { to: '/audit-logs', icon: FiFileText, label: 'Audit Log', roles: ['admin'] },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">🎓</div>
                <div>
                    <h1>QLĐATN</h1>
                    <span>Quản lý Đồ án</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item, i) => {
                    if (item.section) {
                        return <div key={i} className="sidebar-section-title">{item.section}</div>;
                    }
                    if (item.roles && !item.roles.includes(user?.role)) return null;
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                            end={item.to === '/'}
                        >
                            <Icon />
                            <span>{item.label}</span>
                        </NavLink>
                    );
                })}
            </nav>

            <div className="sidebar-user">
                <div className="sidebar-avatar">
                    {user?.full_name?.charAt(0) || 'U'}
                </div>
                <div className="sidebar-user-info">
                    <div className="sidebar-user-name">{user?.full_name}</div>
                    <div className="sidebar-user-role">{roleLabel[user?.role]}</div>
                </div>
                <button className="sidebar-link" onClick={logout} style={{ width: 'auto', padding: '8px' }} title="Đăng xuất">
                    <FiLogOut />
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
