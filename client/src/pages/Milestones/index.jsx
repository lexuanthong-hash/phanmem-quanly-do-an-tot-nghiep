import { useState, useEffect } from 'react';
import api from '../../api/axios';
import Header from '../../components/Header';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { FiTarget, FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';

const Milestones = () => {
    const { isAdmin, isLecturer } = useAuth();
    const [milestones, setMilestones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ title: '', description: '', deadline: '', order_index: 0, topic_id: '' });
    const [topics, setTopics] = useState([]);

    useEffect(() => { fetchMilestones(); fetchTopics(); }, []);

    const fetchMilestones = async () => {
        try { const res = await api.get('/milestones'); setMilestones(res.data.data); } catch (err) { } finally { setLoading(false); }
    };

    const fetchTopics = async () => {
        try { const res = await api.get('/topics'); setTopics(res.data.data.topics || []); } catch (err) { }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editing) { await api.put(`/milestones/${editing}`, form); toast.success('Cập nhật mốc thành công!'); }
            else { await api.post('/milestones', form); toast.success('Tạo mốc thành công!'); }
            setShowModal(false); setEditing(null); fetchMilestones();
        } catch (err) { toast.error('Lỗi xử lý'); }
    };

    const handleEdit = (m) => {
        setForm({ title: m.title, description: m.description || '', deadline: m.deadline?.slice(0, 16) || '', order_index: m.order_index, topic_id: m.topic_id || '' });
        setEditing(m.id); setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Xóa mốc tiến độ này?')) return;
        try { await api.delete(`/milestones/${id}`); toast.success('Đã xóa!'); fetchMilestones(); } catch (err) { toast.error('Lỗi xóa'); }
    };

    const isOverdue = (d) => new Date(d) < new Date();

    return (
        <>
            <Header title="Mốc tiến độ" />
            <div className="page-content animate-fade">
                <div className="page-header">
                    <div><h1><FiTarget style={{ verticalAlign: 'middle' }} /> Mốc tiến độ</h1><p>Quản lý các mốc thời gian nộp tiến độ đồ án</p></div>
                    <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ title: '', description: '', deadline: '', order_index: 0, topic_id: '' }); setShowModal(true); }}><FiPlus /> Thêm mốc</button>
                </div>

                {loading ? <div className="loading"><div className="spinner"></div></div> : (
                    <div className="timeline">
                        {milestones.length === 0 ? <div className="empty-state"><h3>Chưa có mốc tiến độ</h3></div> :
                            milestones.map(m => (
                                <div key={m.id} className="timeline-item">
                                    <div className={`timeline-dot ${isOverdue(m.deadline) ? 'overdue' : 'pending'}`}></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>{m.title}</h3>
                                            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                ⏰ Hạn: <span style={{ color: isOverdue(m.deadline) ? 'var(--danger)' : 'var(--warning)' }}>{new Date(m.deadline).toLocaleString('vi-VN')}</span>
                                                {m.topic_title && <> | 📚 {m.topic_title}</>}
                                                {!m.topic_id && <> | <span className="badge badge-info">Chung</span></>}
                                            </p>
                                            {m.description && <p style={{ fontSize: '13px', marginTop: '8px', color: 'var(--text-secondary)' }}>{m.description}</p>}
                                        </div>
                                        <div className="btn-group">
                                            <button className="btn btn-sm btn-outline" onClick={() => handleEdit(m)}><FiEdit2 /></button>
                                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(m.id)}><FiTrash2 /></button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h2>{editing ? 'Chỉnh sửa mốc' : 'Thêm mốc mới'}</h2><button className="modal-close" onClick={() => setShowModal(false)}>✕</button></div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group"><label className="form-label">Tiêu đề *</label><input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
                                <div className="form-group"><label className="form-label">Mô tả</label><textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                                <div className="form-row">
                                    <div className="form-group"><label className="form-label">Hạn nộp *</label><input className="form-input" type="datetime-local" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} required /></div>
                                    <div className="form-group"><label className="form-label">Thứ tự</label><input className="form-input" type="number" value={form.order_index} onChange={e => setForm({ ...form, order_index: parseInt(e.target.value) })} /></div>
                                </div>
                                <div className="form-group"><label className="form-label">Đề tài (để trống = mốc chung)</label>
                                    <select className="form-select" value={form.topic_id} onChange={e => setForm({ ...form, topic_id: e.target.value })}>
                                        <option value="">Mốc chung cho tất cả</option>
                                        {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer"><button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button><button type="submit" className="btn btn-primary">{editing ? 'Cập nhật' : 'Tạo mốc'}</button></div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default Milestones;
