import { createContext, useContext, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    // khôi phục user từ localStorage khi refresh trang
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const [loading, setLoading] = useState(false);

    const login = async (username, password, rememberMe = false) => {
        setLoading(true);
        try {
            const res = await api.post('/auth/login', { username, password, rememberMe });
            const { token, user: userData } = res.data.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData); // trigger re-render toàn app
            return { success: true };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Lỗi đăng nhập' };
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null); // → redirect về Login
    };

    const isAdmin = user?.role === 'admin';
    const isLecturer = user?.role === 'lecturer';
    const isStudent = user?.role === 'student';

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, isAdmin, isLecturer, isStudent }}>
            {children}
        </AuthContext.Provider>
    );
};
