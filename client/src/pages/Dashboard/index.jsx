import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/axios';
import Header from '../../components/Header';
import { useAuth } from '../../contexts/AuthContext';
import { FiUsers, FiBook, FiCheckSquare, FiAward, FiHeart, FiBarChart2, FiTrendingUp, FiClock } from 'react-icons/fi';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const Dashboard = () => {
    const { isAdmin, isLecturer, isStudent } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch khi load và mỗi lần navigate về Dashboard
    useEffect(() => { fetchStats(); }, [location.key]);

    // Polling tự động mỗi 30 giây
    useEffect(() => {
        const interval = setInterval(() => fetchStats(), 30000);
        return () => clearInterval(interval);
    }, []);

    // Lắng nghe custom event khi có thay đổi dữ liệu (thêm/xóa user, topic...)
    useEffect(() => {
        const onStatsChanged = () => fetchStats();
        window.addEventListener('statsChanged', onStatsChanged);
        window.addEventListener('focus', onStatsChanged);
        return () => {
            window.removeEventListener('statsChanged', onStatsChanged);
            window.removeEventListener('focus', onStatsChanged);
        };
    }, []);


    const fetchStats = async () => {
        try {
            const res = await api.get('/dashboard/stats');
            setStats(res.data.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleExport = async (type) => {
        try {
            const res = await api.get(`/dashboard/export?type=${type}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `report_${type}_${Date.now()}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) { console.error(err); }
    };

    if (loading) return <><Header title="Dashboard" /><div className="loading"><div className="spinner"></div></div></>;

    const o = stats?.overview || {};
    const statusLabels = { draft: 'Nháp', approved: 'Đã duyệt', assigned: 'Đã phân', in_progress: 'Đang TH', completed: 'Hoàn thành' };

    return (
        <>
            <Header title="Dashboard" />
            <div className="page-content animate-fade">
                <div className="page-header">
                    <div>
                        <h1>📊 Tổng quan hệ thống</h1>
                        <p>Thống kê và báo cáo quản lý đồ án tốt nghiệp</p>
                    </div>
                    {(isAdmin || isLecturer) && (
                        <div className="btn-group">
                            <button className="btn btn-outline" onClick={() => handleExport('topics')}>📥 Xuất DS đề tài</button>
                            <button className="btn btn-primary" onClick={() => handleExport('grades')}>📥 Xuất bảng điểm</button>
                        </div>
                    )}
                </div>

                <div className="stat-grid">
                    <div className="stat-card hover-scale" style={{ cursor: 'pointer' }} onClick={() => navigate('/users', { state: { role: 'student', viewOnly: true } })}>
                        <div className="stat-icon primary"><FiUsers /></div>
                        <div><div className="stat-value">{o.totalStudents || 0}</div><div className="stat-label">Sinh viên</div></div>
                    </div>
                    <div className="stat-card hover-scale" style={{ cursor: 'pointer' }} onClick={() => navigate('/topics')}>
                        <div className="stat-icon info"><FiBook /></div>
                        <div><div className="stat-value">{o.totalTopics || 0}</div><div className="stat-label">Đề tài</div></div>
                    </div>
                    <div className="stat-card hover-scale" style={{ cursor: 'pointer' }} onClick={() => navigate('/wishes')}>
                        <div className="stat-icon warning"><FiHeart /></div>
                        <div><div className="stat-value">{o.pendingWishes || 0}</div><div className="stat-label">NV chờ duyệt</div></div>
                    </div>
                    {(isAdmin || isLecturer) && (
                        <div className="stat-card hover-scale" style={{ cursor: 'pointer' }} onClick={() => navigate('/progress')}>
                            <div className="stat-icon success"><FiCheckSquare /></div>
                            <div><div className="stat-value">{o.totalAssignments || 0}</div><div className="stat-label">Đã phân công</div></div>
                        </div>
                    )}
                    {isStudent ? (
                        // Sinh viên: hiển thị điểm cá nhân hoặc trạng thái
                        <div className="stat-card hover-scale" style={{ cursor: 'pointer' }} onClick={() => navigate('/grades')}>
                            <div className="stat-icon danger"><FiAward /></div>
                            <div>
                                {stats?.studentInfo?.status === 'graded' ? (
                                    <>
                                        <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.studentInfo.score}</div>
                                        <div className="stat-label">Điểm của bạn</div>
                                    </>
                                ) : stats?.studentInfo?.status === 'assigned' ? (
                                    <>
                                        <div className="stat-value" style={{ fontSize: 16, color: 'var(--warning)' }}>⏳</div>
                                        <div className="stat-label">Chờ kết quả</div>
                                    </>
                                ) : stats?.studentInfo?.status === 'has_wish' ? (
                                    <>
                                        <div className="stat-value" style={{ fontSize: 16, color: 'var(--info)' }}>📋</div>
                                        <div className="stat-label">Chờ duyệt NV</div>
                                    </>
                                ) : (
                                    <>
                                        <div className="stat-value" style={{ fontSize: 14, color: 'var(--text-muted)' }}>—</div>
                                        <div className="stat-label">Chưa chọn đề tài</div>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        // Admin/Giảng viên: Điểm TB toàn hệ thống
                        <div className="stat-card hover-scale" style={{ cursor: 'pointer' }} onClick={() => navigate('/grades')}>
                            <div className="stat-icon danger"><FiAward /></div>
                            <div><div className="stat-value">{stats?.avgScore || 0}</div><div className="stat-label">Điểm TB</div></div>
                        </div>
                    )}
                    <div className="stat-card hover-scale" style={{ cursor: 'pointer' }} onClick={() => navigate('/users', { state: { role: 'lecturer', viewOnly: true } })}>
                        <div className="stat-icon primary"><FiTrendingUp /></div>
                        <div><div className="stat-value">{o.totalLecturers || 0}</div><div className="stat-label">Giảng viên</div></div>
                    </div>
                </div>

                <div className="chart-grid">
                    <div className="card">
                        <div className="card-header"><h3 className="card-title">Đề tài theo trạng thái</h3></div>
                        {stats?.topicsByStatus?.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie data={stats.topicsByStatus.map(s => ({ name: statusLabels[s.status] || s.status, value: s.count }))} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                                        {stats.topicsByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <div className="empty-state"><p>Chưa có dữ liệu</p></div>}
                    </div>

                    <div className="card">
                        <div className="card-header"><h3 className="card-title">Đề tài theo lĩnh vực</h3></div>
                        {stats?.topicsByCategory?.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={stats.topicsByCategory}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.5)" />
                                    <XAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                                    <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} name="Số đề tài" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <div className="empty-state"><p>Chưa có dữ liệu</p></div>}
                    </div>
                </div>

                {stats?.topStudents?.length > 0 && (
                    <div className="card">
                        <div className="card-header"><h3 className="card-title">🏆 Top sinh viên điểm cao</h3></div>
                        <div className="table-container">
                            <table>
                                <thead><tr><th>Hạng</th><th>MSSV</th><th>Họ tên</th><th>Đề tài</th><th>Điểm</th></tr></thead>
                                <tbody>
                                    {stats.topStudents.map((s, i) => (
                                        <tr key={i}>
                                            <td><span style={{ fontSize: '18px' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span></td>
                                            <td>{s.student_code}</td>
                                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.full_name}</td>
                                            <td>{s.topic_title}</td>
                                            <td><span className={`badge ${s.final_score >= 8 ? 'badge-success' : s.final_score >= 6 ? 'badge-warning' : 'badge-danger'}`}>{s.final_score}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default Dashboard;
