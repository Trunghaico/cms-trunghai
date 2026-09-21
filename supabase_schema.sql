-- =========================================================================
-- HỆ THỐNG TRÌNH KÝ & PHÊ DUYỆT HỒ SƠ ĐIỆN TỬ - CÔNG TY TRUNG HẢI
-- SUPABASE POSTGRESQL DATABASE SCHEMA (BPM, DMS & USER AUTH)
-- =========================================================================

-- 1. Bảng lưu trữ thông tin Người Dùng & Tài Khoản (Users & Auth Database)
-- Bao gồm: họ và tên, username, pass, chức vụ, phòng ban
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,                  -- Họ và tên
    username TEXT UNIQUE NOT NULL,       -- Tên đăng nhập (username)
    pass TEXT NOT NULL,                  -- Mật khẩu (pass)
    role_title TEXT NOT NULL,            -- Chức vụ (VD: Trưởng phòng Kỹ thuật, Kế toán trưởng, Tổng Giám đốc)
    department TEXT NOT NULL,            -- Phòng ban (VD: Phòng Kỹ thuật & Dự án, Phòng Tài chính Kế toán)
    role TEXT NOT NULL DEFAULT 'STAFF' CHECK (role IN ('STAFF', 'DEPT_HEAD', 'CHIEF_ACCOUNTANT', 'LEGAL_DEPT', 'DIRECTOR', 'ADMIN')),
    email TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Dữ liệu mẫu người dùng ban đầu cho Công ty Trung Hải
INSERT INTO public.users (id, name, username, pass, role_title, department, role, email, avatar_url)
VALUES 
  ('user-long', 'Nguyễn Văn Long', 'long.nv', '123456', 'Chuyên viên Dự án & Hợp đồng', 'Phòng Kỹ thuật & Dự án', 'STAFF', 'long.nv@trunghai.com.vn', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
  ('user-mai', 'Trần Thị Mai', 'mai.tt', '123456', 'Trưởng phòng Kỹ thuật & Dự án', 'Phòng Kỹ thuật & Dự án', 'DEPT_HEAD', 'mai.tt@trunghai.com.vn', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'),
  ('user-nam', 'Phạm Hoàng Nam', 'nam.ph', '123456', 'Kế toán trưởng', 'Phòng Tài chính Kế toán', 'CHIEF_ACCOUNTANT', 'nam.ph@trunghai.com.vn', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'),
  ('user-tuan', 'Đặng Minh Tuấn', 'tuan.dm', '123456', 'Trưởng bộ phận Pháp chế', 'Ban Pháp chế & Kiểm soát', 'LEGAL_DEPT', 'tuan.dm@trunghai.com.vn', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'),
  ('user-hai', 'Đỗ Trung Hải', 'hai.dt', '123456', 'Tổng Giám đốc', 'Ban Giám đốc', 'DIRECTOR', 'hai.dt@trunghai.com.vn', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'),
  ('user-admin', 'Quản Trị Viên', 'admin', 'admin123', 'Quản trị viên Hệ thống', 'Phòng CNTT & Hạ tầng', 'ADMIN', 'admin@trunghai.com.vn', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80')
ON CONFLICT (username) DO UPDATE SET
  name = EXCLUDED.name,
  pass = EXCLUDED.pass,
  role_title = EXCLUDED.role_title,
  department = EXCLUDED.department,
  role = EXCLUDED.role;

-- 2. Bảng mẫu quy trình luân chuyển phê duyệt (BPM Workflow Templates)
CREATE TABLE IF NOT EXISTS public.workflow_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Bảng các bước quy trình mẫu (Workflow Template Steps)
CREATE TABLE IF NOT EXISTS public.workflow_template_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id TEXT REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
    step_order INT NOT NULL,
    title TEXT NOT NULL,
    approver_role TEXT NOT NULL,
    approver_title TEXT NOT NULL,
    department TEXT NOT NULL,
    sla_hours INT DEFAULT 8
);

-- 4. Bảng hồ sơ trình ký (Documents / Contracts)
CREATE TABLE IF NOT EXISTS public.documents (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    department TEXT NOT NULL,
    creator_id TEXT NOT NULL,
    creator_name TEXT NOT NULL,
    creator_title TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL', 'URGENT', 'VERY_URGENT')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('DRAFT', 'PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'ADDITIONAL_REQ')),
    amount NUMERIC(15, 2),
    description TEXT,
    current_step_index INT DEFAULT 0,
    deadline TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Bảng các bước phê duyệt thực tế của từng hồ sơ (Approval Steps)
CREATE TABLE IF NOT EXISTS public.approval_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id TEXT REFERENCES public.documents(id) ON DELETE CASCADE,
    step_order INT NOT NULL,
    title TEXT NOT NULL,
    approver_role TEXT NOT NULL,
    approver_id TEXT,
    approver_name TEXT NOT NULL,
    approver_title TEXT NOT NULL,
    department TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CURRENT', 'APPROVED', 'REJECTED', 'SKIPPED')),
    comment TEXT,
    decision_date TIMESTAMP WITH TIME ZONE,
    signature_image TEXT,
    sla_hours INT DEFAULT 8
);

-- 6. Bảng lưu trữ file scan & tài liệu đính kèm (DMS Attachments)
CREATE TABLE IF NOT EXISTS public.document_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id TEXT REFERENCES public.documents(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    storage_url TEXT NOT NULL,
    is_scan BOOLEAN DEFAULT false,
    uploaded_by TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Bảng nhật ký xử lý & audit trail (Audit Logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id TEXT REFERENCES public.documents(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('CREATE', 'SUBMIT', 'APPROVE', 'REJECT', 'REQUEST_INFO', 'FORWARD', 'UPDATE')),
    actor_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    actor_title TEXT NOT NULL,
    comment TEXT,
    previous_status TEXT,
    new_status TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Kích hoạt Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Cấp quyền truy cập cho anon / authenticated users
CREATE POLICY "Cho phép đọc người dùng" ON public.users FOR SELECT USING (true);
CREATE POLICY "Cho phép thêm người dùng" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Cho phép đọc hồ sơ" ON public.documents FOR SELECT USING (true);
CREATE POLICY "Cho phép tạo hồ sơ" ON public.documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Cho phép cập nhật hồ sơ" ON public.documents FOR UPDATE USING (true);
