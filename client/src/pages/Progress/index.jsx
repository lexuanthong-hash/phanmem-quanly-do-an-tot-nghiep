import { useState, useEffect } from 'react';
import api from '../../api/axios';
import Header from '../../components/Header';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { FiCheckSquare, FiUpload, FiMessageSquare } from 'react-icons/fi';

const Progress = () => {
    const { isStudent, isAdmin, isLecturer } = useAuth();
    const [reports, setReports] = useState([]);
    const [milestones, setMilestones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showSubmit, setShowSubmit] = useState(false);
    const [showReview, setShowReview] = useState(null);
    const [submitForm, setSubmitForm] = useState({ milestone_id: '', content: '' });
    const [file, setFile] = useState(null);
    const [reviewForm, setReviewForm] = useState({ status: 'reviewed', feedback: '' });
    const [myAssignment, setMyAssignment] = useState(null); // null = chưa load, false = chưa có, object = có rồi
    const [wishCount, setWishCount] = useState(0);

    useEffect(() => {
        fetchProgress();
        if (isStudent) {
            fetchMilestones();
            checkAssignment();
        }
    }, []);

    const checkAssignment = async () => {
        try {
            // Kiểm tra đã được phân công chưa
            const res = await api.get('/grades/assignments');
            if (res.data.data.length > 0) {
                setMyAssignment(res.data.data[0]);
            } else {
                setMyAssignment(false);
                // Kiểm tra đã đăng ký NV chưa
                const wRes = await api.get('/wishes');
                setWishCount(wRes.data.data.length);
            }
        } catch (err) {
            setMyAssignment(false);
        }
    };

    const fetchProgress = async () => {
        try { const res = await api.get('/progress'); setReports(res.data.data); } catch (err) { } finally { setLoading(false); }
    };

    const fetchMilestones = async () => {
        try { const res = await api.get('/milestones'); setMilestones(res.data.data); } catch (err) { }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const fd = new FormData();
            fd.append('milestone_id', submitForm.milestone_id);
            fd.append('content', submitForm.content);
            if (file) fd.append('file', file);
            await api.post('/progress', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('Nộp tiến độ thành công!');
            setShowSubmit(false); setSubmitForm({ milestone_id: '', content: '' }); setFile(null);
            fetchProgress();
        } catch (err) { toast.error(err.response?.data?.message || 'Lỗi nộp tiến độ'); }
    };

    const handleReview = async () => {
        try {
            await api.put(`/progress/${showReview}/review`, reviewForm);
            toast.success('Đánh giá thành công!');
            setShowReview(null); fetchProgress();
        } catch (err) { toast.error('Lỗi đánh giá'); }
    };

    const statusBadge = (s) => {
        const map = { submitted: ['Đã nộp', 'badge-info'], reviewed: ['Đạt', 'badge-success'], revision_needed: ['Cần sửa', 'badge-warning'], rejected: ['Không đạt', 'badge-danger'] };
        const [l, c] = map[s] || [s, 'badge-info'];
        return <span className={`badge ${c}`}>{l}</span>;
    };

    // Thông báo cho sinh viên chưa có assignment
    const renderStudentNotAssigned = () => {
        if (wishCount === 0) {
            return (
                <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <div style={{ fontSize: 52, marginBottom: 14 }}>📋</div>
                    <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Chưa đăng ký nguyện vọng</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Bạn chưa đăng ký nguyện vọng đề tài nào. Vui lòng vào trang <strong>Đăng ký nguyện vọng</strong> để chọn đề tài trước.</p>
                </div>
            );
        }
        return (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ fontSize: 52, marginBottom: 14 }}>⏳</div>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Chờ giảng viên duyệt đề tài</h3>
                <p style={{ color: 'var(--text-muted)' }}>Nguyện vọng của bạn đang chờ được duyệt. Sau khi giảng viên chấp nhận, bạn mới có thể nộp tiến độ.</p>
            </div>
        );
    };

    return (
        <>
            <Header title={isStudent ? 'Nộp tiến độ' : 'Xem tiến độ'} />
            <div className="page-content animate-fade">
                <div className="page-header">
                    <div><h1><FiCheckSquare style={{ verticalAlign: 'middle' }} /> {isStudent ? 'Nộp tiến độ' : 'Tiến độ sinh viên'}</h1><p>{isStudent ? 'Nộp báo cáo tiến độ theo từng mốc' : 'Xem và đánh giá tiến độ sinh viên'}</p></div>
                    {/* Chỉ hiện nút Nộp tiến độ khi sinh viên đã có assignment */}
                    {isStudent && myAssignment && <button className="btn btn-primary" onClick={() => setShowSubmit(true)}><FiUpload /> Nộp tiến độ</button>}
                </div>

                {/* Sinh viên chưa có assignment: hiện thông báo */}
                {isStudent && myAssignment === false ? renderStudentNotAssigned() : (
                    loading ? <div className="loading"><div className="spinner"></div></div> : (
                        <div className="table-container">
                            <table>
                                <thead><tr>{!isStudent && <><th>MSSV</th><th>Sinh viên</th></>}<th>Đề tài</th><th>Mốc</th><th>Hạn nộp</th><th>Ngày nộp</th><th>Báo cáo / File</th><th>Trạng thái</th><th>Nhận xét</th>{isLecturer && <th>Thao tác</th>}</tr></thead>
                                <tbody>
                                    {reports.length === 0 ? <tr><td colSpan="10"><div className="empty-state"><h3>Chưa có tiến độ</h3></div></td></tr> : reports.map(r => (
                                        <tr key={r.id}>
                                            {!isStudent && <><td>{r.student_code}</td><td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.student_name}</td></>}
                                            <td style={{ maxWidth: '200px' }}>{r.topic_title}</td>
                                            <td>{r.milestone_title}</td>
                                            <td style={{ fontSize: '12px' }}>{r.milestone_deadline ? new Date(r.milestone_deadline).toLocaleDateString('vi-VN') : '-'}</td>
                                            <td style={{ fontSize: '12px' }}>{new Date(r.submitted_at).toLocaleDateString('vi-VN')}</td>
                                            <td style={{ maxWidth: '200px', fontSize: '12px' }}>
                                                {r.content && <div style={{ marginBottom: 4 }}>{r.content}</div>}
                                                {r.file_url ? (
                                                    <a href={`http://localhost:5000${r.file_url}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Tải file báo cáo</a>
                                                ) : <span style={{ color: 'var(--text-muted)' }}>Không có file</span>}
                                            </td>
                                            <td>{statusBadge(r.status)}</td>
                                            <td style={{ maxWidth: '150px', fontSize: '12px' }}>{r.feedback || '-'}</td>
                                            {isLecturer && (
                                                <td><button className="btn btn-sm btn-primary" onClick={() => { setShowReview(r.id); setReviewForm({ status: r.status === 'submitted' ? 'reviewed' : r.status, feedback: r.feedback || '' }); }}><FiMessageSquare /> {r.status === 'submitted' ? 'Đánh giá' : 'Sửa đánh giá'}</button></td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </div>

            {showSubmit && (
                <div className="modal-overlay" onClick={() => setShowSubmit(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h2>Nộp tiến độ</h2><button className="modal-close" onClick={() => setShowSubmit(false)}>✕</button></div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group"><label className="form-label">Mốc tiến độ *</label>
                                    <select className="form-select" value={submitForm.milestone_id} onChange={e => setSubmitForm({ ...submitForm, milestone_id: e.target.value })} required>
                                        <option value="">Chọn mốc...</option>
                                        {milestones.map(m => <option key={m.id} value={m.id}>{m.title} - Hạn: {new Date(m.deadline).toLocaleDateString('vi-VN')}</option>)}
                                    </select>
                                </div>
                                <div className="form-group"><label className="form-label">Nội dung báo cáo</label><textarea className="form-textarea" value={submitForm.content} onChange={e => setSubmitForm({ ...submitForm, content: e.target.value })} placeholder="Mô tả tiến độ thực hiện..." /></div>
                                <div className="form-group"><label className="form-label">File đính kèm</label><input className="form-input" type="file" onChange={e => setFile(e.target.files[0])} accept=".pdf,.doc,.docx,.zip,.rar" /></div>
                            </div>
                            <div className="modal-footer"><button type="button" className="btn btn-outline" onClick={() => setShowSubmit(false)}>Hủy</button><button type="submit" className="btn btn-primary">Nộp</button></div>
                        </form>
                    </div>
                </div>
            )}

            {showReview && (
                <div className="modal-overlay" onClick={() => setShowReview(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
                        <div className="modal-header"><h2>Đánh giá tiến độ</h2><button className="modal-close" onClick={() => setShowReview(null)}>✕</button></div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Kết quả</label>
                                <select className="form-select" value={reviewForm.status} onChange={e => setReviewForm({ ...reviewForm, status: e.target.value })}>
                                    <option value="reviewed">Đạt</option><option value="revision_needed">Cần sửa</option><option value="rejected">Không đạt</option>
                                </select>
                            </div>
                            <div className="form-group"><label className="form-label">Nhận xét</label><textarea className="form-textarea" value={reviewForm.feedback} onChange={e => setReviewForm({ ...reviewForm, feedback: e.target.value })} placeholder="Nhận xét cho sinh viên..." /></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-outline" onClick={() => setShowReview(null)}>Hủy</button><button className="btn btn-primary" onClick={handleReview}>Lưu đánh giá</button></div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Progress;
