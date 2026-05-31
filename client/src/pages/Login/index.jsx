import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiUser, FiLock, FiArrowRight, FiCheckCircle } from 'react-icons/fi';

const FEATURES = [
    { title: 'Đề tài', desc: 'Đăng ký & duyệt nhanh' },
    { title: 'Tiến độ', desc: 'Mốc nộp rõ ràng' },
    { title: 'Thông báo', desc: 'Cập nhật tức thì' },
];

const Login = () => {
    const { user, login, loading } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const [rememberMe, setRememberMe] = useState(() => {
        return localStorage.getItem('rememberMe') === 'true';
    });

    useEffect(() => {
        if (rememberMe) {
            const savedUsername = localStorage.getItem('savedUsername');
            if (savedUsername) setUsername(savedUsername);
        }
    }, [rememberMe]);

    if (user) return <Navigate to="/" />;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await login(username, password, rememberMe);
        if (result.success) {
            toast.success('Đăng nhập thành công!');
            if (rememberMe) {
                localStorage.setItem('rememberMe', 'true');
                localStorage.setItem('savedUsername', username);
            } else {
                localStorage.removeItem('rememberMe');
                localStorage.removeItem('savedUsername');
            }
        } else {
            toast.error(result.message);
        }
    };

    return (
        <div className="login-page">
            <div className="login-page-orb login-page-orb--1" aria-hidden="true" />
            <div className="login-page-orb login-page-orb--2" aria-hidden="true" />

            <div className="login-shell login-enter">
                <aside className="login-brand">
                    <div className="login-brand-mesh" aria-hidden="true" />
                    <div className="login-brand-inner">
                        <div className="login-emblem" aria-hidden="true">
                            <span>QL</span>
                        </div>
                        <p className="login-brand-tag">Hệ thống quản lý</p>
                        <h1>Đồ án Tốt nghiệp</h1>
                        <p className="login-brand-desc">
                            Nền tảng kết nối sinh viên, giảng viên hướng dẫn và ban quản trị trong một quy trình thống nhất.
                        </p>

                        <div className="login-feature-grid">
                            {FEATURES.map((f) => (
                                <div key={f.title} className="login-feature-card">
                                    <FiCheckCircle className="login-feature-icon" aria-hidden="true" />
                                    <div>
                                        <strong>{f.title}</strong>
                                        <span>{f.desc}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                <section className="login-panel">
                    <div className="login-form-card">
                        <header className="login-form-header">
                            <span className="login-form-eyebrow">Chào mừng trở lại</span>
                            <h2>Đăng nhập</h2>
                            <p>Sử dụng tài khoản do quản trị viên cấp</p>
                        </header>

                        <form onSubmit={handleSubmit} className="login-form">
                            <div className="login-field">
                                <label className="login-label" htmlFor="login-username">Tên đăng nhập</label>
                                <div className="login-input-wrap">
                                    <FiUser className="login-input-icon" aria-hidden="true" />
                                    <input
                                        id="login-username"
                                        className="login-input"
                                        type="text"
                                        placeholder="sv_le, gv_nguyen, admin..."
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        autoComplete="username"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="login-field">
                                <label className="login-label" htmlFor="login-password">Mật khẩu</label>
                                <div className="login-input-wrap">
                                    <FiLock className="login-input-icon" aria-hidden="true" />
                                    <input
                                        id="login-password"
                                        className="login-input"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        autoComplete="current-password"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="login-form-row">
                                <label className="login-remember" htmlFor="remember-me">
                                    <input
                                        type="checkbox"
                                        id="remember-me"
                                        checked={rememberMe}
                                        onChange={e => setRememberMe(e.target.checked)}
                                    />
                                    <span>Ghi nhớ đăng nhập</span>
                                </label>
                            </div>

                            <button id="login-submit" className="login-submit" type="submit" disabled={loading}>
                                <span>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
                                {!loading && <FiArrowRight aria-hidden="true" />}
                            </button>
                        </form>

                        <p className="login-footer-note">
                            Quên mật khẩu? Liên hệ quản trị viên để được hỗ trợ.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Login;
