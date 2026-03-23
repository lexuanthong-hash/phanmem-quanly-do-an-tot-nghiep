import { useState, useEffect } from 'react';
import api from '../../api/axios';
import Header from '../../components/Header';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiSearch, FiBook } from 'react-icons/fi';

const Topics = () => {
    // 1. Khai báo các quyền từ Context (để kiểm tra xem user là Admin, Giảng viên hay Sinh viên)
    const { isAdmin, isLecturer, isStudent } = useAuth();
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [studentSearch, setStudentSearch] = useState('');  // tìm kiếm phía client cho sinh viên
    const [studentCategoryFilter, setStudentCategoryFilter] = useState(''); // lọc theo lĩnh vực cho SV
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [form, setForm] = useState({ title: '', description: '', max_students: 1, semester: '2024-2025/HK2', category: '', requirements: '', status: 'draft' });

    useEffect(() => { fetchTopics(); }, [search, statusFilter, pagination.page]);

    const fetchTopics = async () => {
        try {
            setLoading(true);
            const params = { page: pagination.page, limit: 10 };
            if (search) params.search = search;
            if (statusFilter) params.status = statusFilter;

            let res;
            if (isStudent) {
                // Sinh viên gọi API lấy tất cả đề tài available, tìm kiếm sẽ được lọc phía client
                res = await api.get('/topics/available');
                setTopics(res.data.data);
            } else {
                res = await api.get('/topics', { params });
                setTopics(res.data.data.topics);
                setPagination(p => ({ ...p, totalPages: res.data.data.pagination?.totalPages || 1 }));
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editing) {
                await api.put(`/topics/${editing}`, form);
                toast.success('Cập nhật đề tài thành công!');
            } else {
                await api.post('/topics', form);
                toast.success('Tạo đề tài thành công!');
            }
            window.dispatchEvent(new Event('statsChanged'));
            setShowModal(false);
            setEditing(null);
            setForm({ title: '', description: '', max_students: 1, semester: '2024-2025/HK2', category: '', requirements: '', status: 'draft' });
            fetchTopics();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi xử lý');
        }
    };

    const handleEdit = (topic) => {
        setForm({ title: topic.title, description: topic.description || '', max_students: topic.max_students, semester: topic.semester, category: topic.category || '', requirements: topic.requirements || '', status: topic.status });
        setEditing(topic.id);
        setShowModal(true);
    };

    // 2. Hàm gọi API xuống Backend khi Admin bấm nút "Duyệt"
    const handleApprove = async (id) => {
        try {
            // Gửi request PUT đến đường dẫn API duyệt đề tài
            await api.put(`/topics/${id}/approve`);
            toast.success('Duyệt đề tài thành công!');
            fetchTopics(); // Tải lại danh sách đề tài mới nhất
            window.dispatchEvent(new Event('statsChanged'));
        } catch (err) { toast.error('Lỗi duyệt đề tài'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Bạn chắc chắn muốn xóa đề tài này?')) return;
        try {
            await api.delete(`/topics/${id}`);
            toast.success('Xóa đề tài thành công!');
            fetchTopics();
            window.dispatchEvent(new Event('statsChanged'));
        } catch (err) { toast.error(err.response?.data?.message || 'Lỗi xóa'); }
    };

    const statusBadge = (status) => {
        const map = { draft: ['Nháp', 'badge-info'], approved: ['Đã duyệt', 'badge-success'], assigned: ['Đã phân', 'badge-primary'], in_progress: ['Đang TH', 'badge-warning'], completed: ['Hoàn thành', 'badge-success'], cancelled: ['Đã hủy', 'badge-danger'] };
        const [label, cls] = map[status] || [status, 'badge-info'];
        return <span className={`badge ${cls}`}>{label}</span>;
    };

    return (
        <>
            <Header title="Quản lý Đề tài" />
            <div className="page-content animate-fade">
                <div className="page-header">
                    <div><h1><FiBook style={{ verticalAlign: 'middle' }} /> {isStudent ? 'Danh sách đề tài' : 'Quản lý Đề tài'}</h1><p>{isStudent ? 'Xem các đề tài có sẵn để đăng ký' : 'Tạo, chỉnh sửa và duyệt đề tài đồ án'}</p></div>
                    {(isAdmin || isLecturer) && <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ title: '', description: '', max_students: 1, semester: '2024-2025/HK2', category: '', requirements: '', status: 'draft' }); setShowModal(true); }}><FiPlus /> Thêm đề tài</button>}
                </div>

                {/* Thanh tìm kiếm cho Admin / Giảng viên */}
                {!isStudent && (
                    <div className="filter-bar">
                        <div className="search-input"><FiSearch /><input className="form-input" placeholder="Tìm kiếm đề tài..." value={search} onChange={e => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} /></div>
                        <select className="form-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}>
                            <option value="">Tất cả trạng thái</option>
                            <option value="draft">Nháp</option><option value="approved">Đã duyệt</option><option value="assigned">Đã phân công</option><option value="in_progress">Đang thực hiện</option><option value="completed">Hoàn thành</option><option value="cancelled">Đã hủy</option>
                        </select>
                    </div>
                )}

                {/* Thanh tìm kiếm riêng cho Sinh viên — lọc phía client */}
                {isStudent && (
                    <div className="filter-bar">
                        <div className="search-input">
                            <FiSearch />
                            <input
                                className="form-input"
                                placeholder="Tìm theo tên đề tài hoặc giảng viên..."
                                value={studentSearch}
                                onChange={e => setStudentSearch(e.target.value)}
                            />
                        </div>
                        <select className="form-select" value={studentCategoryFilter} onChange={e => setStudentCategoryFilter(e.target.value)}>
                            <option value="">Tất cả lĩnh vực</option>
                            <option value="Web">Web</option>
                            <option value="Mobile">Mobile</option>
                            <option value="AI">AI</option>
                            <option value="IoT">IoT</option>
                            <option value="Game">Game</option>
                            <option value="Khác">Khác</option>
                        </select>
                    </div>
                )}

                {loading ? <div className="loading"><div className="spinner"></div></div> : (() => {
                    // Lọc danh sách đề tài phía client cho sinh viên
                    const displayTopics = isStudent
                        ? topics.filter(t => {
                            const matchText = !studentSearch ||
                                t.title?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                                t.lecturer_name?.toLowerCase().includes(studentSearch.toLowerCase());
                            const matchCat = !studentCategoryFilter || t.category === studentCategoryFilter;
                            return matchText && matchCat;
                          })
                        : topics;
                    return (
                    <div className="table-container">
                        <table>
                            <thead><tr><th>STT</th><th>Tên đề tài</th><th>GV hướng dẫn</th><th>SV tối đa</th><th>Lĩnh vực</th><th>Học kỳ</th><th>Trạng thái</th>{(isAdmin || isLecturer) && <th>Thao tác</th>}</tr></thead>
                            <tbody>
                                {displayTopics.length === 0 ? <tr><td colSpan="8"><div className="empty-state"><h3>{studentSearch || studentCategoryFilter ? 'Không tìm thấy đề tài phù hợp' : 'Chưa có đề tài'}</h3></div></td></tr> : displayTopics.map((t, i) => (
                                    <tr key={t.id}>
                                        <td>{i + 1}</td>
                                        <td style={{ fontWeight: 600, color: 'var(--text-primary)', maxWidth: '280px' }}>{t.title}</td>
                                        <td>{t.lecturer_name}</td>
                                        <td>{t.current_students || 0}/{t.max_students}</td>
                                        <td><span className="badge badge-info">{t.category || '-'}</span></td>
                                        <td>{t.semester}</td>
                                        <td>{statusBadge(t.status)}</td>
                                        {(isAdmin || isLecturer) && (
                                            <td>
                                                <div className="btn-group">
                                                    {/* 3. Phần giao diện nút Duyệt: Chỉ hiển thị khi là Admin VÀ đề tài đang ở trạng thái Nháp ('draft') */}
                                                    {isAdmin && t.status === 'draft' && <button className="btn btn-sm btn-success" onClick={() => handleApprove(t.id)} title="Duyệt"><FiCheck /></button>}
                                                    <button className="btn btn-sm btn-outline" onClick={() => handleEdit(t)} title="Sửa"><FiEdit2 /></button>
                                                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id)} title="Xóa"><FiTrash2 /></button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    );
                })()}

                {!isStudent && pagination.totalPages > 1 && (
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
                        <div className="modal-header"><h2>{editing ? 'Chỉnh sửa đề tài' : 'Thêm đề tài mới'}</h2><button className="modal-close" onClick={() => setShowModal(false)}>✕</button></div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group"><label className="form-label">Tên đề tài *</label><input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
                                <div className="form-group"><label className="form-label">Mô tả</label><textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">SV tối đa</label><input className="form-input" type="number" min="1" value={form.max_students} onChange={e => setForm({ ...form, max_students: parseInt(e.target.value) })} /></div>
                                    <div className="form-group"><label className="form-label">Học kỳ</label><input className="form-input" value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })} /></div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Lĩnh vực</label><select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}><option value="">Chọn...</option><option>Web</option><option>Mobile</option><option>AI</option><option>IoT</option><option>Game</option><option>Khác</option></select></div>
                                    <div className="form-group"><label className="form-label">Trạng thái</label><select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="draft">Nháp</option><option value="approved">Đã duyệt</option><option value="assigned">Đã phân công</option><option value="in_progress">Đang thực hiện</option><option value="completed">Hoàn thành</option><option value="cancelled">Đã hủy</option></select></div>
                                </div>
                                <div className="form-group"><label className="form-label">Yêu cầu</label><textarea className="form-textarea" value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })} /></div>
                            </div>
                            <div className="modal-footer"><button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button><button type="submit" className="btn btn-primary">{editing ? 'Cập nhật' : 'Tạo đề tài'}</button></div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default Topics;
