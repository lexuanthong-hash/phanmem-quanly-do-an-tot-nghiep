import { useState, useEffect } from 'react';
import api from '../../api/axios';
import Header from '../../components/Header';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { FiUsers, FiPlus, FiEdit2, FiTrash2, FiSearch, FiKey } from 'react-icons/fi';
import { useLocation } from 'react-router-dom';

const Users = () => {
    const { isAdmin, isStudent, isLecturer } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState('');
    const location = useLocation();
    // viewOnly = true khi Admin đến từ Dashboard (chỉ xem, không quản lý)
    const viewOnly = !!location.state?.viewOnly;
    // Mặc định sinh viên: 'student', giảng viên: 'student' (hoặc 'lecturer' nếu từ dashboard)
    const [roleFilter, setRoleFilter] = useState(location.state?.role || (isStudent ? 'student' : (isLecturer ? 'student' : '')));
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [form, setForm] = useState({ username: '', password: '', full_name: '', email: '', role: 'student', student_code: '', lecturer_code: '', department: '', phone: '', is_active: 1 });

    // Sinh viên: nếu đến từ Dashboard với role cụ thể thì dùng role đó, mặc định là 'student'
    useEffect(() => {
        if (isStudent) {
            // Cho phép xem lecturer nếu navigate từ Dashboard, còn lại mặc định student
            const allowedRoles = ['student', 'lecturer'];
            const stateRole = location.state?.role;
            setRoleFilter(allowedRoles.includes(stateRole) ? stateRole : 'student');
        } else if (location.state?.role) setRoleFilter(location.state.role);
        else if (isLecturer && !roleFilter) setRoleFilter('student');
    }, [isStudent, isLecturer, location.state]);

    useEffect(() => { fetchUsers(); }, [search, roleFilter, pagination.page]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const params = { page: pagination.page, limit: 10 };
            if (search) params.search = search;
            if (roleFilter) params.role = roleFilter;
            const res = await api.get('/users', { params });
            setUsers(res.data.data.users);
            setPagination(p => ({ ...p, totalPages: res.data.data.pagination?.totalPages || 1 }));
        } catch (err) { } finally { setLoading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editing) {
                await api.put(`/users/${editing}`, form);
                toast.success('Cập nhật thành công!');
            } else {
                await api.post('/users', form);
                toast.success('Tạo tài khoản thành công!');
                // Thông báo Dashboard cập nhật số liệu
                window.dispatchEvent(new Event('statsChanged'));
            }
            setShowModal(false); setEditing(null); fetchUsers();
        } catch (err) { toast.error(err.response?.data?.message || 'Lỗi xử lý'); }
    };

    const handleEdit = (u) => {
        setForm({ ...u, password: '' });
        setEditing(u.id); setShowModal(true);
    };

    const handleResetPw = async (id) => {
        const pw = prompt('Nhập mật khẩu mới (tối thiểu 6 ký tự):');
        if (!pw || pw.length < 6) { toast.error('Mật khẩu phải có ít nhất 6 ký tự'); return; }
        try { await api.put(`/users/${id}/reset-password`, { newPassword: pw }); toast.success('Reset mật khẩu thành công!'); } catch (err) { toast.error('Lỗi reset'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Vô hiệu hóa tài khoản này?')) return;
        try {
            await api.delete(`/users/${id}`);
            toast.success('Đã vô hiệu hóa!');
            fetchUsers();
            // Thông báo Dashboard cập nhật số liệu
            window.dispatchEvent(new Event('statsChanged'));
        } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
    };

    const roleBadge = (r) => {
        const m = { admin: ['Admin', 'badge-danger'], lecturer: ['Giảng viên', 'badge-primary'], student: ['Sinh viên', 'badge-info'] };
        const [l, c] = m[r] || [r, 'badge-info'];
        return <span className={`badge ${c}`}>{l}</span>;
    };

    // Tiêu đề và mô tả trang
    const pageTitle = (isAdmin && !viewOnly) ? 'Quản lý Tài khoản' : 'Danh sách Cán bộ - Sinh viên';
    const pageDesc = (isAdmin && !viewOnly) ? 'Tạo, chỉnh sửa và quản lý tài khoản người dùng' : 'Xem thông tin các tài khoản trong hệ thống';
    // Ẩn quản lý nếu viewOnly hoặc không phải Admin
    const canManage = isAdmin && !viewOnly;

    return (
        <>
            <Header title={pageTitle} />
            <div className="page-content animate-fade">
                <div className="page-header">
                    <div>
                        <h1><FiUsers style={{ verticalAlign: 'middle' }} /> {pageTitle}</h1>
                        <p>{pageDesc}</p>
                    </div>
                    {canManage && (
                        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ username: '', password: '', full_name: '', email: '', role: 'student', student_code: '', lecturer_code: '', department: '', phone: '', is_active: 1 }); setShowModal(true); }}><FiPlus /> Thêm tài khoản</button>
                    )}
                </div>

                <div className="filter-bar">
                    <div className="search-input"><FiSearch /><input className="form-input" placeholder="Tìm kiếm..." value={search} onChange={e => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} /></div>
                    {(isAdmin || isLecturer) && (
                        <select className="form-select" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}>
                            {canManage && <option value="">Tất cả vai trò</option>}
                            {canManage && <option value="admin">Admin</option>}
                            <option value="lecturer">Giảng viên</option>
                            <option value="student">Sinh viên</option>
                        </select>
                    )}
                </div>

                {loading ? <div className="loading"><div className="spinner"></div></div> : (
                    <div className="table-container">
                        <table>
                            <thead><tr><th>STT</th><th>Username</th><th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Mã SV/GV</th><th>Khoa</th><th>Trạng thái</th>{canManage && <th>Thao tác</th>}</tr></thead>
                            <tbody>
                                {users.map((u, i) => (
                                    <tr key={u.id}>
                                        <td>{i + 1}</td>
                                        <td style={{ fontWeight: 600 }}>{u.username}</td>
                                        <td style={{ color: 'var(--text-primary)' }}>{u.full_name}</td>
                                        <td style={{ fontSize: 12 }}>{u.email}</td>
                                        <td>{roleBadge(u.role)}</td>
                                        <td>{u.student_code || u.lecturer_code || '-'}</td>
                                        <td>{u.department || '-'}</td>
                                        <td>{u.is_active ? <span className="badge badge-success">Active</span> : <span className="badge badge-danger">Inactive</span>}</td>
                                        {canManage && (
                                            <td>
                                                <div className="btn-group">
                                                    <button className="btn btn-sm btn-outline" onClick={() => handleEdit(u)} title="Sửa"><FiEdit2 /></button>
                                                    <button className="btn btn-sm btn-warning" onClick={() => handleResetPw(u.id)} title="Reset password"><FiKey /></button>
                                                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u.id)} title="Vô hiệu hóa"><FiTrash2 /></button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {pagination.totalPages > 1 && (
                    <div className="pagination">
                        <button disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>←</button>
                        {[...Array(pagination.totalPages)].map((_, i) => <button key={i} className={pagination.page === i + 1 ? 'active' : ''} onClick={() => setPagination(p => ({ ...p, page: i + 1 }))}>{i + 1}</button>)}
                        <button disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>→</button>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h2>{editing ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản'}</h2><button className="modal-close" onClick={() => setShowModal(false)}>✕</button></div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Username *</label><input className="form-input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required disabled={!!editing} /></div>
                                    {!editing && <div className="form-group"><label className="form-label">Mật khẩu *</label><input className="form-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required /></div>}
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Họ tên *</label><input className="form-input" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required /></div>
                                    <div className="form-group"><label className="form-label">Email *</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Vai trò *</label>
                                        <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="student">Sinh viên</option><option value="lecturer">Giảng viên</option><option value="admin">Admin</option></select>
                                    </div>
                                    <div className="form-group"><label className="form-label">Khoa/Bộ môn</label><input className="form-input" value={form.department || ''} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">{form.role === 'admin' ? 'Mã Admin' : (form.role === 'student' ? 'Mã SV' : 'Mã GV')}</label><input className="form-input" maxLength="10" value={form.role === 'student' ? (form.student_code || '') : (form.lecturer_code || '')} onChange={e => { const val = e.target.value.replace(/\D/g, ''); setForm({ ...form, [form.role === 'student' ? 'student_code' : 'lecturer_code']: val }); }} disabled={form.role === 'admin'} placeholder={form.role === 'admin' ? 'Không yêu cầu' : ''} /></div>
                                    <div className="form-group"><label className="form-label">SĐT</label><input className="form-input" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} maxLength={10} inputMode="numeric" placeholder="Nhập 10 số" /></div>
                                </div>
                            </div>
                            <div className="modal-footer"><button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button><button type="submit" className="btn btn-primary">{editing ? 'Cập nhật' : 'Tạo'}</button></div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default Users;
