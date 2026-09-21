# 🏢 Hệ Thống Quản Lý Phê Duyệt Hồ Sơ, Hợp Đồng & Ký Số Điện Tử (BPM - DMS)
### CÔNG TY CỔ PHẦN CÔNG NGHỆ TRUNG HẢI

Hệ thống quản trị và luân chuyển phê duyệt hồ sơ, hợp đồng kinh tế, tờ trình ngân sách và lưu trữ tài liệu số hóa (DMS) chuyên nghiệp dành cho doanh nghiệp.

---

## 📌 Mục Lục
1. [Giới Thiệu](#-giới-thiệu)
2. [Công Nghệ & Thư Viện Sử Dụng](#-công-nghệ--thư-viện-sử-dụng)
3. [Các Chức Năng Chính](#-các-chức-năng-chính)
4. [Hướng Dẫn Cài Đặt & Khởi Chạy](#-hướng-dẫn-cài-đặt--khởi-chạy)
5. [Danh Sách Tài Khoản Mẫu Để Kiểm Thử](#-danh-sách-tài-khoản-mẫu-để-kiểm-thử)
6. [Cấu Trúc Thư Mục Dự Án](#-cấu-trúc-thư-mục-dự-án)
7. [Cơ Chế Lưu Trữ & Đồng Bộ Dữ Liệu](#-cơ-chế-lưu-trữ--đồng-bộ-dữ-liệu)

---

## 📖 Giới Thiệu

Ứng dụng giúp số hóa toàn diện quy trình luân chuyển văn bản nội bộ tại doanh nghiệp:
- Rút ngắn thời gian ký duyệt hồ sơ từ nhiều ngày xuống còn vài phút.
- Tự động hóa luồng phê duyệt đa cấp theo thẩm quyền (BPM).
- Ký số điện tử và đóng dấu mộc đỏ công ty trực tiếp trên web.
- Xem trực tiếp file PDF, bản scan, báo giá, hợp đồng với trình xem tài liệu tích hợp cao cấp.
- Quản trị và phân quyền người dùng chi tiết (Role-based & Permission Matrix).

---

## 🛠️ Công Nghệ & Thư Viện Sử Dụng

| Thư viện / Công nghệ | Phiên bản | Vai trò & Mục đích sử dụng |
| :--- | :--- | :--- |
| **React** | `^18.3.1` | Thư viện UI nền tảng xây dựng giao diện Single Page Application (SPA). |
| **TypeScript** | `^5.7.3` | Ngôn ngữ gõ tĩnh giúp kiểm soát kiểu dữ liệu an toàn, hạn chế lỗi runtime. |
| **Vite** | `^6.1.0` | Build tool và Dev Server tốc độ cao, hỗ trợ Hot Module Replacement (HMR). |
| **Tailwind CSS** | `^3.4.17` | Framework CSS xây dựng giao diện chuẩn Doanh nghiệp với bảng màu Brand Blue (`#3e4095`) và Brand Red (`#ed3237`). |
| **Lucide React** | `^0.475.0` | Bộ biểu tượng (icons) hiện đại, sắc nét cho thanh điều hướng và nút chức năng. |
| **Quill.js** | `^2.0.3` | Trình soạn thảo văn bản Rich Text Editor (WYSIWYG) định dạng tờ trình, bảng biểu, tiêu đề, căn lề. |
| **Framer Motion** | `^13.4.0` | Thư viện tạo hiệu ứng chuyển cảnh mượt mà cho Modal, Popover và Animation. |
| **@supabase/supabase-js** | `^2.49.1` | Client kết nối cơ sở dữ liệu Supabase Database, Auth và Storage. |
| **React Portal + Native PDF Engine** | `React Native` | Trình xem file PDF đa tầng (`<object>`, `<iframe>`, `<embed>`, `FileReader` Base64) trực tiếp không phụ thuộc plugin ngoài. |
| **clsx & tailwind-merge** | `^2.1.1` | Tiện ích kết hợp và tối ưu hóa các class CSS Tailwind động. |

---

## 🌟 Các Chức Năng Chính

### 1. 📊 Bảng Điều Khiển Tổng Quan (Dashboard)
- **Thống kê KPI thời gian thực**: Tổng số hồ sơ, hồ sơ cần duyệt, hồ sơ đang xử lý, hồ sơ đã duyệt/từ chối.
- **Biểu đồ tỷ lệ & Trạng thái**: Phân loại theo Hợp đồng kinh tế, Tờ trình phê duyệt, Đề xuất thanh toán.
- **Danh sách hồ sơ cần xử lý khẩn cấp**: Cảnh báo hồ sơ Hỏa tốc, Khẩn cấp, Quá hạn SLA.

### 2. 📝 Khởi Tạo Hồ Sơ Trình Ký (Create Document)
- **Tự động sinh mã hồ sơ**: Theo quy chuẩn `HĐ-2026/TH-xxx`, `TTr-2026/TH-xxx`, `BB-2026/TH-xxx`.
- **Luồng người xét duyệt linh hoạt**: Gõ tìm kiếm họ tên người duyệt theo từng cấp, tự động gán chức danh và phòng ban tương ứng.
- **Người theo dõi (Cc)**: Thêm người theo dõi tiến độ với cơ chế kiểm tra chống xung đột với người duyệt.
- **Soạn thảo tờ trình phong phú**: Tích hợp trình soạn thảo Quill.js 2.0 đầy đủ công cụ định dạng.
- **Đính kèm tài liệu & Bản scan**: Tải tệp lên máy tính với cơ chế đọc Base64 (`FileReader`) lưu trữ bền vững.

### 3. ✍️ Quy Trình Phê Duyệt & Ký Số Điện Tử (BPM & E-Signature)
- **Timeline luân chuyển trực quan**: Hiển thị rõ ràng bước hiện tại, người duyệt, thời gian duyệt, chữ ký và ý kiến đóng góp.
- **Xác thực ký số**:
  - Tích hợp Chữ ký cá nhân hoặc Mộc dấu điện tử công ty (VNPT-CA / SSL Certified).
  - Tùy chọn 3 hành động: **Phê Duyệt & Ký Số**, **Yêu Cầu Bổ Sung**, **Từ Chối Duyệt**.
- **In phiếu trình ký**: Xuất bản in phiếu trình ký kèm mã vạch / QR Code chuẩn format doanh nghiệp.

### 4. 👁️ Trình Xem Tài Liệu PDF Tích Hợp (PDF & Scan Viewer)
- **Xem trực tiếp 100% file gốc**: Hiển thị file PDF hoặc ảnh scan thật mà người dùng tải lên từ máy tính.
- **Mẫu văn bản số hóa DMS (A4 Template)**: Hiển thị bản scan chuẩn A4 có dấu mộc tròn đỏ và chữ ký số đối với các hồ sơ mẫu.
- **Thanh công cụ gọn nhẹ**: Thu phóng Zoom (`-`, `100%`, `+`), Xoay 90°, Phân trang, In ấn, Tải file, Chế độ Toàn màn hình (Fullscreen).
- **Giao diện không bị che khuất**: Ứng dụng `React Portal` đưa modal lên cấp cao nhất (`document.body`) với `zIndex: 99999`.

### 5. 👥 Quản Trị Nhân Sự & Phân Quyền (User & Permission Matrix)
- Quản lý danh sách người dùng, chức danh, phòng ban và chữ ký số.
- **Ma trận phân quyền chi tiết (Fine-grained Permissions)**:
  - Phân quyền Quản lý Hồ sơ (`doc.view`, `doc.create`, `doc.delete`, `doc.print_export`...)
  - Phân quyền Phê duyệt (`approval.approve`, `approval.reject`, `approval.request_info`, `approval.override`...)
  - Phân quyền Quản trị (`user.create`, `user.edit`, `system.dashboard`...)
- **Chuyển đổi tài khoản nhanh (Quick Switch User)**: Cho phép chuyển đổi giữa các tài khoản nhân viên / sếp để test nhanh luồng duyệt.

### 6. 📜 Nhật Ký Xử Lý (Audit Trail)
- Lưu trữ vết toàn bộ lịch sử: Người tạo, Thời gian, Bước duyệt, Nội dung phản hồi, Trạng thái chuyển đổi.

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### Yêu Cầu Môi Trường:
- **Node.js**: Phiên bản `>= 18.0.0`
- **npm** hoặc **yarn** / **pnpm**

### Các Bước Thực Hiện:

1. **Di chuyển vào thư mục dự án**:
   ```bash
   cd quanlyhopdong
   ```

2. **Cài đặt các gói phụ thuộc (Dependencies)**:
   ```bash
   npm install
   ```

3. **Khởi chạy máy chủ phát triển (Development Server)**:
   ```bash
   npm run dev
   ```
   Ứng dụng sẽ chạy tại địa chỉ: **`http://localhost:5173`**

4. **Kiểm tra và đóng gói sản phẩm (Build Production)**:
   ```bash
   npm run build
   ```

---

## 🔑 Danh Sách Tài Khoản Mẫu Để Kiểm Thử

Tất cả tài khoản mẫu có thể đăng nhập bằng mật khẩu mặc định:

| Tên Đăng Nhập | Mật Khẩu | Họ Và Tên | Chức Vụ / Vai Trò | Thẩm Quyền |
| :--- | :--- | :--- | :--- | :--- |
| **`hai.dt`** | `123456` | **Đỗ Trung Hải** | Tổng Giám đốc | Ký duyệt cấp cao nhất, phê duyệt ngân sách lớn |
| **`nam.ph`** | `123456` | **Phạm Hoàng Nam** | Kế toán trưởng | Kiểm soát tài chính, định mức ngân sách |
| **`tuan.dm`** | `123456` | **Đặng Minh Tuấn** | Trưởng BP Pháp chế | Thẩm định pháp lý, điều khoản hợp đồng |
| **`mai.tt`** | `123456` | **Trần Thị Mai** | Trưởng phòng Kỹ thuật | Duyệt bước 1 chuyên môn kỹ thuật |
| **`long.nv`** | `123456` | **Nguyễn Văn Long** | Chuyên viên Hợp đồng | Lập hồ sơ, soạn thảo tờ trình |
| **`admin`** | `admin123` | **Quản Trị Viên** | Quản trị hệ thống | Toàn quyền cấu hình, phân quyền nhân sự |

> 💡 *Mẹo: Bạn có thể nhấn vào biểu tượng avatar ở góc trên cùng bên phải để chuyển đổi nhanh giữa các tài khoản mà không cần đăng xuất.*

---

## 📁 Cấu Trúc Thư Mục Dự Án

```
quanlyhopdong/
├── public/                     # Tài nguyên tĩnh
├── src/
│   ├── components/
│   │   ├── auth/               # Giao diện Đăng nhập & Xác thực
│   │   │   └── LoginPage.tsx
│   │   ├── common/             # Các component dùng chung
│   │   │   ├── PDFViewerModal.tsx  # Trình xem file PDF & Bản scan
│   │   │   └── QuillEditor.tsx     # Bộ soạn thảo Rich Text 2.0
│   │   ├── dashboard/          # Giao diện Dashboard & Thống kê KPI
│   │   │   └── DashboardView.tsx
│   │   ├── dms/                # Quản lý kho lưu trữ tài liệu DMS
│   │   │   └── DMSStorageView.tsx
│   │   ├── documents/          # Quản lý hồ sơ & Luồng phê duyệt
│   │   │   ├── CreateDocumentModal.tsx  # Modal tạo hồ sơ mới
│   │   │   ├── DocumentDetailModal.tsx  # Modal chi tiết & Ký duyệt
│   │   │   ├── DocumentFilter.tsx       # Bộ lọc & Tìm kiếm hồ sơ
│   │   │   ├── DocumentTable.tsx        # Bảng danh sách hồ sơ
│   │   │   ├── ApprovalTimeline.tsx     # Sơ đồ tiến trình BPM
│   │   │   └── DigitalSignaturePad.tsx  # Bảng ký số điện tử
│   │   ├── layout/             # Khung sườn ứng dụng
│   │   │   ├── Header.tsx      # Thanh Header trên cùng
│   │   │   └── Sidebar.tsx     # Menu điều hướng bên trái
│   │   ├── users/              # Quản lý người dùng & Phân quyền
│   │   │   └── UserManagementView.tsx
│   │   └── workflow/           # Cấu hình quy trình mẫu
│   │       └── WorkflowConfigView.tsx
│   ├── context/
│   │   └── DocumentContext.tsx # State Management trung tâm cho toàn bộ App
│   ├── lib/
│   │   ├── initialData.ts      # Dữ liệu khởi tạo mẫu (Users, Documents, Templates)
│   │   ├── permissions.ts      # Ma trận định nghĩa thẩm quyền chi tiết
│   │   ├── storage.ts          # Tiện ích đọc/ghi LocalStorage & Format
│   │   └── supabaseClient.ts   # Cấu hình kết nối Supabase
│   ├── types/
│   │   └── index.ts            # Định nghĩa toàn bộ TypeScript Interfaces & Types
│   ├── App.tsx                 # Component gốc điều hướng màn hình
│   ├── index.css               # CSS toàn cục & cấu hình màu thương hiệu
│   └── main.tsx                # Entry point khởi chạy React 18
├── index.html                  # File HTML chính
├── package.json                # Danh sách thư viện và scripts
├── tailwind.config.js          # Cấu hình màu sắc, animation Tailwind CSS
├── tsconfig.json               # Cấu hình TypeScript
└── vite.config.ts              # Cấu hình Vite Build Tool
```

---

## 💾 Cơ Chế Lưu Trữ & Đồng Bộ Dữ Liệu

1. **Lưu trữ Offline / LocalStorage**:
   - Tất cả dữ liệu hồ sơ, tệp đính kèm Base64, nhật ký xử lý và phân quyền người dùng được lưu trữ tự động vào `localStorage` của trình duyệt.
   - Giúp ứng dụng hoạt động tức thì, không bị mất dữ liệu khi tải lại trang (F5).
2. **Tích hợp Cơ sở dữ liệu Supabase (Tùy chọn)**:
   - File cấu hình schema SQL sẵn có tại `supabase_schema.sql` để triển khai lên cloud database Postgres của Supabase khi cần đồng bộ đa người dùng trực tuyến.

---

*Hệ thống được phát triển bởi Bộ phận Công nghệ Thông tin - Công ty Cổ phần Công nghệ Trung Hải.*
