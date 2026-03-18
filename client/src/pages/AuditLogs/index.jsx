import { useState, useEffect } from 'react';
import api from '../../api/axios';
import Header from '../../components/Header';
import { FiFileText, FiSearch } from 'react-icons/fi';

const AuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [actionFilter, setActionFilter] = useState('');
    const [entityFilter, setEntityFilter] = useState('');

    useEffect(() => { fetchLogs(); }, [pagination.page, actionFilter, entityFilter]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params = { page: pagination.page, limit: 20 };
            if (actionFilter) params.action = actionFilter;
            if (entityFilter) params.entity_type = entityFilter;
            const res = await api.get('/audit-logs', { params });
            setLogs(res.data.data.logs);
            setPagination(p => ({ ...p, totalPages: res.data.data.pagination?.totalPages || 1 }));
        } catch (err) { } finally { setLoading(false); }
    };

    const actionColor = (a) => {
        const map = { CREATE: 'var(--success)', UPDATE: 'var(--info)', DELETE: 'var(--danger)', LOGIN: 'var(--primary)', APPROVE: 'var(--success)', REJECT: 'var(--danger)', GRADE: 'var(--warning)', SUBMIT: 'var(--info)' };
        return map[a] || 'var(--text-muted)';
    };

    return (
        <>
            <Header title="Audit Log" />
            <div className="page-content animate-fade">
                <div className="page-header">
                    <div><h1><FiFileText style={{ verticalAlign: 'middle' }} /> Nhật ký hệ thống</h1><p>Lịch sử hành động của người dùng trong hệ thống</p></div>
                </div>

                <div className="filter-bar">
                    <select className="form-select" value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}>
                        <option value="">Tất cả hành động</option>
                        <option value="CREATE">Tạo mới</option><option value="UPDATE">Cập nhật</option><option value="DELETE">Xóa</option><option value="LOGIN">Đăng nhập</option><option value="APPROVE">Duyệt</option><option value="REJECT">Từ chối</option><option value="GRADE">Chấm điểm</option>
                    </select>
                    <select className="form-select" value={entityFilter} onChange={e => { setEntityFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}>
                        <option value="">Tất cả đối tượng</option>
                        <option value="users">Tài khoản</option><option value="topics">Đề tài</option><option value="wishes">Nguyện vọng</option><option value="progress">Tiến độ</option><option value="grades">Điểm</option><option value="milestones">Mốc TĐ</option>
                    </select>
                </div>

                {loading ? <div className="loading"><div className="spinner"></div></div> : (
                    <div className="card" style={{ padding: 0 }}>
                        <div className="table-container">
                            <table>
                                <thead><tr><th>Thời gian</th><th>Người dùng</th><th>Hành động</th><th>Đối tượng</th><th>ID</th><th>IP</th></tr></thead>
                                <tbody>
                                    {logs.length === 0 ? <tr><td colSpan="6"><div className="empty-state"><h3>Chưa có log</h3></div></td></tr> : logs.map(l => (
                                        <tr key={l.id}>
                                            <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(l.created_at).toLocaleString('vi-VN')}</td>
                                            <td style={{ fontWeight: 600 }}>{l.full_name || l.username || '-'}</td>
                                            <td><span className="log-action" style={{ background: `${actionColor(l.action)}20`, color: actionColor(l.action) }}>{l.action}</span></td>
                                            <td>{l.entity_type}</td>
                                            <td>{l.entity_id || '-'}</td>
                                            <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.ip_address || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {pagination.totalPages > 1 && (
                    <div className="pagination">
                        <button disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>←</button>
                        {[...Array(Math.min(pagination.totalPages, 10))].map((_, i) => <button key={i} className={pagination.page === i + 1 ? 'active' : ''} onClick={() => setPagination(p => ({ ...p, page: i + 1 }))}>{i + 1}</button>)}
                        <button disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>→</button>
                    </div>
                )}
            </div>
        </>
    );
};

export default AuditLogs;
