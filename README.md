# SmartBio 360 – Không gian thực hành và học tập Sinh học thông minh cho học sinh THCS
### (Tích hợp Hệ sinh thái Backend Quản lý Học sinh, Lịch sử Học tập & Bảng xếp hạng)

**Sản phẩm dự thi:** Ngày hội “Nhà giáo sáng tạo với công nghệ số và trí tuệ nhân tạo năm 2026”  
**Cơ quan tổ chức:** Sở Giáo dục và Đào tạo Hà Nội (theo Công văn số 5553/SGDĐT-TCCB)  
**Địa chỉ nộp bài dự thi:** [https://www.ieeai.net](https://www.ieeai.net)

---

## 🌟 1. Giới thiệu tổng quan
**SmartBio 360** là giải pháp chuyển đổi số toàn diện kết hợp **Frontend tương tác 360°**, **Trí tuệ nhân tạo (AI)** và **Hệ thống Backend quản lý học tập máy chủ**, được thiết kế chuyên biệt cho môn **Khoa học tự nhiên & Sinh học cấp THCS (Lớp 6, 7, 8, 9)** theo Chương trình Giáo dục phổ thông 2018.

Sản phẩm giải quyết triệt để 4 bài toán lớn:
1. **Trực quan hóa cấu trúc vi mô:** Mô phỏng tương tác 3D bóc tách bào quan tế bào Thực vật, Động vật, Tim người.
2. **Cá nhân hóa học tập với AI:** Gia sư Bio-AI gợi mở tư duy (Socratic) & Kính lúp BioLens định danh sinh vật qua ảnh.
3. **Quản lý học sinh & Đánh giá quá trình (Formative Assessment):** Hệ thống máy chủ tự động lưu trữ điểm số trắc nghiệm và lịch sử học tập của từng học sinh.
4. **Gắn liền bài học với phát triển bền vững:** Bảng Vàng vinh danh toàn trường kết hợp điểm thi và điểm tích lũy từ các hành động bảo vệ môi trường, giảm rác thải nhựa (Góc Hành tinh Xanh).

---

## 🚀 2. Cách khởi chạy nhanh hệ thống (Chỉ 1 lệnh duy nhất)

Hệ thống Backend được lập trình bằng **Python (Flask + SQLite)** siêu nhẹ, không cần cài đặt phần mềm cơ sở dữ liệu cồng kềnh, hoạt động được ngay trên mọi máy tính:

### Bước 1: Mở Terminal / PowerShell
Tại thư mục dự án:
```powershell
cd C:\Users\PC\.gemini\antigravity\scratch\smartbio360
```

### Bước 2: Chạy máy chủ Server
```powershell
python server.py
```

### Bước 3: Truy cập vào ứng dụng
Mở trình duyệt (Chrome / Edge / Cốc Cốc) và truy cập đường dẫn:
👉 **`http://localhost:5000`**

*(Server sẽ tự động phục vụ đồng thời cả giao diện Frontend lẫn toàn bộ API Backend).*

---

## 👤 3. Tài khoản thử nghiệm nhanh (Học sinh & Giáo viên)

Hệ thống đã tự động cấu hình sẵn phân quyền người dùng trong `smartbio.db`:

| Tên đăng nhập | Mật khẩu | Họ và tên | Khối lớp / Phòng | Vai trò quyền hạn |
| :--- | :--- | :--- | :--- | :--- |
| **`admin`** | **`admin123`** | **Thầy Quản Trị Viên** | **Tổ Bộ Môn KHTN** | 👑 **Giáo viên / Admin (Toàn quyền Quản trị & Xuất Excel)** |
| **`nguyenan`** | `123456` | Nguyễn Bình An | Lớp 8A1 | Học sinh (Top 1 Bảng Vàng) |
| **`tranlinh`** | `123456` | Trần Khánh Linh | Lớp 7A3 | Học sinh (Tích cực hoạt động Xanh) |
| **`leminh`** | `123456` | Lê Quang Minh | Lớp 9A2 | Học sinh (Bậc thầy Di truyền học) |
| **`hoangmai`** | `123456` | Hoàng Ngọc Mai | Lớp 6B | Học sinh mới hoàn thành Quiz |

> **Lưu ý:** Khi đăng nhập bằng tài khoản Giáo viên (`admin` / `admin123`), thanh điều hướng sẽ tự động kích hoạt thêm tab **"Bảng Quản Trị"** với huy hiệu **GV** màu đỏ nổi bật.

---

## 🛠️ 4. Kiến trúc Hệ thống & Danh sách API Backend

### Cấu trúc thư mục:
```
smartbio360/
├── server.py        # Máy chủ Flask RESTful API & Server phục vụ web tĩnh
├── smartbio.db      # Cơ sở dữ liệu SQLite (Tự động tạo)
├── index.html       # Giao diện chính (SPA - Đầy đủ 6 phân hệ)
├── app.js           # Xử lý tương tác Frontend & Kết nối Backend API
├── styles.css       # Hiệu ứng đồ họa, hoạt ảnh laser scanner, cuộn mượt
└── README.md        # Tài liệu hướng dẫn & Thuyết minh sản phẩm
```

### Chi tiết các API Backend trong `server.py`:

#### 1. Nhóm Xác thực Học sinh (Authentication)
* `POST /api/auth/register`: Đăng ký tài khoản học sinh mới (Họ tên, Khối lớp 6-9, Phòng học, Username, Password). Mật khẩu được mã hóa bảo mật chuẩn PBKDF2-SHA256 với salt ngẫu nhiên.
* `POST /api/auth/login`: Xác thực đăng nhập, cấp mã Session/Token định danh.
* `POST /api/auth/logout`: Thu hồi phiên đăng nhập.
* `GET /api/auth/me`: Lấy thông tin cá nhân và tổng hợp thống kê học tập (tổng điểm quiz, số bài đã thi, số hành động xanh).

#### 2. Nhóm Luyện tập & Đánh giá năng lực (Quiz & Assessment)
* `POST /api/quiz/save`: Lưu kết quả bài làm trắc nghiệm vào cơ sở dữ liệu học sinh (Điểm số, chủ đề, danh hiệu).
* `GET /api/quiz/history`: Lấy lịch sử 20 bài làm gần nhất của học sinh đang đăng nhập.

#### 3. Nhóm Thi đua & Vinh danh (Leaderboard)
* `GET /api/leaderboard?grade=all|6|7|8|9`: Lấy bảng xếp hạng học sinh toàn trường hoặc theo từng khối lớp dựa trên tổng điểm trắc nghiệm và hoạt động sinh thái.

#### 4. Nhóm Hành tinh Xanh (Eco Planet)
* `POST /api/eco/save`: Lưu hành động xanh của học sinh (trồng cây, nhặt rác nhựa, quan sát đa dạng sinh học).
* `GET /api/eco/logs`: Tải bảng tin cộng đồng các hành động bảo vệ môi trường của học sinh toàn trường.

#### 5. Nhóm Bảng Quản Trị Viên / Giáo Viên (Admin Dashboard)
* `GET /api/admin/overview`: Lấy các chỉ số tổng quan (Tổng số HS, Tổng lượt làm bài, Tổng hoạt động xanh, Điểm trung bình toàn trường).
* `GET /api/admin/students`: Lấy danh sách toàn bộ học sinh kèm thống kê điểm số, phân lớp.
* `POST /api/admin/students/reset-password`: Đặt lại mật khẩu học sinh về mặc định `123456`.
* `DELETE /api/admin/students/<id>`: Xóa tài khoản học sinh và toàn bộ lịch sử điểm số liên quan.
* `GET /api/admin/quiz-stats`: Thống kê tỷ lệ làm đúng (%) theo từng câu hỏi và danh sách nộp bài mới nhất.
* `DELETE /api/admin/eco-logs/<id>`: Kiểm duyệt và xóa bài viết nhật ký xanh không phù hợp.
* `GET /api/admin/export-csv`: Xuất bảng điểm toàn trường ra file CSV chuẩn UTF-8 (mở trực tiếp bằng Microsoft Excel không lỗi font tiếng Việt).

---

## 📝 5. Tóm tắt Đề cương Thuyết minh Sản phẩm Dự thi

1. **Tên giải pháp:** *SmartBio 360 – Không gian thực hành và học tập Sinh học thông minh cho học sinh THCS*.
2. **Tính mới và sáng tạo:**
   * Kết hợp cả **Thực hành ảo 360°** (bóc tách tế bào, tim người) và **AI thông minh** (Bio-Tutor & BioLens Vision).
   * Có hệ thống **Backend máy chủ thực thụ** quản lý học sinh và lưu trữ hồ sơ học tập liên tục, không chỉ là trang web tĩnh thông thường.
3. **Tính ứng dụng thực tiễn:**
   * Triển khai ngay tại các trường học chỉ với 1 máy chủ mini hoặc chạy trực tiếp trên máy tính phòng máy của trường.
   * Tạo môi trường học tập trực quan, giảm chi phí hóa chất/tiêu bản thí nghiệm độc hại.
   * Khuyến khích ý thức bảo vệ môi trường, biến đổi khí hậu trong học sinh.
