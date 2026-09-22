import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { 
  ShieldCheck, 
  Plus, 
  Search, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  RotateCcw, 
  Check, 
  FileText, 
  CheckSquare, 
  GitFork, 
  Archive, 
  Users, 
  BarChart3,
  Sliders,
  Sparkles
} from 'lucide-react';
import { useDocument } from '../../context/DocumentContext';
import { PermissionPreset, PermissionId, UserRole } from '../../types';
import { ALL_PERMISSIONS, PERMISSION_CATEGORIES } from '../../lib/permissions';

// Safe Portal helper for reliable rendering
const SafePortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

interface PermissionPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset?: (preset: PermissionPreset) => void;
  initialPresetId?: string;
}

export const PermissionPresetModal: React.FC<PermissionPresetModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
  initialPresetId
}) => {
  const { 
    permissionPresets, 
    createPermissionPreset, 
    updatePermissionPreset, 
    deletePermissionPreset, 
    resetPermissionPresetsToDefault 
  } = useDocument();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  
  // Form editing state
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('STAFF');
  const [roleTitle, setRoleTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionId[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Set initial selected preset when opening
  useEffect(() => {
    if (isOpen && permissionPresets.length > 0) {
      const targetId = initialPresetId || selectedPresetId || permissionPresets[0]?.id;
      const found = permissionPresets.find(p => p.id === targetId) || permissionPresets[0];
      if (found && !isCreatingNew) {
        selectPreset(found);
      }
    }
  }, [isOpen, permissionPresets, initialPresetId]);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const selectPreset = (preset: PermissionPreset) => {
    setIsCreatingNew(false);
    setSelectedPresetId(preset.id);
    setName(preset.name);
    setRole(preset.role);
    setRoleTitle(preset.roleTitle || preset.name);
    setDescription(preset.description || '');
    setSelectedPermissions(preset.permissions ? [...preset.permissions] : []);
    setMessage(null);
  };

  const startCreateNew = () => {
    setIsCreatingNew(true);
    setSelectedPresetId('');
    setName('');
    setRole('STAFF');
    setRoleTitle('');
    setDescription('');
    // Default with staff basic permissions
    const staffPreset = permissionPresets.find(p => p.role === 'STAFF');
    setSelectedPermissions(staffPreset?.permissions ? [...staffPreset.permissions] : ['doc.view', 'doc.create']);
    setMessage(null);
  };

  const filteredPresets = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return permissionPresets;
    return permissionPresets.filter(p => 
      p.name.toLowerCase().includes(term) || 
      (p.roleTitle && p.roleTitle.toLowerCase().includes(term)) ||
      (p.description && p.description.toLowerCase().includes(term))
    );
  }, [permissionPresets, searchTerm]);

  const activePreset = useMemo(() => {
    if (isCreatingNew) return null;
    return permissionPresets.find(p => p.id === selectedPresetId) || null;
  }, [isCreatingNew, permissionPresets, selectedPresetId]);

  // Permission selection helpers
  const togglePermission = (permId: PermissionId) => {
    setSelectedPermissions(prev => 
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    );
  };

  const selectAll = () => {
    setSelectedPermissions(ALL_PERMISSIONS.map(p => p.id));
  };

  const clearAll = () => {
    setSelectedPermissions([]);
  };

  const toggleCategory = (catId: string) => {
    const catPerms = ALL_PERMISSIONS.filter(p => p.category === catId).map(p => p.id);
    const hasAll = catPerms.every(id => selectedPermissions.includes(id));
    if (hasAll) {
      setSelectedPermissions(prev => prev.filter(id => !catPerms.includes(id)));
    } else {
      setSelectedPermissions(prev => Array.from(new Set([...prev, ...catPerms])));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      showNotification('error', 'Vui lòng nhập tên mẫu phân quyền.');
      return;
    }

    if (isCreatingNew) {
      const res = createPermissionPreset({
        name: trimmedName,
        role,
        roleTitle: roleTitle.trim() || trimmedName,
        permissions: selectedPermissions,
        description: description.trim()
      });

      if (res.success && res.preset) {
        showNotification('success', `Đã tạo mới mẫu "${trimmedName}" thành công!`);
        setIsCreatingNew(false);
        setSelectedPresetId(res.preset.id);
      } else {
        showNotification('error', res.message || 'Không thể tạo mẫu.');
      }
    } else if (activePreset) {
      const res = updatePermissionPreset(activePreset.id, {
        name: trimmedName,
        role,
        roleTitle: roleTitle.trim() || trimmedName,
        permissions: selectedPermissions,
        description: description.trim()
      });

      if (res.success) {
        showNotification('success', `Đã cập nhật mẫu "${trimmedName}" thành công!`);
      } else {
        showNotification('error', res.message || 'Không thể cập nhật mẫu.');
      }
    }
  };

  const handleDelete = () => {
    if (!activePreset) return;
    if (activePreset.isSystem) {
      showNotification('error', 'Không thể xóa mẫu mặc định hệ thống.');
      return;
    }
    if (confirm(`Bạn có chắc chắn muốn xóa mẫu phân quyền "${activePreset.name}" không?`)) {
      const res = deletePermissionPreset(activePreset.id);
      if (res.success) {
        showNotification('success', `Đã xóa mẫu "${activePreset.name}".`);
        const remaining = permissionPresets.filter(p => p.id !== activePreset.id);
        if (remaining.length > 0) {
          selectPreset(remaining[0]);
        } else {
          startCreateNew();
        }
      } else {
        showNotification('error', res.message || 'Không thể xóa mẫu.');
      }
    }
  };

  const handleApplyPresetToForm = () => {
    if (activePreset && onSelectPreset) {
      onSelectPreset({
        ...activePreset,
        name,
        role,
        roleTitle,
        permissions: selectedPermissions,
        description
      });
      onClose();
    }
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'FileText': return <FileText className="h-4 w-4 text-brand-blue" />;
      case 'CheckSquare': return <CheckSquare className="h-4 w-4 text-emerald-600" />;
      case 'GitFork': return <GitFork className="h-4 w-4 text-purple-600" />;
      case 'Archive': return <Archive className="h-4 w-4 text-amber-600" />;
      case 'Users': return <Users className="h-4 w-4 text-indigo-600" />;
      case 'BarChart3': return <BarChart3 className="h-4 w-4 text-rose-600" />;
      default: return <ShieldCheck className="h-4 w-4 text-slate-600" />;
    }
  };

  if (!isOpen) return null;

  return (
    <SafePortal>
      <AnimatePresence>
        <motion.div 
          key="preset-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[999999] bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div 
            key="preset-modal-content"
            initial={{ scale: 0.94, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[92vh] my-auto"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-brand-navy to-slate-900 text-white flex items-center justify-between shrink-0 shadow-xs border-b border-navy-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl text-amber-300">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base leading-tight">
                    Cấu Hình & Quản Lý Mẫu Phân Quyền (Permission Presets)
                  </h3>
                  <p className="text-[11px] text-blue-100 mt-0.5">
                    Thiết lập danh sách quyền hạn cho từng mẫu để chọn nhanh chính xác khi thêm người dùng mới
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={onClose}
                className="text-white/80 hover:text-white p-1.5 transition-colors cursor-pointer rounded-full hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Notification Bar */}
            {message && (
              <div className={`px-4 py-2.5 text-xs flex items-center gap-2 border-b shrink-0 ${
                message.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-red-50 text-brand-red border-red-200'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-brand-red" />
                )}
                <span className="font-medium">{message.text}</span>
              </div>
            )}

            {/* Modal Body: 2 Columns */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0 bg-slate-50/50">
              
              {/* LEFT COLUMN: Preset List (md:col-span-4) */}
              <div className="md:col-span-4 border-r border-slate-200/80 bg-slate-50/60 flex flex-col min-h-0 overflow-hidden">
                {/* Search & Add button */}
                <div className="p-3.5 border-b border-slate-200/80 bg-white space-y-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={startCreateNew}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-xs ${
                      isCreatingNew 
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-glow-emerald' 
                        : 'bg-gradient-to-r from-brand-blue to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-glow-blue'
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                    <span>+ Thêm mẫu quyền mới</span>
                  </button>

                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Tìm kiếm mẫu quyền..."
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-100/80 hover:bg-slate-200/60 focus:bg-white border border-slate-200 rounded-xl text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                    />
                  </div>
                </div>

                {/* Presets List */}
                <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                  {filteredPresets.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 italic">
                      Không tìm thấy mẫu phù hợp
                    </div>
                  ) : (
                    filteredPresets.map((preset) => {
                      const isSelected = !isCreatingNew && selectedPresetId === preset.id;
                      const permCount = (preset.permissions || []).length;

                      return (
                        <div
                          key={preset.id}
                          onClick={() => selectPreset(preset)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer select-none text-left relative ${
                            isSelected 
                              ? 'bg-white border-brand-blue shadow-glow-blue ring-2 ring-brand-blue/20' 
                              : 'bg-white hover:bg-slate-100/80 border-slate-200/80 text-slate-700 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`font-bold text-xs truncate ${isSelected ? 'text-brand-blue' : 'text-slate-800'}`}>
                                {preset.name}
                              </span>
                              {preset.isSystem ? (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-[9.5px] font-medium shrink-0">
                                  Hệ thống
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[9.5px] font-bold shrink-0">
                                  Tùy chọn
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono font-bold text-slate-500 shrink-0 bg-slate-100 px-2 py-0.5 rounded-full">
                              {permCount}/{ALL_PERMISSIONS.length}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span className="truncate text-slate-600 font-medium">
                              {preset.roleTitle || preset.role}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] font-semibold text-brand-blue flex items-center gap-0.5 shrink-0 bg-blue-50 px-2 py-0.5 rounded-full">
                                <Check className="h-3 w-3" /> Đang chọn
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Preset List Footer: Reset System Presets */}
                <div className="p-3 border-t border-slate-200/80 bg-white flex justify-between items-center text-[11px] text-slate-500 shrink-0">
                  <span>Tổng số: <strong>{permissionPresets.length}</strong> mẫu</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Khôi phục 6 mẫu mặc định của hệ thống về thiết lập gốc?')) {
                        resetPermissionPresetsToDefault();
                        showNotification('success', 'Đã khôi phục các mẫu hệ thống về mặc định.');
                      }
                    }}
                    className="text-slate-600 hover:text-brand-blue flex items-center gap-1 cursor-pointer hover:underline font-medium"
                    title="Khôi phục lại các quyền chuẩn ban đầu cho 6 vai trò hệ thống"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Mặc định</span>
                  </button>
                </div>
              </div>

              {/* RIGHT COLUMN: Preset Details & Permission Matrix (md:col-span-8) */}
              <div className="md:col-span-8 flex flex-col min-h-0 bg-white overflow-hidden">
                <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0">
                  
                  {/* Preset Basic Info Header */}
                  <div className="p-4 border-b border-slate-200/80 bg-slate-50/70 shrink-0 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        <h4 className="font-bold text-xs text-slate-800">
                          {isCreatingNew ? 'Thêm Mẫu Phân Quyền Mới' : `Cấu hình Mẫu: ${activePreset?.name || ''}`}
                        </h4>
                      </div>
                      {activePreset && !isCreatingNew && onSelectPreset && (
                        <button
                          type="button"
                          onClick={handleApplyPresetToForm}
                          className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-all shadow-glow-emerald active:scale-98"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Áp dụng mẫu này vào người dùng</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Tên mẫu phân quyền <span className="text-brand-red">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="VD: Kế toán viên, Thủ kho..."
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Thẩm quyền ký duyệt liên quan <span className="text-brand-red">*</span>
                        </label>
                        <select
                          value={role}
                          onChange={(e) => setRole(e.target.value as UserRole)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/30 cursor-pointer"
                        >
                          <option value="STAFF">Chuyên viên (Lập hồ sơ)</option>
                          <option value="DEPT_HEAD">Trưởng phòng (Duyệt cấp phòng)</option>
                          <option value="BOARD_HEAD">Trưởng ban (Duyệt cấp Ban)</option>
                          <option value="CHIEF_ACCOUNTANT">Kế toán trưởng (Thẩm định tài chính)</option>
                          <option value="LEGAL_DEPT">Pháp chế (Kiểm soát pháp lý)</option>
                          <option value="DIRECTOR">Ban Giám đốc (Duyệt tối cao)</option>
                          <option value="ADMIN">Quản trị viên (Toàn quyền hệ thống)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Chức vụ gợi ý
                        </label>
                        <input
                          type="text"
                          value={roleTitle}
                          onChange={(e) => setRoleTitle(e.target.value)}
                          placeholder="VD: Nhân viên mua hàng"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Mô tả / Ghi chú mục đích sử dụng mẫu
                      </label>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="VD: Dành cho nhân sự phụ trách lập phiếu đề xuất vật tư và theo dõi kho"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-slate-600"
                      />
                    </div>
                  </div>

                  {/* Permissions Selection Toolbar */}
                  <div className="px-4 py-2.5 bg-slate-100/80 border-b border-slate-200/80 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-brand-blue" />
                      <span className="font-bold text-xs text-slate-800">
                        Tick chọn phân quyền chi tiết cho mẫu
                      </span>
                      <span className="px-2.5 py-0.5 bg-blue-50 text-brand-blue border border-brand-blue/30 rounded-full font-mono font-bold text-[10.5px]">
                        {selectedPermissions.length} / {ALL_PERMISSIONS.length} quyền được cấp
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={selectAll}
                        className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-brand-blue border border-brand-blue/30 rounded-lg text-[11px] font-semibold cursor-pointer active:scale-95 transition-all"
                      >
                        Chọn tất cả
                      </button>
                      <button
                        type="button"
                        onClick={clearAll}
                        className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 rounded-lg text-[11px] font-semibold cursor-pointer active:scale-95 transition-all"
                      >
                        Bỏ tất cả
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Permission Matrix */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs bg-slate-50/30">
                    {PERMISSION_CATEGORIES.map((cat) => {
                      const catPerms = ALL_PERMISSIONS.filter(p => p.category === cat.id);
                      const selectedCount = catPerms.filter(p => selectedPermissions.includes(p.id)).length;
                      const isAllSelected = selectedCount === catPerms.length;

                      return (
                        <div key={cat.id} className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
                          {/* Group Header */}
                          <div className="px-3.5 py-2 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(cat.iconName)}
                              <span className="font-bold text-xs text-slate-800">{cat.name}</span>
                              <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                ({selectedCount}/{catPerms.length})
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleCategory(cat.id)}
                              className="text-[10.5px] font-semibold text-brand-blue hover:underline cursor-pointer"
                            >
                              {isAllSelected ? 'Bỏ chọn nhóm' : 'Chọn nhóm'}
                            </button>
                          </div>

                          {/* Items Grid */}
                          <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {catPerms.map((perm) => {
                              const isChecked = selectedPermissions.includes(perm.id);

                              return (
                                <label
                                  key={perm.id}
                                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                                    isChecked 
                                      ? 'bg-blue-50/70 border-brand-blue/50 text-brand-blue font-semibold shadow-2xs' 
                                      : 'bg-white border-slate-200/80 hover:bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => togglePermission(perm.id)}
                                      className="h-4 w-4 rounded text-brand-blue focus:ring-brand-blue border-slate-300 cursor-pointer"
                                    />
                                    <div className="min-w-0">
                                      <span className="text-xs block leading-tight">
                                        {perm.name}
                                      </span>
                                      <span className="text-[9.5px] text-slate-400 block truncate font-normal mt-0.5">
                                        {perm.description}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-[9px] font-mono text-slate-400 shrink-0 bg-slate-100 px-1.5 py-0.5 rounded">
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

                  {/* Footer Actions */}
                  <div className="p-3.5 border-t border-slate-200/80 bg-white flex items-center justify-between shrink-0">
                    <div>
                      {activePreset && !activePreset.isSystem && !isCreatingNew && (
                        <button
                          type="button"
                          onClick={handleDelete}
                          className="px-3 py-1.5 text-xs font-semibold text-brand-red hover:bg-red-50 border border-brand-red/30 rounded-xl transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Xóa mẫu này</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                      >
                        Đóng
                      </button>

                      <button
                        type="submit"
                        className="px-4 py-2 bg-gradient-to-r from-brand-blue to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-glow-blue active:scale-98 flex items-center gap-1.5"
                      >
                        <ShieldCheck className="h-4 w-4 text-amber-300" />
                        <span>{isCreatingNew ? '💾 Lưu mẫu mới' : '💾 Lưu cấu hình mẫu'}</span>
                      </button>
                    </div>
                  </div>

                </form>
              </div>

            </div>

          </motion.div>
        </motion.div>
      </AnimatePresence>
    </SafePortal>
  );
};
