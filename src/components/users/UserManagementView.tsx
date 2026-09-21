import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDocument } from '../../context/DocumentContext';
import { User, UserRole, PermissionId, UserPosition, PermissionPreset } from '../../types';
import { PermissionPresetModal } from './PermissionPresetModal';
import {
  ALL_PERMISSIONS,
  PERMISSION_CATEGORIES,
  ROLE_PRESET_PERMISSIONS
} from '../../lib/permissions';
import {
  Users,
  UserPlus,
  Search,
  Trash2,
  Edit3,
  KeyRound,
  Building2,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  X,
  Plus,
  Sliders,
  Check,
  FileText,
  CheckSquare,
  GitFork,
  Archive,
  BarChart3,
  Sparkles
} from 'lucide-react';

// Portal component an toàn cho React + Framer Motion
const SafePortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

export const UserManagementView: React.FC = () => {
  const {
    users,
    activeUser,
    createUser,
    updateUser,
    deleteUser,
    hasPermission,
    departments: systemDepts,
    jobTitles: systemJobTitles,
    permissionPresets,
    createPermissionPreset
  } = useDocument();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // View Permissions Quick Modal
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);

  // Permission Presets Modal & Quick Save
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string>('');
  const [isQuickSavePresetOpen, setIsQuickSavePresetOpen] = useState(false);
  const [quickPresetName, setQuickPresetName] = useState('');
  const [quickSaveMsg, setQuickSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [department, setDepartment] = useState('Phòng Kỹ thuật & Dự án');
  const [role, setRole] = useState<UserRole>('STAFF');
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionId[]>([]);
  const [secondaryPositions, setSecondaryPositions] = useState<UserPosition[]>([]);

  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [errorMsg, setErrorMsg] = useState('');

  // Lấy danh sách các phòng ban duy nhất (kết hợp từ danh mục cấu hình và users)
  const departments = useMemo(() => {
    const fromDepts = systemDepts.map(d => d.name);
    const fromUsers = users.map(u => u.department);
    return Array.from(new Set([...fromDepts, ...fromUsers]));
  }, [systemDepts, users]);

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswordMap(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const addSecondaryPosition = () => {
    setSecondaryPositions(prev => [
      ...prev,
      {
        roleTitle: '',
        department: departments[0] || 'Phòng Kỹ thuật & Dự án',
        role: 'DEPT_HEAD'
      }
    ]);
  };

  const updateSecondaryPosition = (index: number, field: keyof UserPosition, value: any) => {
    setSecondaryPositions(prev => prev.map((pos, idx) => {
      if (idx !== index) return pos;
      return { ...pos, [field]: value };
    }));
  };

  const removeSecondaryPosition = (index: number) => {
    setSecondaryPositions(prev => prev.filter((_, idx) => idx !== index));
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFullName('');
    setUsername('');
    setPassword('123456');
    const defaultPreset = permissionPresets.find(p => p.role === 'STAFF') || permissionPresets[0];
    if (defaultPreset) {
      setActivePresetId(defaultPreset.id);
      setRole(defaultPreset.role);
      setRoleTitle(defaultPreset.roleTitle || defaultPreset.name);
      setSelectedPermissions([...defaultPreset.permissions]);
    } else {
      setActivePresetId('');
      setRole('STAFF');
      setRoleTitle('Chuyên viên');
      setSelectedPermissions([...ROLE_PRESET_PERMISSIONS.STAFF]);
    }
    setDepartment('Phòng Kỹ thuật & Dự án');
    setSecondaryPositions([]);
    setErrorMsg('');
    setIsQuickSavePresetOpen(false);
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFullName(user.name);
    setUsername(user.username);
    setPassword(user.pass);
    setRoleTitle(user.roleTitle);
    setDepartment(user.department);
    setRole(user.role);
    const userPerms = user.permissions || ROLE_PRESET_PERMISSIONS[user.role] || [...ROLE_PRESET_PERMISSIONS.STAFF];
    setSelectedPermissions(userPerms);

    // Tìm preset tương ứng
    const matched = permissionPresets.find(p => p.role === user.role);
    setActivePresetId(matched?.id || '');

    setSecondaryPositions(user.secondaryPositions ? [...user.secondaryPositions] : []);
    setErrorMsg('');
    setIsQuickSavePresetOpen(false);
    setIsModalOpen(true);
  };

  // Áp dụng mẫu quyền nhanh (Preset)
  const applyPreset = (preset: PermissionPreset) => {
    setActivePresetId(preset.id);
    setRole(preset.role);
    setSelectedPermissions([...preset.permissions]);
    if (!editingUser) {
      setRoleTitle(preset.roleTitle || preset.name);
    }
  };

  // Lưu quyền hiện tại thành một mẫu tùy chọn mới
  const handleQuickSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickPresetName.trim();
    if (!trimmed) {
      setQuickSaveMsg({ type: 'error', text: 'Vui lòng nhập tên mẫu phân quyền.' });
      return;
    }
    const res = createPermissionPreset({
      name: trimmed,
      role,
      roleTitle: roleTitle.trim() || trimmed,
      permissions: selectedPermissions,
      description: `Mẫu tạo nhanh từ giao diện người dùng`
    });
    if (res.success && res.preset) {
      setActivePresetId(res.preset.id);
      setQuickSaveMsg({ type: 'success', text: `Đã lưu mẫu "${trimmed}" thành công!` });
      setTimeout(() => {
        setIsQuickSavePresetOpen(false);
        setQuickPresetName('');
        setQuickSaveMsg(null);
      }, 1000);
    } else {
      setQuickSaveMsg({ type: 'error', text: res.message || 'Không thể lưu mẫu.' });
    }
  };

  // Toggle từng quyền
  const togglePermission = (permId: PermissionId) => {
    setSelectedPermissions(prev =>
      prev.includes(permId)
        ? prev.filter(id => id !== permId)
        : [...prev, permId]
    );
  };

  // Toggle toàn bộ quyền của 1 nhóm
  const toggleCategoryPermissions = (categoryId: string) => {
    const categoryPermIds = ALL_PERMISSIONS.filter(p => p.category === categoryId).map(p => p.id);
    const allSelected = categoryPermIds.every(id => selectedPermissions.includes(id));

    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(id => !categoryPermIds.includes(id)));
    } else {
      setSelectedPermissions(prev => Array.from(new Set([...prev, ...categoryPermIds])));
    }
  };

  const selectAllPermissions = () => {
    setSelectedPermissions(ALL_PERMISSIONS.map(p => p.id));
  };

  const clearAllPermissions = () => {
    setSelectedPermissions([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim() || !username.trim() || !password.trim() || !roleTitle.trim() || !department.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ các thông tin bắt buộc (*)');
      return;
    }

    const validSecondaryPositions = secondaryPositions
      .map(p => ({
        roleTitle: p.roleTitle.trim(),
        department: p.department.trim(),
        role: p.role || 'STAFF'
      }))
      .filter(p => p.roleTitle && p.department);

    if (editingUser) {
      const result = updateUser(editingUser.id, {
        name: fullName.trim(),
        username: username.trim().toLowerCase(),
        pass: password.trim(),
        roleTitle: roleTitle.trim(),
        department: department.trim(),
        role: role,
        permissions: selectedPermissions,
        secondaryPositions: validSecondaryPositions,
      });

      if (result.success) {
        handleCloseModal();
      } else {
        setErrorMsg(result.message || 'Cập nhật thất bại.');
      }
    } else {
      const result = createUser({
        name: fullName.trim(),
        username: username.trim().toLowerCase(),
        pass: password.trim(),
        roleTitle: roleTitle.trim(),
        department: department.trim(),
        role: role,
        permissions: selectedPermissions,
        secondaryPositions: validSecondaryPositions,
      });

      if (result.success) {
        handleCloseModal();
      } else {
        setErrorMsg(result.message || 'Thêm người dùng thất bại.');
      }
    }
  };

  const handleDelete = (userId: string, userName: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa tài khoản "${userName}"?`)) {
      const result = deleteUser(userId);
      if (!result.success) {
        alert(result.message);
      }
    }
  };

  const canCreateUser = hasPermission('user.create') || activeUser?.role === 'ADMIN' || activeUser?.role === 'DIRECTOR' || !activeUser;
  const canEditUser = hasPermission('user.edit') || activeUser?.role === 'ADMIN' || activeUser?.role === 'DIRECTOR' || !activeUser;
  const canDeleteUser = hasPermission('user.delete') || activeUser?.role === 'ADMIN' || activeUser?.role === 'DIRECTOR';

  // Filter and Mặc định sắp xếp theo bảng chữ cái tiếng Việt (alphaB)
  const sortedAndFilteredUsers = useMemo(() => {
    return users
      .filter(user => {
        if (selectedDept !== 'ALL' && user.department !== selectedDept) return false;
        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          return (
            user.name.toLowerCase().includes(q) ||
            user.username.toLowerCase().includes(q) ||
            user.roleTitle.toLowerCase().includes(q) ||
            user.department.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const partsA = a.name.trim().split(' ');
        const partsB = b.name.trim().split(' ');
        const firstNameA = partsA[partsA.length - 1] || '';
        const firstNameB = partsB[partsB.length - 1] || '';
        const cmpFirst = firstNameA.localeCompare(firstNameB, 'vi', { sensitivity: 'base' });
        if (cmpFirst !== 0) return cmpFirst;
        return a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' });
      });
  }, [users, selectedDept, searchTerm]);

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'FileText': return <FileText className="h-4 w-4 text-blue-600 shrink-0" />;
      case 'CheckSquare': return <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" />;
      case 'GitFork': return <GitFork className="h-4 w-4 text-purple-600 shrink-0" />;
      case 'Archive': return <Archive className="h-4 w-4 text-amber-600 shrink-0" />;
      case 'Users': return <Users className="h-4 w-4 text-red-600 shrink-0" />;
      case 'BarChart3': return <BarChart3 className="h-4 w-4 text-indigo-600 shrink-0" />;
      default: return <Sliders className="h-4 w-4 text-slate-600 shrink-0" />;
    }
  };

  return (
    <div className="space-y-5">

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-[3px] border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-blue" />
            <span>Phân Quyền & Quản Lý Người Dùng</span>
            <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-700 font-bold rounded-[3px] border border-slate-200">
              {users.length} tài khoản
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Danh sách nhân sự được sắp xếp theo bảng chữ cái A-Z và cấu hình quyền chi tiết
          </p>
        </div>

        {canCreateUser && (
          <button
            type="button"
            onClick={openCreateModal}
            className="px-3.5 py-2 bg-brand-red hover:bg-brand-red-dark active:scale-[0.98] text-white text-xs font-bold uppercase tracking-wider rounded-[3px] shadow transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            <span>Thêm Người Dùng</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-[3px] border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên, username, chức vụ..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-[3px] focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-blue transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-600 hidden sm:inline">Phòng ban:</span>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-[3px] font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-blue w-full sm:w-auto"
          >
            <option value="ALL">Tất cả phòng ban</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table with Vertical Column Dividers & STT */}
      <div className="bg-white rounded-[3px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider divide-x divide-slate-200">
              <tr>
                <th className="px-3 py-3 text-center w-12 shrink-0">STT</th>
                <th className="px-4 py-3">Họ Và Tên</th>
                <th className="px-4 py-3">Tên Đăng Nhập</th>
                <th className="px-4 py-3">Mật Khẩu</th>
                <th className="px-4 py-3">Chức Vụ</th>
                <th className="px-4 py-3">Phòng Ban</th>
                <th className="px-4 py-3 text-center">Ma Trận Quyền</th>
                <th className="px-4 py-3 text-center w-24">Thao Tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {sortedAndFilteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Không tìm thấy người dùng nào phù hợp
                  </td>
                </tr>
              ) : (
                sortedAndFilteredUsers.map((user, idx) => {
                  const isCurrentLoggedUser = activeUser?.id === user.id;
                  const isPassVisible = showPasswordMap[user.id] || false;
                  const permCount = (user.permissions || []).length;
                  const totalPerms = ALL_PERMISSIONS.length;
                  const isFullAdmin = user.role === 'ADMIN' || permCount === totalPerms;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-blue-50/40 transition-colors divide-x divide-slate-200"
                    >
                      {/* 1. STT */}
                      <td className="px-3 py-2.5 text-center text-slate-500 font-mono text-[11px] font-semibold bg-slate-50/50">
                        {idx + 1}
                      </td>

                      {/* 2. Họ và tên (No Avatar) */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{user.name}</span>
                          {isCurrentLoggedUser && (
                            <span className="text-[9px] font-bold text-brand-blue bg-blue-50 border border-brand-blue/30 px-1.5 py-0.2 rounded-[2px]">
                              Tôi
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Username */}
                      <td className="px-4 py-2.5 font-mono font-bold text-brand-blue whitespace-nowrap">
                        @{user.username}
                      </td>

                      {/* 4. Password */}
                      <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{isPassVisible ? user.pass : '••••••'}</span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(user.id)}
                            className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer transition-colors"
                            title={isPassVisible ? 'Ẩn mật khẩu' : 'Xem mật khẩu'}
                          >
                            {isPassVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </td>

                      {/* 5. Chức vụ */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{user.roleTitle}</div>
                        {user.secondaryPositions && user.secondaryPositions.length > 0 && (
                          <div className="mt-1 flex flex-col gap-0.5">
                            {user.secondaryPositions.map((sp, sIdx) => (
                              <span key={sIdx} className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-900 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-[2px] w-fit">
                                <Briefcase className="h-2.5 w-2.5 text-amber-600 shrink-0" />
                                <span>Kiêm: {sp.roleTitle}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* 6. Phòng ban */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="text-slate-700 font-medium">{user.department}</div>
                        {user.secondaryPositions && user.secondaryPositions.length > 0 && (
                          <div className="mt-1 flex flex-col gap-0.5">
                            {user.secondaryPositions.map((sp, sIdx) => (
                              <span key={sIdx} className="inline-flex items-center gap-1 text-[10px] text-amber-800 font-medium">
                                <Building2 className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                                <span>{sp.department}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* 7. Ma trận quyền */}
                      <td className="px-4 py-2.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setInspectingUser(user)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-brand-blue/40 rounded-[3px] text-slate-700 hover:text-brand-blue transition-all cursor-pointer group shadow-2xs active:scale-95"
                          title="Xem chi tiết các quyền đã cấp"
                        >
                          <ShieldCheck className={`h-3.5 w-3.5 ${isFullAdmin ? 'text-purple-600' : 'text-brand-blue'}`} />
                          <span className="font-bold font-mono text-[11px]">
                            {permCount}/{totalPerms}
                          </span>
                          {isFullAdmin ? (
                            <span className="text-[9px] font-bold px-1 bg-purple-100 text-purple-700 rounded">Toàn quyền</span>
                          ) : (
                            <span className="text-[9px] text-slate-400 group-hover:text-brand-blue">Chi tiết</span>
                          )}
                        </button>
                      </td>

                      {/* 8. Thao tác */}
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {canEditUser && (
                            <button
                              type="button"
                              onClick={() => openEditModal(user)}
                              title="Sửa thông tin & phân quyền"
                              className="p-1.5 text-slate-600 hover:text-brand-blue hover:bg-blue-50 rounded-[3px] border border-slate-200 transition-colors cursor-pointer active:scale-90"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {!isCurrentLoggedUser && canDeleteUser && (
                            <button
                              type="button"
                              onClick={() => handleDelete(user.id, user.name)}
                              title="Xóa người dùng"
                              className="p-1.5 text-slate-400 hover:text-brand-red hover:bg-red-50 rounded-[3px] border border-slate-200 transition-colors cursor-pointer active:scale-90"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Tổng số: <strong className="text-slate-800">{sortedAndFilteredUsers.length}</strong> tài khoản (Sắp xếp A-Z)</span>
          <span className="font-medium text-slate-600">Hệ thống Trình ký & Quản lý Phân quyền</span>
        </div>
      </div>

      {/* VIEW PERMISSIONS POPUP (SafePortal + Framer Motion) */}
      <SafePortal>
        <AnimatePresence>
          {inspectingUser && (
            <motion.div
              key="inspect-user-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden"
              onClick={(e) => {
                if (e.target === e.currentTarget) setInspectingUser(null);
              }}
            >
              <motion.div
                key="inspect-user-modal"
                initial={{ scale: 0.94, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 15 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="bg-white rounded-[4px] max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
              >

                {/* Modal Header */}
                <div className="px-4 py-3 bg-brand-blue text-white flex items-center justify-between shrink-0 shadow-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-amber-300" />
                    <div>
                      <h3 className="font-bold text-xs sm:text-sm">
                        Quyền hạn: {inspectingUser.name}
                      </h3>
                      <p className="text-[10px] text-blue-100">
                        @{inspectingUser.username} • {inspectingUser.roleTitle} ({inspectingUser.department})
                        {inspectingUser.secondaryPositions && inspectingUser.secondaryPositions.length > 0 && (
                          <span className="text-amber-200"> • Kiêm: {inspectingUser.secondaryPositions.map(s => `${s.roleTitle} (${s.department})`).join(', ')}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectingUser(null)}
                    className="text-white/80 hover:text-white p-1 transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 rounded-[3px] text-xs font-semibold text-slate-700">
                    <span>Số quyền được cấp:</span>
                    <span className="font-mono font-bold text-brand-blue">
                      {(inspectingUser.permissions || []).length} / {ALL_PERMISSIONS.length} quyền
                    </span>
                  </div>

                  {PERMISSION_CATEGORIES.map(cat => {
                    const catPerms = ALL_PERMISSIONS.filter(p => p.category === cat.id);
                    return (
                      <div key={cat.id} className="border border-slate-200 rounded-[3px] overflow-hidden bg-white">
                        <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 font-bold text-[11px] text-slate-800">
                          {getCategoryIcon(cat.iconName)}
                          <span>{cat.name}</span>
                        </div>
                        <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {catPerms.map(p => {
                            const isGranted = (inspectingUser.permissions || []).includes(p.id) || inspectingUser.role === 'ADMIN';
                            return (
                              <div
                                key={p.id}
                                className={`px-2 py-1.5 rounded-[2px] border text-[11px] flex items-center justify-between ${isGranted
                                    ? 'bg-blue-50/60 border-brand-blue/30 text-brand-blue font-semibold'
                                    : 'bg-slate-50 border-slate-200 text-slate-400 opacity-50'
                                  }`}
                              >
                                <span>{p.name}</span>
                                {isGranted ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                ) : (
                                  <X className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Modal Footer */}
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
                  <button
                    type="button"
                    onClick={() => setInspectingUser(null)}
                    className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-[3px] transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </SafePortal>

      {/* CREATE / EDIT USER MODAL (SafePortal + Framer Motion) */}
      <SafePortal>
        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              key="user-form-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden"
              onClick={(e) => {
                if (e.target === e.currentTarget) handleCloseModal();
              }}
            >
              <motion.form
                key="user-form-box"
                initial={{ scale: 0.94, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 15 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                onSubmit={handleSubmit}
                className="bg-white rounded-[4px] max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] my-auto"
              >

                {/* Modal Header */}
                <div className="px-4 py-3 bg-brand-blue text-white flex items-center justify-between shrink-0 shadow-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-amber-300" />
                    <h3 className="font-bold text-sm">
                      {editingUser ? 'Chỉnh Sửa Quyền & Tài Khoản' : 'Thêm Người Dùng Mới'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="text-white/80 hover:text-white p-1 transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Modal Body Form */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
                  {errorMsg && (
                    <div className="p-2.5 bg-red-50 border border-brand-red/30 rounded-[3px] text-xs text-brand-red flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* 1. Thông Tin Cơ Bản */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-[3px] space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Họ và tên <span className="text-brand-red">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="VD: Nguyễn Văn Long"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-[2px] font-medium focus:outline-none focus:ring-1 focus:ring-brand-blue"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Tên đăng nhập (Username) <span className="text-brand-red">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="VD: long.nv"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-[2px] font-mono focus:outline-none focus:ring-1 focus:ring-brand-blue"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Mật khẩu (Pass) <span className="text-brand-red">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Nhập mật khẩu..."
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-[2px] font-mono focus:outline-none focus:ring-1 focus:ring-brand-blue"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Chức vụ <span className="text-brand-red">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          list="system-job-titles-list"
                          value={roleTitle}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRoleTitle(val);
                            // Auto prefill department & role if matched
                            const matchedJob = systemJobTitles.find(j => j.name.toLowerCase() === val.toLowerCase());
                            if (matchedJob) {
                              if (matchedJob.department) {
                                setDepartment(matchedJob.department);
                              }
                              if (matchedJob.defaultRole) {
                                setRole(matchedJob.defaultRole);
                                setSelectedPermissions(ROLE_PRESET_PERMISSIONS[matchedJob.defaultRole] || [...ROLE_PRESET_PERMISSIONS.STAFF]);
                              }
                            }
                          }}
                          placeholder="Chọn hoặc nhập chức vụ..."
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-[2px] font-medium focus:outline-none focus:ring-1 focus:ring-brand-blue"
                        />
                        <datalist id="system-job-titles-list">
                          {systemJobTitles.map(j => (
                            <option key={j.id} value={j.name}>{j.code} - {j.name}</option>
                          ))}
                        </datalist>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Phòng ban <span className="text-brand-red">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          list="system-depts-list"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          placeholder="Chọn hoặc nhập phòng ban..."
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-[2px] font-medium focus:outline-none focus:ring-1 focus:ring-brand-blue"
                        />
                        <datalist id="system-depts-list">
                          {systemDepts.map(d => (
                            <option key={d.id} value={d.name}>{d.code} - {d.name}</option>
                          ))}
                        </datalist>
                      </div>
                    </div>
                  </div>

                  {/* 1.1 Vị Trí & Phòng Ban Kiêm Nhiệm */}
                  <div className="p-3.5 bg-amber-50/60 border border-amber-200/90 rounded-[3px] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                        <Briefcase className="h-3.5 w-3.5 text-amber-600" />
                        <span>Vị Trí & Phòng Ban Kiêm Nhiệm (Tùy chọn)</span>
                        {secondaryPositions.length > 0 && (
                          <span className="text-[10px] bg-amber-200/80 text-amber-900 font-bold px-1.5 py-0.2 rounded-full">
                            {secondaryPositions.length}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={addSecondaryPosition}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300/80 px-2 py-0.5 rounded-[2px] cursor-pointer transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Thêm vị trí kiêm nhiệm</span>
                      </button>
                    </div>

                    {secondaryPositions.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic">
                        Nhân sự này hiện chưa kiêm nhiệm chức vụ nào khác. Nhấn <strong>"Thêm vị trí kiêm nhiệm"</strong> để phân công nhân sự nắm giữ thêm chức vụ ở phòng ban thứ 2.
                      </p>
                    ) : (
                      <div className="space-y-2 pt-1">
                        {secondaryPositions.map((pos, pIdx) => (
                          <div key={pIdx} className="p-2.5 bg-white border border-amber-200 rounded-[3px] grid grid-cols-1 sm:grid-cols-12 gap-2 items-center shadow-2xs">
                            <div className="sm:col-span-4">
                              <label className="block text-[10.5px] font-bold text-slate-600 mb-0.5">Chức vụ kiêm nhiệm</label>
                              <input
                                type="text"
                                list="system-job-titles-list"
                                value={pos.roleTitle}
                                onChange={(e) => updateSecondaryPosition(pIdx, 'roleTitle', e.target.value)}
                                placeholder="VD: Trưởng phòng Cung ứng"
                                className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-[2px] font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            </div>

                            <div className="sm:col-span-4">
                              <label className="block text-[10.5px] font-bold text-slate-600 mb-0.5">Phòng ban kiêm nhiệm</label>
                              <input
                                type="text"
                                list="system-depts-list"
                                value={pos.department}
                                onChange={(e) => updateSecondaryPosition(pIdx, 'department', e.target.value)}
                                placeholder="VD: Phòng Cung ứng & Vật tư"
                                className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-[2px] font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            </div>

                            <div className="sm:col-span-3">
                              <label className="block text-[10.5px] font-bold text-slate-600 mb-0.5">Thẩm quyền ký duyệt</label>
                              <select
                                value={pos.role}
                                onChange={(e) => updateSecondaryPosition(pIdx, 'role', e.target.value as UserRole)}
                                className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded-[2px] font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                              >
                                <option value="STAFF">Chuyên viên</option>
                                <option value="DEPT_HEAD">Trưởng phòng</option>
                                <option value="BOARD_HEAD">Trưởng ban</option>
                                <option value="CHIEF_ACCOUNTANT">Kế toán trưởng</option>
                                <option value="LEGAL_DEPT">Pháp chế</option>
                                <option value="DIRECTOR">Ban Giám đốc</option>
                              </select>
                            </div>

                            <div className="sm:col-span-1 flex justify-center pt-2 sm:pt-4">
                              <button
                                type="button"
                                onClick={() => removeSecondaryPosition(pIdx)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                title="Xóa vị trí kiêm nhiệm này"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 2. Ma Trận Phân Quyền Chi Tiết */}
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-brand-blue" />
                        <span>Danh Sách Quyền Hạn</span>
                        <span className="ml-1 text-[10.5px] font-mono text-brand-blue font-bold px-1.5 py-0.2 bg-blue-50 border border-brand-blue/30 rounded">
                          {selectedPermissions.length} / {ALL_PERMISSIONS.length} quyền
                        </span>
                      </div>

                      {/* Actions Select/Clear */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsQuickSavePresetOpen(prev => !prev)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 border ${isQuickSavePresetOpen
                              ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                              : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200'
                            }`}
                          title="Lưu bộ quyền đang tick chọn trên form thành một mẫu mới"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                          <span>Lưu thành mẫu mới</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsPresetModalOpen(true)}
                          className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 rounded text-[11px] font-semibold cursor-pointer active:scale-95 flex items-center gap-1"
                          title="Mở giao diện quản lý cấu hình các mẫu quyền"
                        >
                          <Sliders className="h-3.5 w-3.5 text-slate-600" />
                          <span>Cài đặt mẫu</span>
                        </button>

                        <button
                          type="button"
                          onClick={selectAllPermissions}
                          className="px-2 py-1 bg-blue-50 text-brand-blue hover:bg-blue-100 border border-brand-blue/30 rounded text-[11px] font-semibold cursor-pointer active:scale-95"
                        >
                          Chọn tất cả
                        </button>
                        <button
                          type="button"
                          onClick={clearAllPermissions}
                          className="px-2 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300 rounded text-[11px] font-semibold cursor-pointer active:scale-95"
                        >
                          Bỏ tất cả
                        </button>
                      </div>
                    </div>

                    {/* Quick Save Preset Popover */}
                    {isQuickSavePresetOpen && (
                      <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-[3px] space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-amber-900">
                            <Sparkles className="h-4 w-4 text-amber-600" />
                            <span>Lưu {selectedPermissions.length} quyền đang tick chọn thành Mẫu quyền mới</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setIsQuickSavePresetOpen(false); setQuickSaveMsg(null); }}
                            className="text-amber-700 hover:text-amber-900 p-0.5 cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={quickPresetName}
                            onChange={(e) => setQuickPresetName(e.target.value)}
                            placeholder="Nhập tên mẫu (VD: Kế toán thanh toán, Thủ kho vật tư...)"
                            className="flex-1 min-w-[240px] px-2.5 py-1.5 bg-white border border-amber-300 rounded-[2px] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleQuickSavePreset(e);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleQuickSavePreset}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-[2px] text-xs cursor-pointer shadow-2xs active:scale-95"
                          >
                            Lưu mẫu
                          </button>
                          <button
                            type="button"
                            onClick={() => { setIsQuickSavePresetOpen(false); setQuickSaveMsg(null); }}
                            className="px-2.5 py-1.5 bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 rounded-[2px] text-xs cursor-pointer"
                          >
                            Hủy
                          </button>
                        </div>
                        {quickSaveMsg && (
                          <div className={`text-[11px] font-semibold ${quickSaveMsg.type === 'success' ? 'text-emerald-700' : 'text-brand-red'}`}>
                            {quickSaveMsg.text}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Dynamic Role Presets Toolbar */}
                    <div className="p-2 bg-slate-100 border border-slate-200 rounded-[3px] flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-600 mr-1 flex items-center gap-1">
                        <span>Mẫu nhanh:</span>
                      </span>

                      {permissionPresets.map((preset) => {
                        const isPresetActive = activePresetId === preset.id;
                        const isCustom = !preset.isSystem;

                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => applyPreset(preset)}
                            title={`${preset.name}: ${(preset.permissions || []).length} quyền (${preset.description || preset.role})`}
                            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all cursor-pointer active:scale-95 flex items-center gap-1 ${isPresetActive
                                ? preset.role === 'ADMIN'
                                  ? 'bg-brand-red text-white shadow-2xs font-bold ring-1 ring-red-400'
                                  : 'bg-brand-blue text-white shadow-2xs font-bold ring-1 ring-blue-400'
                                : isCustom
                                  ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300/80 font-semibold'
                                  : preset.role === 'ADMIN'
                                    ? 'bg-white text-brand-red hover:bg-red-50 border border-brand-red/30'
                                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                              }`}
                          >
                            {isCustom && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                            <span>{preset.name}</span>
                            <span className={`text-[9.5px] font-mono ${isPresetActive ? 'text-white/80' : 'text-slate-400'}`}>
                              ({(preset.permissions || []).length})
                            </span>
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => setIsPresetModalOpen(true)}
                        className="px-2 py-1 rounded text-[11px] font-semibold text-brand-blue hover:text-blue-800 hover:bg-blue-50 border border-dashed border-brand-blue/40 flex items-center gap-1 cursor-pointer ml-auto"
                        title="Thêm hoặc cấu hình tick chọn quyền cho từng mẫu"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Tùy chỉnh mẫu</span>
                      </button>
                    </div>

                    {/* Modules Checklist */}
                    <div className="space-y-2.5 pt-1">
                      {PERMISSION_CATEGORIES.map((cat) => {
                        const catPerms = ALL_PERMISSIONS.filter(p => p.category === cat.id);
                        const selectedCatCount = catPerms.filter(p => selectedPermissions.includes(p.id)).length;
                        const isAllCatSelected = selectedCatCount === catPerms.length;

                        return (
                          <div key={cat.id} className="border border-slate-200 rounded-[3px] overflow-hidden bg-white">
                            {/* Group Header */}
                            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                {getCategoryIcon(cat.iconName)}
                                <span className="font-bold text-xs text-slate-800">{cat.name}</span>
                                <span className="text-[10px] font-mono font-bold text-slate-500">
                                  ({selectedCatCount}/{catPerms.length})
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleCategoryPermissions(cat.id)}
                                className="text-[10.5px] font-medium text-brand-blue hover:underline cursor-pointer"
                              >
                                {isAllCatSelected ? 'Bỏ chọn nhóm' : 'Chọn nhóm'}
                              </button>
                            </div>

                            {/* Permission Items */}
                            <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {catPerms.map((perm) => {
                                const isChecked = selectedPermissions.includes(perm.id);

                                return (
                                  <label
                                    key={perm.id}
                                    className={`flex items-center justify-between p-2 rounded-[2px] border transition-all cursor-pointer select-none ${isChecked
                                        ? 'bg-blue-50/70 border-brand-blue/50 text-brand-blue font-semibold'
                                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                      }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => togglePermission(perm.id)}
                                        className="h-3.5 w-3.5 rounded-[2px] text-brand-blue focus:ring-brand-blue border-slate-300 cursor-pointer"
                                      />
                                      <span className="text-xs">
                                        {perm.name}
                                      </span>
                                    </div>
                                    <span className="text-[9px] font-mono text-slate-400">
                                      {perm.code}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Permanent Modal Footer */}
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                  <div className="text-[11px] text-slate-600 font-medium">
                    Đã chọn: <span className="font-bold text-brand-blue font-mono">{selectedPermissions.length}</span> / {ALL_PERMISSIONS.length} quyền
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-3 py-1.5 bg-white text-slate-600 border border-slate-300 rounded-[2px] font-semibold text-[11px] hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer active:scale-95"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-brand-blue hover:bg-brand-blue-dark active:scale-[0.98] text-white font-bold text-[11px] tracking-wide rounded-[2px] shadow-xs hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>{editingUser ? 'Lưu Cập Nhật' : 'Tạo Người Dùng'}</span>
                    </button>
                  </div>
                </div>

              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>
      </SafePortal>

      {/* PERMISSION PRESETS CONFIG MODAL */}
      <PermissionPresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        onSelectPreset={applyPreset}
        initialPresetId={activePresetId}
      />

    </div>
  );
};
