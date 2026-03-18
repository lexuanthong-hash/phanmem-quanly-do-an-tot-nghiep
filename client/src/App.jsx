import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Topics from './pages/Topics';
import Wishes from './pages/Wishes';
import Milestones from './pages/Milestones';
import Progress from './pages/Progress';
import Grades from './pages/Grades';
import Users from './pages/Users';
import Notifications from './pages/Notifications';
import AuditLogs from './pages/AuditLogs';

// Component bảo vệ route (yêu cầu đăng nhập)
const ProtectedRoute = ({ children, roles }) => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" />;
    if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
    return children;
};

// Layout chính (có sidebar)
const MainLayout = ({ children }) => (
    <div className="app-layout">
        <Sidebar />
        <main className="main-content">
            <div className="page-content">
                {children}
            </div>
        </main>
    </div>
);

const App = () => {
    const { user } = useAuth();

    if (!user) {
        return (
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        );
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/topics" element={<Topics />} />
                    <Route path="/wishes" element={<Wishes />} />
                    <Route path="/milestones" element={
                        <ProtectedRoute roles={['admin', 'lecturer']}><Milestones /></ProtectedRoute>
                    } />
                    <Route path="/progress" element={<Progress />} />
                    <Route path="/grades" element={<Grades />} />
                    <Route path="/users" element={
                        <ProtectedRoute roles={['admin', 'lecturer', 'student']}><Users /></ProtectedRoute>
                    } />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/audit-logs" element={
                        <ProtectedRoute roles={['admin']}><AuditLogs /></ProtectedRoute>
                    } />
                    <Route path="/login" element={<Navigate to="/" />} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </main>
        </div>
    );
};

export default App;
