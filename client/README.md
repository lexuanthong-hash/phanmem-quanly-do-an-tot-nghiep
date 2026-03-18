# 🖥️ Frontend - React + Vite

> Giao diện người dùng cho Hệ thống Quản lý Đề tài và Khóa luận.

[![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React Router](https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=react-router&logoColor=white)](https://reactrouter.com/)

---

## 📑 Mục lục

- [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Hướng dẫn cài đặt & Chạy dự án](#-hướng-dẫn-cài-đặt--chạy-dự-án)
- [Thư viện sử dụng](#-thư-viện-sử-dụng)
- [Phân quyền hệ thống (UI)](#-phân-quyền-hệ-thống-ui)

---

## 📁 Cấu trúc thư mục

```text
client/src/
├── api/                  # Axios HTTP client, tự động gắn JWT token vào header
├── components/           # Các component dùng chung
│   ├── Sidebar.jsx       # Thanh điều hướng bên trái (thay đổi theo role)
│   └── Header.jsx        # Thanh công cụ phía trên & dropdown thông báo
├── contexts/             # Quản lý state toàn cục (Context API)
│   └── AuthContext.jsx   # State xác thực người dùng (đăng nhập/đăng xuất)
├── pages/                # Các trang chính của ứng dụng
│   ├── Login/            # Trang đăng nhập
│   ├── Dashboard/        # Bảng điều khiển, thống kê & biểu đồ (Recharts)
│   ├── Topics/           # Quản lý đề tài (CRUD, filter, modal)
│   ├── Wishes/           # Đăng ký và duyệt nguyện vọng
│   ├── Milestones/       # Quản lý các mốc tiến độ
│   ├── Progress/         # Nộp báo cáo và đánh giá tiến độ
│   ├── Grades/           # Chấm điểm và xem điểm (dựa trên rubric)
│   ├── Users/            # Quản lý tài khoản người dùng (dành cho Admin)
│   ├── Notifications/    # Trang xem danh sách thông báo
│   └── AuditLogs/        # Nhật ký hoạt động của hệ thống (dành cho Admin)
├── App.jsx               # Cấu hình Router & Protected Routes (bảo vệ trang)
├── main.jsx              # Entry point của ứng dụng React
└── index.css             # Design system (hỗ trợ dark theme, utility classes)
```

---

## ⚙️ Yêu cầu hệ thống

- **Node.js**: Phiên bản 16.x trở lên
- **npm** hoặc **yarn**

---

## 🚀 Hướng dẫn cài đặt & Chạy dự án

1. **Cài đặt các gói phụ thuộc (dependencies):**
   ```bash
   npm install
   ```

2. **Chạy server phát triển (development server):**
   ```bash
   npm run dev
   ```
   Sau khi chạy thành công, ứng dụng sẽ có mặt tại: [http://localhost:5173](http://localhost:5173)

---

## 📦 Thư viện sử dụng

| Thư viện | Mục đích sử dụng |
|----------|-----------------|
| **react-router-dom** | Quản lý định tuyến (Routing) cho Single Page Application (SPA) |
| **axios** | Thực hiện gọi API đến backend |
| **recharts** | Vẽ biểu đồ trực quan thống kê trên Dashboard |
| **react-icons** | Cung cấp hệ thống icon đa dạng, tối ưu hóa kích thước |
| **react-toastify** | Hiển thị thông báo popup (toast) đẹp mắt, dễ tùy chỉnh |

---

## 🔐 Phân quyền hệ thống (UI)

Dưới đây là bảng phân quyền truy cập và thao tác trên giao diện dựa theo vai trò của người dùng:

| Trang / Chức năng | 👑 Admin | 👨‍🏫 Giảng viên (GV) | 👨‍🎓 Sinh viên (SV) |
|-------------------|----------|--------------------|-------------------|
| **Dashboard** | ✅ (Quản lý chung) | ✅ (Lớp/Nhóm của GV) | ✅ (Cá nhân SV) |
| **Đề tài** | Quản lý CRUD + Duyệt | Quản lý CRUD | Chỉ xem |
| **Nguyện vọng** | Duyệt / Từ chối | Duyệt / Từ chối | Đăng ký |
| **Mốc tiến độ** | Quản lý CRUD | Quản lý CRUD | ❌ Không có quyền |
| **Tiến độ** | Xem tổng quan | Đánh giá, nhận xét | Nộp báo cáo |
| **Chấm điểm** | Chấm điểm | Chấm điểm | Xem điểm |
| **Tài khoản** | Quản lý CRUD | ❌ Không có quyền | ❌ Không có quyền |
| **Audit Log** | ✅ Truy cập đầy đủ | ❌ Không có quyền | ❌ Không có quyền |


