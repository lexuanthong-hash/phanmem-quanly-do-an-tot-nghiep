import { useState, useEffect } from 'react';
import api from '../../api/axios';
import Header from '../../components/Header';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { FiHeart, FiCheck, FiX, FiTrash2, FiSearch } from 'react-icons/fi';

const Wishes = () => {
    const { isStudent, isAdmin, isLecturer } = useAuth();
    const [wishes, setWishes] = useState([]);
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ topic_id: '', priority: 1, note: '' });
    const [rejectId, setRejectId] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [deleteMode, setDeleteMode] = useState(false);
    const [selectedWishIds, setSelectedWishIds] = useState(() => new Set());
    const [wishSearch, setWishSearch] = useState(''); // State tìm kiếm cho GV/Admin

    useEffect(() => { fetchWishes(); if (isStudent) fetchTopics(); }, []);

    const fetchWishes = async () => {
        try { const res = await api.get('/wishes'); setWishes(res.data.data); } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const fetchTopics = async () => {
        try { const res = await api.get('/topics/available'); setTopics(res.data.data); } catch (err) { console.error(err); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/wishes', form);
            toast.success('Đăng ký nguyện vọng thành công!');
            setShowModal(false);
            setForm({ topic_id: '', priority: 1, note: '' });
            fetchWishes();
            window.dispatchEvent(new Event('statsChanged'));
        } catch (err) { toast.error(err.response?.data?.message || 'Lỗi đăng ký'); }
    };

    const handleApprove = async (id) => {
        try {
            await api.put(`/wishes/${id}/approve`);
            toast.success('Duyệt nguyện vọng thành công!');
            fetchWishes();
            window.dispatchEvent(new Event('statsChanged'));
        } catch (err) { toast.error(err.response?.data?.message || 'Lỗi duyệt'); }
    };

    const handleReject = async () => {
        try {
            await api.put(`/wishes/${rejectId}/reject`, { rejection_reason: rejectReason });
            toast.success('Đã từ chối nguyện vọng.');
            setRejectId(null); setRejectReason('');
            fetchWishes();
            window.dispatchEvent(new Event('statsChanged'));
        } catch (err) { toast.error('Lỗi từ chối'); }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/wishes/${id}`);
            toast.success('Đã xóa nguyện vọng.');
            fetchWishes();
            window.dispatchEvent(new Event('statsChanged'));
        } catch (err) { toast.error(err.response?.data?.message || 'Lỗi xóa'); }
    };

    const toggleWishSelected = (wishId) => {
        setSelectedWishIds(prev => {
            const next = new Set(prev);
            const key = String(wishId);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const enterDeleteMode = () => {
        const hasDeletable = wishes.some(w => w.status === 'pending' || w.status === 'rejected');
        if (!hasDeletable) {
            toast.info('Không có nguyện vọng nào có thể xóa (chỉ xóa được: chờ duyệt / từ chối).');
            return;
        }
        setDeleteMode(true);
        setSelectedWishIds(new Set());
    };

    const cancelDeleteMode = () => {
        setDeleteMode(false);
        setSelectedWishIds(new Set());
    };

    const deleteSelectedWishes = async () => {
        try {
            const deletableIds = new Set(
                wishes
                    .filter(w => w.status === 'pending' || w.status === 'rejected')
                    .map(w => String(w.id))
            );
            const idsToDelete = [...selectedWishIds].filter(id => deletableIds.has(String(id)));

            if (idsToDelete.length === 0) {
                toast.info('Vui lòng chọn ít nhất 1 nguyện vọng có thể xóa (chờ duyệt / từ chối).');
                return;
            }

            const ok = window.confirm(`Xóa ${idsToDelete.length} nguyện vọng đã chọn?`);
            if (!ok) return;

            await Promise.all(idsToDelete.map(id => api.delete(`/wishes/${id}`)));
            toast.success('Đã xóa nguyện vọng đã chọn.');
            cancelDeleteMode();
            fetchWishes();
            window.dispatchEvent(new Event('statsChanged'));
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi xóa');
        }
    };

    const statusBadge = (s) => {
        const map = { pending: ['Chờ duyệt', 'badge-warning'], approved: ['Đã duyệt', 'badge-success'], rejected: ['Từ chối', 'badge-danger'] };
        const [l, c] = map[s] || [s, 'badge-info'];
        return <span className={`badge ${c}`}>{l}</span>;
    };

    return (
        <>
            <Header title={isStudent ? 'Đăng ký nguyện vọng' : 'Duyệt nguyện vọng'} />
            <div className="page-content animate-fade">
                <div className="page-header">
                    <div><h1><FiHeart style={{ verticalAlign: 'middle' }} /> {isStudent ? 'Đăng ký nguyện vọng' : 'Duyệt nguyện vọng'}</h1><p>{isStudent ? 'Đăng ký tối đa 3 nguyện vọng theo thứ tự ưu tiên' : 'Xem và duyệt nguyện vọng đăng ký đề tài'}</p></div>
                    {isStudent && (
                        <div className="btn-group">
                            <button className="btn btn-primary" onClick={() => setShowModal(true)}><FiHeart /> Đăng ký NV</button>
                            {!deleteMode ? (
                                <button className="btn btn-danger" onClick={enterDeleteMode}><FiTrash2 /> Xóa nguyện vọng</button>
                            ) : (
                                <>
                                    <button className="btn btn-danger" onClick={deleteSelectedWishes}><FiTrash2 /> Xóa đã chọn</button>
                                    <button className="btn btn-outline" onClick={cancelDeleteMode}>Hủy</button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Thanh tìm kiếm cho Giảng viên / Admin */}
                {!isStudent && (
                    <div className="filter-bar">
                        <div className="search-input">
                            <FiSearch />
                            <input
                                className="form-input"
                                placeholder="Tìm tên Sinh Viên , MSSV "
                                value={wishSearch}
                                onChange={e => setWishSearch(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {loading ? <div className="loading"><div className="spinner"></div></div> : (() => {
                    const displayWishes = (!isStudent && wishSearch)
                        ? wishes.filter(w =>
                            w.student_name?.toLowerCase().includes(wishSearch.toLowerCase()) ||
                            w.student_code?.toLowerCase().includes(wishSearch.toLowerCase()) ||
                            w.topic_title?.toLowerCase().includes(wishSearch.toLowerCase())
                        )
                        : wishes;
                    return (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        {isStudent && deleteMode && <th style={{ width: 44 }}></th>}
                                        {!isStudent && <><th>MSSV</th><th>Sinh viên</th></>}
                                        <th>Đề tài</th><th>Ưu tiên</th><th>Ghi chú</th><th>Trạng thái</th>
                                        {!isStudent && <th>Thao tác</th>}
                                        {isStudent && <th>Thao tác</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayWishes.length === 0 ? <tr><td colSpan="7"><div className="empty-state"><h3>{wishSearch ? 'Không tìm thấy kết quả' : 'Chưa có nguyện vọng'}</h3></div></td></tr> : displayWishes.map(w => (
                                        <tr key={w.id}>
                                            {isStudent && deleteMode && (
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedWishIds.has(String(w.id))}
                                                        disabled={!(w.status === 'pending' || w.status === 'rejected')}
                                                        onChange={() => toggleWishSelected(w.id)}
                                                    />
                                                </td>
                                            )}
                                            {!isStudent && <><td>{w.student_code}</td><td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{w.student_name}</td></>}
                                            <td style={{ maxWidth: '250px' }}>
                                                {w.topic_title}
                                                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                                                    <span style={{ color: w.current_students >= w.max_students ? 'var(--danger)' : 'var(--success)' }}>
                                                        (Đã đăng ký: {w.current_students}/{w.max_students} SV)
                                                    </span>
                                                    {w.assigned_students && <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>SV đang làm: {w.assigned_students}</div>}
                                                    {w.wishing_students && <div style={{ color: 'var(--warning)', marginTop: '2px' }}>SV đang chờ: {w.wishing_students}</div>}
                                                </div>
                                            </td>
                                            <td><span className="badge badge-primary">NV{w.priority}</span></td>
                                            <td style={{ maxWidth: '150px', fontSize: '12px' }}>{w.note || '-'}</td>
                                            <td>{statusBadge(w.status)}</td>
                                            {isLecturer && (
                                                <td>
                                                    {w.status === 'pending' && (
                                                        <div className="btn-group">
                                                            <button className="btn btn-sm btn-success" onClick={() => handleApprove(w.id)}><FiCheck /> Duyệt</button>
                                                            <button className="btn btn-sm btn-danger" onClick={() => { setRejectId(w.id); }}><FiX /> Từ chối</button>
                                                        </div>
                                                    )}
                                                </td>
                                            )}
                                            {isStudent && (
                                                <td>{!deleteMode && w.status === 'pending' && <button className="btn btn-sm btn-danger" onClick={() => handleDelete(w.id)}><FiTrash2 /></button>}</td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                })()}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h2>Đăng ký nguyện vọng</h2><button className="modal-close" onClick={() => setShowModal(false)}>✕</button></div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group"><label className="form-label">Chọn đề tài *</label>
                                    <select className="form-select" value={form.topic_id} onChange={e => setForm({ ...form, topic_id: e.target.value })} required>
                                        <option value="">-- Chọn đề tài --</option>
                                        {topics.map(t => (
                                            <option
                                                key={t.id}
                                                value={t.id}
                                                disabled={t.current_students >= t.max_students}
                                            >
                                                {t.title} ({t.lecturer_name} - Tối đa {t.max_students} SV) {t.current_students >= t.max_students ? '- Đã đủ sinh viên' : ''} {t.wishing_students ? `[Đã ĐK: ${t.wishing_students}]` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group"><label className="form-label">Mức ưu tiên</label>
                                    <select className="form-select" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) })}>
                                        <option value={1}>Nguyện vọng 1 (cao nhất)</option><option value={2}>Nguyện vọng 2</option><option value={3}>Nguyện vọng 3</option>
                                    </select>
                                </div>
                                <div className="form-group"><label className="form-label">Ghi chú</label><textarea className="form-textarea" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Lý do chọn đề tài, năng lực..." /></div>
                            </div>
                            <div className="modal-footer"><button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button><button type="submit" className="btn btn-primary">Đăng ký</button></div>
                        </form>
                    </div>
                </div>
            )}

            {rejectId && (
                <div className="modal-overlay" onClick={() => setRejectId(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
                        <div className="modal-header"><h2>Từ chối nguyện vọng</h2><button className="modal-close" onClick={() => setRejectId(null)}>✕</button></div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Lý do từ chối</label><textarea className="form-textarea" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Nhập lý do..." /></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-outline" onClick={() => setRejectId(null)}>Hủy</button><button className="btn btn-danger" onClick={handleReject}>Từ chối</button></div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Wishes;
