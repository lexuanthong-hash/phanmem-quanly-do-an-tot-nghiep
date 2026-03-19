import axios from 'axios';

const api = axios.create({
    // Lấy URL thực tế trên Vercel, hoặc dùng '/api' để chạy proxy ở màn local
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api', 
    headers: { 'Content-Type': 'application/json' }
});

// tự động gắn JWT token vào header mỗi request
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// nếu server trả 401 (token hết hạn) → tự động logout
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
