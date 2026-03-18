import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';

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
            <div className="login-card animate-slide">
                <div className="login-logo">
                    <div className="login-logo-icon">🎓</div>
                    <h1>Quản Lý Đồ Án Tốt Nghiệp</h1>
                    <p>Hệ thống Quản lý Đồ án Tốt nghiệp</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Tên đăng nhập</label>
                        <input
                            id="login-username"
                            className="form-input"
                            type="text"
                            placeholder="Nhập tên đăng nhập..."
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Mật khẩu</label>
                        <input
                            id="login-password"
                            className="form-input"
                            type="password"
                            placeholder="Nhập mật khẩu..."
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <input
                            type="checkbox"
                            id="remember-me"
                            checked={rememberMe}
                            onChange={e => setRememberMe(e.target.checked)}
                        />
                        <label htmlFor="remember-me" style={{ fontSize: '14px', cursor: 'pointer' }}>Ghi nhớ đăng nhập</label>
                    </div>

                    <button id="login-submit" className="btn btn-primary login-btn" type="submit" disabled={loading}>
                        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    </button>
                </form>

            </div>
        </div>
    );
};

export default Login;
