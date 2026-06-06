import { useState, useEffect } from 'react';
import api from '../../api/axios';
import Header from '../../components/Header';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { FiAward, FiSave, FiEdit2, FiPlus } from 'react-icons/fi';

// Hiển thị số gọn: 10 thay vì 10.00, 2 thay vì 2.00
const formatRubricNumber = (value) => {
    const n = parseFloat(value);
    if (Number.isNaN(n)) return value;
    return Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(2)));
};

const Grades = () => {
    const { isStudent, isAdmin, isLecturer } = useAuth();
    const [criteria, setCriteria] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [selectedAssignment, setSelectedAssignment] = useState('');
    const [grades, setGrades] = useState({});
    const [comments, setComments] = useState({});
    const [existingGrades, setExistingGrades] = useState([]);
    const [assignmentInfo, setAssignmentInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    const [notGradedYet, setNotGradedYet] = useState(false);
    const [showCriteriaModal, setShowCriteriaModal] = useState(false);
    const [editingCriteria, setEditingCriteria] = useState(null);
    const [criteriaForm, setCriteriaForm] = useState({
        name: '',
        description: '',
        max_score: 10,
        weight: 1,
        category: 'report',
        order_index: 0,
        is_active: 1,
    });

    useEffect(() => { fetchCriteria(); fetchAssignments(); }, []);

    const fetchCriteria = async () => {
        try { const res = await api.get('/grades/criteria'); setCriteria(res.data.data); } catch (err) { } finally { setLoading(false); }
    };

    const openCriteriaModal = (criteriaItem = null) => {
        if (criteriaItem) {
            setEditingCriteria(criteriaItem);
            setCriteriaForm({
                name: criteriaItem.name || '',
                description: criteriaItem.description || '',
                max_score: criteriaItem.max_score || 10,
                weight: criteriaItem.weight || 1,
                category: criteriaItem.category || 'report',
                order_index: criteriaItem.order_index || 0,
                is_active: criteriaItem.is_active ? 1 : 0,
            });
        } else {
            setEditingCriteria(null);
            setCriteriaForm({
                name: '',
                description: '',
                max_score: 10,
                weight: 1,
                category: 'report',
                order_index: criteria.length,
                is_active: 1,
            });
        }
        setShowCriteriaModal(true);
    };

    const handleSaveCriteria = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...criteriaForm,
                max_score: parseFloat(criteriaForm.max_score) || 10,
                weight: parseFloat(criteriaForm.weight) || 1,
                order_index: parseInt(criteriaForm.order_index, 10) || 0,
                is_active: criteriaForm.is_active ? 1 : 0,
            };

            if (editingCriteria) {
                await api.put(`/grades/criteria/${editingCriteria.id}`, payload);
                toast.success('Cập nhật tiêu chí thành công!');
            } else {
                await api.post('/grades/criteria', payload);
                toast.success('Tạo tiêu chí thành công!');
            }

            setShowCriteriaModal(false);
            setEditingCriteria(null);
            fetchCriteria();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi lưu tiêu chí');
        }
    };

    const fetchAssignments = async () => {
        try {
            const res = await api.get('/grades/assignments');
            setAssignments(res.data.data);
            // Sinh viên chỉ có 1 assignment của mình → tự động chọn
            if (isStudent && res.data.data.length > 0) {
                handleSelectAssignment(res.data.data[0].id);
            }
        } catch (err) { }
    };

    const fetchGrades = async (aId) => {
        try {
            setNotGradedYet(false);
            const res = await api.get(`/grades?assignment_id=${aId}`);
            // Nếu chưa được chấm điểm
            if (res.data.data.grades.length === 0 && res.data.data.assignment === null) {
                setNotGradedYet(true);
                setExistingGrades([]); setAssignmentInfo(null);
                setGrades({}); setComments({});
                return;
            }
            setExistingGrades(res.data.data.grades);
            setAssignmentInfo(res.data.data.assignment);
            const g = {}, c = {};
            res.data.data.grades.forEach(gr => { g[gr.rubric_criteria_id] = gr.score; c[gr.rubric_criteria_id] = gr.comment || ''; });
            setGrades(g); setComments(c);
        } catch (err) { }
    };

    const handleSelectAssignment = (aId) => {
        setSelectedAssignment(aId);
        if (aId) fetchGrades(aId);
        else { setExistingGrades([]); setAssignmentInfo(null); setNotGradedYet(false); }
    };

    const handleSave = async () => {
        try {
            const gradeData = criteria
                .filter(cr => grades[cr.id] !== undefined && grades[cr.id] !== '')
                .map(cr => ({
                    criteria_id: cr.id,
                    score: parseFloat(grades[cr.id]) || 0,
                    comment: comments[cr.id] || ''
                }));
            await api.post('/grades', { assignment_id: parseInt(selectedAssignment), grades: gradeData });
            toast.success('Chấm điểm thành công!');
            fetchGrades(selectedAssignment);
        } catch (err) { toast.error('Lỗi chấm điểm'); }
    };

    const totalScore = () => {
        let ws = 0, tw = 0;
        // Tính tổng trọng số của TẤT CẢ các tiêu chí
        criteria.forEach(cr => {
            tw += parseFloat(cr.weight) || 0;
            // Chỉ cộng điểm cho những tiêu chí đã chấm
            if (grades[cr.id] !== undefined && grades[cr.id] !== '') {
                const s = parseFloat(grades[cr.id]) || 0;
                const max = parseFloat(cr.max_score) || 1;
                const w = parseFloat(cr.weight) || 0;
                ws += (s / max) * w;
            }
        });
        return tw > 0 ? ((ws / tw) * 10).toFixed(2) : '0.00';
    };

    const scoreColor = (s) => {
        const n = parseFloat(s);
        if (n >= 8) return 'excellent';
        if (n >= 6.5) return 'good';
        if (n >= 5) return 'average';
        return 'poor';
    };

    const categoryLabel = { report: '📄 Báo cáo', product: '💻 Sản phẩm', presentation: '🎤 Thuyết trình', defense: '🛡️ Phản biện' };

    return (
        <>
            <Header title={isStudent ? 'Xem điểm' : 'Chấm điểm Rubric'} />
            <div className="page-content animate-fade">
                <div className="page-header">
                    <div><h1><FiAward style={{ verticalAlign: 'middle' }} /> {isStudent ? 'Bảng điểm' : 'Chấm điểm Rubric'}</h1><p>{isStudent ? 'Xem điểm đồ án tốt nghiệp' : 'Chấm điểm theo tiêu chí '}</p></div>
                </div>

                {showCriteriaModal && isAdmin && (
                    <div className="modal-overlay" onClick={() => setShowCriteriaModal(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
                            <div className="modal-header">
                                <h2>{editingCriteria ? 'Sửa tiêu chí' : 'Thêm tiêu chí'}</h2>
                                <button className="modal-close" onClick={() => setShowCriteriaModal(false)}>✕</button>
                            </div>
                            <form onSubmit={handleSaveCriteria}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label className="form-label">Tên tiêu chí *</label>
                                        <input className="form-input" value={criteriaForm.name} onChange={e => setCriteriaForm({ ...criteriaForm, name: e.target.value })} required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Mô tả</label>
                                        <textarea className="form-textarea" value={criteriaForm.description} onChange={e => setCriteriaForm({ ...criteriaForm, description: e.target.value })} />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Điểm tối đa</label>
                                            <input type="number" className="form-input" value={criteriaForm.max_score} onChange={e => setCriteriaForm({ ...criteriaForm, max_score: e.target.value })} min="0" step="0.5" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Trọng số</label>
                                            <input type="number" className="form-input" value={criteriaForm.weight} onChange={e => setCriteriaForm({ ...criteriaForm, weight: e.target.value })} min="0" step="0.1" />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Nhóm</label>
                                            <select className="form-select" value={criteriaForm.category} onChange={e => setCriteriaForm({ ...criteriaForm, category: e.target.value })}>
                                                <option value="report">Báo cáo</option>
                                                <option value="product">Sản phẩm</option>
                                                <option value="presentation">Thuyết trình</option>
                                                <option value="defense">Phản biện</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Thứ tự hiển thị</label>
                                            <input type="number" className="form-input" value={criteriaForm.order_index} onChange={e => setCriteriaForm({ ...criteriaForm, order_index: e.target.value })} min="0" step="1" />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Trạng thái</label>
                                        <select className="form-select" value={criteriaForm.is_active ? 1 : 0} onChange={e => setCriteriaForm({ ...criteriaForm, is_active: parseInt(e.target.value) })}>
                                            <option value={1}>Đang hoạt động</option>
                                            <option value={0}>Ẩn</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-outline" onClick={() => setShowCriteriaModal(false)}>Hủy</button>
                                    <button type="submit" className="btn btn-primary">{editingCriteria ? 'Cập nhật' : 'Tạo mới'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Chỉ Admin/Giảng viên mới thấy dropdown chọn sinh viên */}
                {!isStudent && (
                    <div className="card" style={{ marginBottom: 20 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Chọn sinh viên / đề tài</label>
                            <select className="form-select" value={selectedAssignment} onChange={e => handleSelectAssignment(e.target.value)}>
                                <option value="">-- Chọn --</option>
                                {assignments.map(a => <option key={a.id} value={a.id}>{a.student_code} - {a.student_name} | {a.topic_title}</option>)}
                            </select>
                        </div>
                    </div>
                )}

                {/* Sinh viên: nếu chưa có assignment thì thông báo chưa được phân công */}
                {isStudent && assignments.length === 0 && (
                    <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                        <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Chưa được phân công đề tài</h3>
                        <p style={{ color: 'var(--text-muted)' }}>Bạn chưa được phân công vào đề tài nào. Vui lòng liên hệ giảng viên.</p>
                    </div>
                )}

                {/* Sinh viên: đã có assignment nhưng chưa được chấm điểm */}
                {isStudent && assignments.length > 0 && notGradedYet && (
                    <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
                        <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Chưa được chấm điểm</h3>
                        <p style={{ color: 'var(--text-muted)' }}>Đề tài của bạn chưa được giảng viên chấm điểm. Vui lòng chờ kết quả.</p>
                        {assignments[0] && (
                            <div style={{ marginTop: 16, padding: '12px 24px', background: 'var(--bg-secondary)', borderRadius: 8, display: 'inline-block', textAlign: 'left' }}>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Đề tài của bạn</div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>{assignments[0].topic_title}</div>
                            </div>
                        )}
                    </div>
                )}

                {selectedAssignment && (
                    <>
                        {assignmentInfo && (
                            <div className="card" style={{ marginBottom: 20 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                                    <div><div className="stat-label">Sinh viên</div><div style={{ fontWeight: 700, marginTop: 4 }}>{assignmentInfo.student_name} ({assignmentInfo.student_code})</div></div>
                                    <div><div className="stat-label">Đề tài</div><div style={{ fontWeight: 600, marginTop: 4 }}>{assignmentInfo.topic_title}</div></div>
                                    <div>
                                        <div className="stat-label">Điểm tổng kết</div>
                                        <div className={`final-score ${scoreColor(totalScore())}`} style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{totalScore()}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="card rubric-table">
                            <div className="card-header">
                                <h3 className="card-title">Bảng chấm điểm chi tiết</h3>
                                <div className="btn-group">
                                    {isAdmin && (
                                        <button className="btn btn-primary" onClick={() => openCriteriaModal()}>
                                            <FiPlus /> Thêm tiêu chí
                                        </button>
                                    )}
                                    {isLecturer && <button className="btn btn-primary" onClick={handleSave}><FiSave /> Lưu điểm</button>}
                                </div>
                            </div>
                            <div className="table-container">
                                <table>
                                    <thead><tr><th>STT</th><th>Tiêu chí</th><th>Nhóm</th><th>Điểm tối đa</th><th>Trọng số</th><th>Điểm</th><th>Nhận xét</th>{isAdmin && <th>Thao tác</th>}</tr></thead>
                                    <tbody>
                                        {criteria.map((cr, i) => (
                                            <tr key={cr.id}>
                                                <td>{i + 1}</td>
                                                <td><div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cr.name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cr.description}</div></td>
                                                <td>{categoryLabel[cr.category] || cr.category}</td>
                                                <td>{formatRubricNumber(cr.max_score)}</td>
                                                <td>x{formatRubricNumber(cr.weight)}</td>
                                                <td>
                                                    {isLecturer ? (
                                                        <input type="number" className="form-input" min="0" max={cr.max_score} step="0.5" value={grades[cr.id] || ''} onChange={e => setGrades({ ...grades, [cr.id]: e.target.value })} style={{ width: 70, textAlign: 'center' }} />
                                                    ) : (
                                                        <span className={`badge ${(grades[cr.id] / cr.max_score) >= 0.8 ? 'badge-success' : (grades[cr.id] / cr.max_score) >= 0.5 ? 'badge-warning' : 'badge-danger'}`}>{grades[cr.id] || '-'}</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {isLecturer ? (
                                                        <input className="form-input" value={comments[cr.id] || ''} onChange={e => setComments({ ...comments, [cr.id]: e.target.value })} placeholder="Nhận xét..." style={{ minWidth: 120 }} />
                                                    ) : (
                                                        <span style={{ fontSize: 12 }}>{comments[cr.id] || '-'}</span>
                                                    )}
                                                </td>
                                                {isAdmin && (
                                                    <td>
                                                        <button className="btn btn-sm btn-outline" onClick={() => openCriteriaModal(cr)}>Sửa</button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16, padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
                                <span style={{ fontSize: 16, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Điểm tổng kết</span>
                                <span className={`final-score ${scoreColor(totalScore())}`} style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{totalScore()}</span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {showCriteriaModal && isAdmin && (
                <div className="modal-overlay" onClick={() => setShowCriteriaModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
                        <div className="modal-header">
                            <h2>{editingCriteria ? 'Sửa tiêu chí' : 'Thêm tiêu chí'}</h2>
                            <button className="modal-close" onClick={() => setShowCriteriaModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSaveCriteria}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Tên tiêu chí *</label>
                                    <input className="form-input" value={criteriaForm.name} onChange={e => setCriteriaForm({ ...criteriaForm, name: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Mô tả</label>
                                    <textarea className="form-textarea" value={criteriaForm.description} onChange={e => setCriteriaForm({ ...criteriaForm, description: e.target.value })} />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Điểm tối đa</label>
                                        <input type="number" className="form-input" value={criteriaForm.max_score} onChange={e => setCriteriaForm({ ...criteriaForm, max_score: e.target.value })} min="0" step="0.5" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Trọng số</label>
                                        <input type="number" className="form-input" value={criteriaForm.weight} onChange={e => setCriteriaForm({ ...criteriaForm, weight: e.target.value })} min="0" step="0.1" />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Nhóm</label>
                                        <select className="form-select" value={criteriaForm.category} onChange={e => setCriteriaForm({ ...criteriaForm, category: e.target.value })}>
                                            <option value="report">Báo cáo</option>
                                            <option value="product">Sản phẩm</option>
                                            <option value="presentation">Thuyết trình</option>
                                            <option value="defense">Phản biện</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Thứ tự hiển thị</label>
                                        <input type="number" className="form-input" value={criteriaForm.order_index} onChange={e => setCriteriaForm({ ...criteriaForm, order_index: e.target.value })} min="0" step="1" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Trạng thái</label>
                                    <select className="form-select" value={criteriaForm.is_active ? 1 : 0} onChange={e => setCriteriaForm({ ...criteriaForm, is_active: parseInt(e.target.value) })}>
                                        <option value={1}>Đang hoạt động</option>
                                        <option value={0}>Ẩn</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={() => setShowCriteriaModal(false)}>Hủy</button>
                                <button type="submit" className="btn btn-primary">{editingCriteria ? 'Cập nhật' : 'Tạo mới'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default Grades;
