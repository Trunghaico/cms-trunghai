import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Briefcase, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Users, 
  Sliders,
  HardDrive,
  Database,
  RefreshCw,
  UploadCloud,
  CheckCircle,
  Wifi,
  WifiOff,
  Clock,
  DownloadCloud,
  Server,
  Zap,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { useDocument } from '../../context/DocumentContext';
import { DepartmentItem, JobTitleItem, PermissionPreset } from '../../types';
import { PermissionPresetModal } from '../users/PermissionPresetModal';
import { ALL_PERMISSIONS, PERMISSION_CATEGORIES } from '../../lib/permissions';
import { NASBackupItem, MINIO_ENDPOINT, MINIO_BUCKET, MINIO_ACCESS_KEY, uploadFileToNAS } from '../../lib/nasStorageService';

// Helper chuyển đổi và định dạng giờ SLA sang ngày chính xác (1 ngày = 24 giờ)
const formatSlaBadge = (hours: number): string => {
  if (!hours || hours <= 0) return '0h';
  if (hours < 24) {
    if (hours === 12) return '12h (0.5d)';
    return `${hours}h`;
  }
  const days = hours / 24;
  return `${hours}h (${Number.isInteger(days) ? days : days.toFixed(1)}d)`;
};

const formatSlaPresetLabel = (h: number): string => {
  if (h < 24) {
    if (h === 12) return '12h (0.5d)';
    return `${h}h`;
  }
  const days = h / 24;
  return `${h}h (${Number.isInteger(days) ? days : days.toFixed(1)}d)`;
};

const formatSlaHelpText = (hours: number): string => {
  if (!hours || hours <= 0) return 'Giờ';
  if (hours < 24) {
    if (hours === 12) return 'Giờ (= 0.5 ngày / nửa ngày)';
    const d = (hours / 24).toFixed(1);
    return `Giờ (${hours} tiếng ~ ${d} ngày)`;
  }
  const days = hours / 24;
  return `Giờ (= ${Number.isInteger(days) ? days : days.toFixed(1)} ngày)`;
};

export const SystemSettingsView: React.FC = () => {
  const { 
    activeUser,
    departments, 
    jobTitles, 
    permissionPresets,
    users, 
    documents,
    createDepartment, 
    updateDepartment, 
    deleteDepartment, 
    createJobTitle, 
    updateJobTitle, 
    deleteJobTitle,
    syncToNAS,
    syncFromNAS,
    testNAS,
    listBackups,
    isNASSyncing,
    lastNASSyncTime,
    nasSyncStatus,
    autoBackupConfig,
    autoBackupCountdown,
    updateAutoBackupConfig
  } = useDocument();

  const [activeSubTab, setActiveSubTab] = useState<'departments' | 'job-titles' | 'permission-presets' | 'nas-storage'>('departments');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Tự động chuyển về tab Phòng Ban nếu không phải Quản trị viên
  useEffect(() => {
    if (activeSubTab === 'nas-storage' && activeUser?.role !== 'ADMIN') {
      setActiveSubTab('departments');
    }
  }, [activeSubTab, activeUser]);

  // Permission Preset Modal State
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [selectedPresetIdForModal, setSelectedPresetIdForModal] = useState<string>('');
  
  // NAS Storage Tab State
  const [isTestingNAS, setIsTestingNAS] = useState(false);
  const [nasTestResult, setNasTestResult] = useState<{ success: boolean; message: string; latencyMs?: number; bucket?: string } | null>(null);
  const [backups, setBackups] = useState<NASBackupItem[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [testUploadMsg, setTestUploadMsg] = useState<{ url: string; size: number } | null>(null);
  const [isUploadingTest, setIsUploadingTest] = useState(false);
  
  // Department Modal State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptSlaHours, setDeptSlaHours] = useState<number>(8);

  // Job Title Modal State
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobTitleItem | null>(null);
  const [jobName, setJobName] = useState('');
  const [jobCode, setJobCode] = useState('');
  const [jobDepartment, setJobDepartment] = useState('');

  // Status message
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => {
      setMessage(null);
    }, 4000);
  };

  // Filtered Lists
  const filteredDepartments = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return departments;
    return departments.filter(d => 
      d.name.toLowerCase().includes(term) || 
      d.code.toLowerCase().includes(term)
    );
  }, [departments, searchTerm]);

  const filteredJobTitles = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return jobTitles;
    return jobTitles.filter(j => 
      j.name.toLowerCase().includes(term) || 
      j.code.toLowerCase().includes(term) ||
      (j.department && j.department.toLowerCase().includes(term))
    );
  }, [jobTitles, searchTerm]);

  const filteredPermissionPresets = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return permissionPresets;
    return permissionPresets.filter(p => 
      p.name.toLowerCase().includes(term) || 
      (p.roleTitle && p.roleTitle.toLowerCase().includes(term)) ||
      (p.description && p.description.toLowerCase().includes(term))
    );
  }, [permissionPresets, searchTerm]);

  // Department Modal Handlers
  const handleOpenCreateDept = () => {
    setEditingDept(null);
    setDeptName('');
    setDeptCode('');
    setDeptSlaHours(8);
    setIsDeptModalOpen(true);
  };

  const handleOpenEditDept = (dept: DepartmentItem) => {
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptCode(dept.code);
    setDeptSlaHours(dept.defaultSlaHours || 8);
    setIsDeptModalOpen(true);
  };

  const handleSaveDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !deptCode.trim()) {
      showNotification('error', 'Vui lòng điền đầy đủ tên và mã phòng ban.');
      return;
    }

    if (editingDept) {
      const res = updateDepartment(editingDept.id, {
        name: deptName.trim(),
        code: deptCode.trim().toUpperCase(),
        defaultSlaHours: Number(deptSlaHours) || 8,
      });
      if (res.success) {
        showNotification('success', `Đã cập nhật phòng ban "${deptName.trim()}" thành công!`);
        setIsDeptModalOpen(false);
      } else {
        showNotification('error', res.message || 'Cập nhật thất bại.');
      }
    } else {
      const res = createDepartment({
        name: deptName.trim(),
        code: deptCode.trim().toUpperCase(),
        defaultSlaHours: Number(deptSlaHours) || 8,
      });
      if (res.success) {
        showNotification('success', `Đã tạo mới phòng ban "${deptName.trim()}" thành công!`);
        setIsDeptModalOpen(false);
      } else {
        showNotification('error', res.message || 'Tạo mới thất bại.');
      }
    }
  };

  const handleDeleteDept = (dept: DepartmentItem) => {
    const userCount = users.filter(u => u.department.toLowerCase() === dept.name.toLowerCase()).length;
    if (userCount > 0) {
      showNotification('error', `Không thể xóa phòng ban "${dept.name}" vì đang có ${userCount} nhân sự trực thuộc!`);
      return;
    }

    if (window.confirm(`Bạn có chắc chắn muốn xóa phòng ban "${dept.name}" (${dept.code})?`)) {
      const res = deleteDepartment(dept.id);
      if (res.success) {
        showNotification('success', `Đã xóa phòng ban "${dept.name}" thành công.`);
      } else {
        showNotification('error', res.message || 'Xóa thất bại.');
      }
    }
  };

  // Job Title Modal Handlers
  const handleOpenCreateJob = () => {
    setEditingJob(null);
    setJobName('');
    setJobCode('');
    setJobDepartment(departments[0]?.name || 'Phòng Kỹ thuật & Dự án');
    setIsJobModalOpen(true);
  };

  const handleOpenEditJob = (job: JobTitleItem) => {
    setEditingJob(job);
    setJobName(job.name);
    setJobCode(job.code);
    setJobDepartment(job.department || departments[0]?.name || '');
    setIsJobModalOpen(true);
  };

  const handleSaveJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobName.trim() || !jobCode.trim() || !jobDepartment.trim()) {
      showNotification('error', 'Vui lòng điền đầy đủ tên chức vụ, mã chức vụ và chọn phòng ban trực thuộc.');
      return;
    }

    if (editingJob) {
      const res = updateJobTitle(editingJob.id, {
        name: jobName.trim(),
        code: jobCode.trim().toUpperCase(),
        department: jobDepartment.trim()
      });
      if (res.success) {
        showNotification('success', `Đã cập nhật chức vụ "${jobName.trim()}" thành công!`);
        setIsJobModalOpen(false);
      } else {
        showNotification('error', res.message || 'Cập nhật thất bại.');
      }
    } else {
      const res = createJobTitle({
        name: jobName.trim(),
        code: jobCode.trim().toUpperCase(),
        department: jobDepartment.trim()
      });
      if (res.success) {
        showNotification('success', `Đã tạo mới chức vụ "${jobName.trim()}" thành công!`);
        setIsJobModalOpen(false);
      } else {
        showNotification('error', res.message || 'Tạo mới thất bại.');
      }
    }
  };

  const handleDeleteJob = (job: JobTitleItem) => {
    const userCount = users.filter(u => u.roleTitle.toLowerCase() === job.name.toLowerCase()).length;
    if (userCount > 0) {
      showNotification('error', `Không thể xóa chức vụ "${job.name}" vì đang có ${userCount} nhân sự nắm giữ!`);
      return;
    }

    if (window.confirm(`Bạn có chắc chắn muốn xóa chức vụ "${job.name}" (${job.code})?`)) {
      const res = deleteJobTitle(job.id);
      if (res.success) {
        showNotification('success', `Đã xóa chức vụ "${job.name}" thành công.`);
      } else {
        showNotification('error', res.message || 'Xóa thất bại.');
      }
    }
  };

  // Load backups when switching to nas-storage tab
  useEffect(() => {
    if (activeSubTab === 'nas-storage') {
      handleLoadBackups();
    }
  }, [activeSubTab]);

  const handleTestNAS = async () => {
    setIsTestingNAS(true);
    setNasTestResult(null);
    try {
      const res = await testNAS();
      setNasTestResult(res);
      if (res.success) {
        showNotification('success', res.message);
      } else {
        showNotification('error', res.message);
      }
    } catch (e: any) {
      setNasTestResult({ success: false, message: e.message || 'Lỗi kiểm tra' });
      showNotification('error', e.message || 'Lỗi kiểm tra');
    } finally {
      setIsTestingNAS(false);
    }
  };

  const handleLoadBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const list = await listBackups();
      setBackups(list);
    } catch (e) {
      console.error('Lỗi tải danh sách backup NAS:', e);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleSyncToNAS = async () => {
    const res = await syncToNAS();
    if (res.success) {
      showNotification('success', res.message || 'Sao lưu database lên NAS thành công!');
      handleLoadBackups();
    } else {
      showNotification('error', res.message || 'Lỗi sao lưu lên NAS.');
    }
  };

  const handleRestoreFromNAS = async (backupKey?: string) => {
    const confirmMsg = backupKey 
      ? `Bạn có chắc muốn khôi phục dữ liệu từ bản sao lưu:\n${backupKey}?\n\nDữ liệu hiện tại trên ứng dụng sẽ được thay thế theo bản sao lưu này.`
      : 'Bạn có chắc muốn đồng bộ và khôi phục toàn bộ database từ bản mới nhất trên MinIO NAS?';
    if (confirm(confirmMsg)) {
      const res = await syncFromNAS(backupKey);
      if (res.success) {
        showNotification('success', res.message);
      } else {
        showNotification('error', res.message);
      }
    }
  };

  const handleTestFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploadingTest(true);
    setTestUploadMsg(null);
    try {
      const res = await uploadFileToNAS(file);
      if (res) {
        setTestUploadMsg({ url: res.url, size: res.size });
        showNotification('success', `Đã tải file "${file.name}" lên MinIO NAS thành công!`);
      } else {
        showNotification('error', 'Không thể tải file lên MinIO NAS.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Lỗi upload');
    } finally {
      setIsUploadingTest(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 right-8 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium ${
              message.type === 'success' 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                : 'bg-red-50 border-red-300 text-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{message.text}</span>
            <button 
              onClick={() => setMessage(null)}
              className="ml-2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-gradient-to-br from-brand-blue to-blue-700 text-white rounded-lg shadow-xs">
                <Sliders className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cấu hình Hệ thống</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quản lý danh mục tên các phòng ban và chức vụ trong doanh nghiệp
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => { setActiveSubTab('departments'); setSearchTerm(''); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeSubTab === 'departments'
                    ? 'bg-white text-brand-blue shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Phòng Ban ({departments.length})</span>
              </button>
              <button
                onClick={() => { setActiveSubTab('job-titles'); setSearchTerm(''); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeSubTab === 'job-titles'
                    ? 'bg-white text-brand-blue shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Chức Vụ ({jobTitles.length})</span>
              </button>
              <button
                onClick={() => { setActiveSubTab('permission-presets'); setSearchTerm(''); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeSubTab === 'permission-presets'
                    ? 'bg-white text-brand-blue shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-brand-blue" />
                <span>Mẫu Phân Quyền ({permissionPresets.length})</span>
              </button>
              {activeUser?.role === 'ADMIN' && (
                <button
                  onClick={() => { setActiveSubTab('nas-storage'); setSearchTerm(''); }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    activeSubTab === 'nas-storage'
                      ? 'bg-white text-brand-blue shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <HardDrive className="w-4 h-4 text-emerald-600" />
                  <span>Lưu Trữ NAS MinIO</span>
                </button>
              )}
            </div>

            {activeSubTab === 'departments' ? (
              <button
                onClick={handleOpenCreateDept}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-blue hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Phòng Ban</span>
              </button>
            ) : activeSubTab === 'job-titles' ? (
              <button
                onClick={handleOpenCreateJob}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-blue hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Chức Vụ</span>
              </button>
            ) : activeSubTab === 'permission-presets' ? (
              <button
                onClick={() => { setSelectedPresetIdForModal(''); setIsPresetModalOpen(true); }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-blue hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Mẫu Quyền</span>
              </button>
            ) : activeUser?.role === 'ADMIN' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestNAS}
                  disabled={isTestingNAS}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingNAS ? 'animate-spin' : ''}`} />
                  <span>{isTestingNAS ? 'Đang test...' : 'Test kết nối NAS'}</span>
                </button>
                <button
                  onClick={handleSyncToNAS}
                  disabled={isNASSyncing}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <UploadCloud className={`w-4 h-4 ${isNASSyncing ? 'animate-bounce' : ''}`} />
                  <span>{isNASSyncing ? 'Đang lưu...' : 'Sao Lưu Lên NAS'}</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Quick Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center gap-3.5 p-3.5 rounded-lg bg-blue-50/50 border border-blue-100">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">{departments.length}</div>
              <div className="text-[11px] font-medium text-slate-500">Tổng số phòng ban</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3.5 rounded-lg bg-indigo-50/50 border border-indigo-100">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-md">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">{jobTitles.length}</div>
              <div className="text-[11px] font-medium text-slate-500">Tổng chức vụ định danh</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3.5 rounded-lg bg-emerald-50/50 border border-emerald-100">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-md">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">{users.length}</div>
              <div className="text-[11px] font-medium text-slate-500">Nhân sự trong hệ thống</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3.5 rounded-lg bg-amber-50/50 border border-amber-200">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-md">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-900">MinIO NAS Online</span>
              </div>
              <div className="text-[10.5px] font-medium text-slate-500 truncate max-w-[140px]" title="crm.trunghaico.vn">
                Bucket: {MINIO_BUCKET}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                activeSubTab === 'departments' 
                  ? 'Tìm theo tên, mã phòng ban...' 
                  : activeSubTab === 'job-titles'
                    ? 'Tìm theo tên chức vụ, mã, phòng ban...'
                    : 'Tìm theo tên mẫu, chức danh, mô tả...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Hiển thị: </span>
            <span className="font-semibold text-slate-800">
              {activeSubTab === 'departments' 
                ? filteredDepartments.length 
                : activeSubTab === 'job-titles' 
                  ? filteredJobTitles.length 
                  : filteredPermissionPresets.length}
            </span>
            <span>mục</span>
          </div>
        </div>

        {/* TAB 1: DEPARTMENTS */}
        {activeSubTab === 'departments' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-16 text-center">STT</th>
                  <th className="py-3 px-4 w-36">Mã Phòng</th>
                  <th className="py-3 px-4">Tên Phòng Ban</th>
                  <th className="py-3 px-4 text-center w-36">SLA Cam Kết</th>
                  <th className="py-3 px-4 text-center w-36">Nhân sự</th>
                  <th className="py-3 px-4 text-right w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-normal">
                {filteredDepartments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                      <p className="text-sm font-medium">Không tìm thấy phòng ban nào phù hợp</p>
                      <p className="text-xs text-slate-400 mt-0.5">Vui lòng thử tìm với từ khóa khác hoặc thêm mới</p>
                    </td>
                  </tr>
                ) : (
                  filteredDepartments.map((dept, idx) => {
                    const deptUsers = users.filter(u => u.department.toLowerCase() === dept.name.toLowerCase());
                    return (
                      <tr key={dept.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-slate-400 text-center">{idx + 1}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-blue-50 text-brand-blue border border-blue-200 font-mono">
                            {dept.code}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 text-sm">{dept.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">ID: {dept.id}</div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold font-mono">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>{formatSlaBadge(dept.defaultSlaHours || 8)}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                            deptUsers.length > 0 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            <Users className="w-3.5 h-3.5" />
                            {deptUsers.length} nhân sự
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditDept(dept)}
                              className="p-1.5 text-slate-500 hover:text-brand-blue hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                              title="Chỉnh sửa phòng ban"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDept(dept)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                              title="Xóa phòng ban"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: JOB TITLES */}
        {activeSubTab === 'job-titles' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-16 text-center">STT</th>
                  <th className="py-3 px-4 w-36">Mã Chức Vụ</th>
                  <th className="py-3 px-4">Tên Chức Vụ</th>
                  <th className="py-3 px-4 w-72">Thuộc Phòng Ban</th>
                  <th className="py-3 px-4 text-center w-44">Nhân sự nắm giữ</th>
                  <th className="py-3 px-4 text-right w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-normal">
                {filteredJobTitles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Briefcase className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                      <p className="text-sm font-medium">Không tìm thấy chức vụ nào phù hợp</p>
                      <p className="text-xs text-slate-400 mt-0.5">Vui lòng thử tìm với từ khóa khác hoặc thêm mới</p>
                    </td>
                  </tr>
                ) : (
                  filteredJobTitles.map((job, idx) => {
                    const jobUsers = users.filter(u => u.roleTitle.toLowerCase() === job.name.toLowerCase());
                    return (
                      <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-slate-400 text-center">{idx + 1}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 font-mono">
                            {job.code}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 text-sm">{job.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">ID: {job.id}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            <Building2 className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                            <span className="truncate max-w-[220px]">{job.department || 'Chưa gán'}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                            jobUsers.length > 0 
                              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            <Users className="w-3.5 h-3.5" />
                            {jobUsers.length} người
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditJob(job)}
                              className="p-1.5 text-slate-500 hover:text-brand-blue hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                              title="Chỉnh sửa chức vụ"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteJob(job)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                              title="Xóa chức vụ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB: PERMISSION PRESETS */}
        {activeSubTab === 'permission-presets' && (
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPermissionPresets.map((preset) => {
                const isCustom = !preset.isSystem;
                const permCount = (preset.permissions || []).length;
                const percent = Math.round((permCount / ALL_PERMISSIONS.length) * 100);

                return (
                  <div
                    key={preset.id}
                    className="border border-slate-200 hover:border-brand-blue/50 rounded-lg p-4 bg-white hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-slate-900 group-hover:text-brand-blue transition-colors">
                              {preset.name}
                            </h3>
                            {preset.isSystem ? (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px] font-medium">
                                Hệ thống
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                                Tùy chọn
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Thẩm quyền: <strong className="text-slate-700">{preset.role}</strong>
                            {preset.roleTitle && ` • Chức danh: ${preset.roleTitle}`}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono text-xs font-bold text-brand-blue">
                            {permCount}/{ALL_PERMISSIONS.length}
                          </span>
                          <div className="text-[9.5px] text-slate-400">quyền hạn</div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${preset.role === 'ADMIN' ? 'bg-brand-red' : 'bg-brand-blue'}`}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>

                      {preset.description && (
                        <p className="text-xs text-slate-600 line-clamp-2 italic bg-slate-50 p-2 rounded border border-slate-100">
                          "{preset.description}"
                        </p>
                      )}
                    </div>

                    <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        {isCustom ? 'Mẫu tùy chỉnh' : 'Mẫu chuẩn hệ thống'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPresetIdForModal(preset.id);
                          setIsPresetModalOpen(true);
                        }}
                        className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-brand-blue rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-brand-blue/20"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Cấu hình & Phân quyền</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredPermissionPresets.length === 0 && (
              <div className="py-12 text-center text-slate-400">
                <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                <p className="text-sm font-medium">Không tìm thấy mẫu phân quyền nào phù hợp</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: NAS MINIO S3 STORAGE & DATABASE (Chỉ Quản trị viên mới được thấy) */}
        {activeSubTab === 'nas-storage' && activeUser?.role === 'ADMIN' && (
          <div className="p-6 space-y-6">
            
            {/* 1. AUTO-BACKUP & SYNC ENGINE CONTROL PANEL */}
            <div className="p-5 rounded-xl bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-emerald-50/60 border border-brand-blue/20 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-brand-blue/15">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-brand-blue text-white rounded-xl shadow-xs">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                      <span>Cơ Chế Tự Động Sao Lưu & Tải Lên MinIO NAS</span>
                      <span className="px-2 py-0.5 rounded-full text-[10.5px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        2-Way Auto Sync
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tự động đồng bộ 2 chiều giữa Website và MinIO Database trên Synology NAS theo thời gian thực
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                    isNASSyncing
                      ? 'bg-blue-100 text-brand-blue border-blue-300 animate-pulse'
                      : autoBackupConfig.enabled
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-slate-100 text-slate-500 border-slate-300'
                  }`}>
                    {isNASSyncing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang đồng bộ...</span>
                      </>
                    ) : autoBackupConfig.enabled ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Auto-Backup: BẬT</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        <span>Auto-Backup: TẮT</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 4 Core Auto-Backup Configuration Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Setting 1: Periodic Auto Backup */}
                <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-brand-blue" />
                      <span>Sao lưu định kỳ</span>
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoBackupConfig.enabled}
                        onChange={(e) => updateAutoBackupConfig({ enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-500 font-medium block">Chu kỳ sao lưu tự động:</label>
                    <select
                      value={autoBackupConfig.intervalMinutes}
                      onChange={(e) => updateAutoBackupConfig({ intervalMinutes: Number(e.target.value) })}
                      disabled={!autoBackupConfig.enabled}
                      className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-brand-blue disabled:opacity-50"
                    >
                      <option value={1}>Mỗi 1 phút (Test / Realtime)</option>
                      <option value={5}>Mỗi 5 phút</option>
                      <option value={10}>Mỗi 10 phút (Khuyến nghị)</option>
                      <option value={15}>Mỗi 15 phút</option>
                      <option value={30}>Mỗi 30 phút</option>
                      <option value={60}>Mỗi 1 giờ</option>
                    </select>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Đếm ngược:</span>
                    <span className="font-mono font-bold text-brand-blue bg-blue-50 px-2 py-0.5 rounded">
                      {autoBackupConfig.enabled 
                        ? `${Math.floor(autoBackupCountdown / 60).toString().padStart(2, '0')}:${(autoBackupCountdown % 60).toString().padStart(2, '0')}`
                        : '--:--'}
                    </span>
                  </div>
                </div>

                {/* Setting 2: Backup on Data Mutation */}
                <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-purple-600" />
                        <span>Lưu khi có dữ liệu mới</span>
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoBackupConfig.backupOnChange}
                          onChange={(e) => updateAutoBackupConfig({ backupOnChange: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Tự động sao lưu lên NAS sau 5 giây ngay khi tạo hồ sơ, phê duyệt, từ chối hoặc cập nhật phòng ban / nhân sự.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-purple-700 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Debounce 5s thông minh</span>
                  </div>
                </div>

                {/* Setting 3: Sync on Startup */}
                <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <DownloadCloud className="w-4 h-4 text-emerald-600" />
                        <span>Đồng bộ khi mở Web</span>
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoBackupConfig.syncOnStartup}
                          onChange={(e) => updateAutoBackupConfig({ syncOnStartup: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Tự động tải snapshot cơ sở dữ liệu mới nhất từ MinIO NAS về trình duyệt khi khởi động hoặc tải lại trang web.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Dữ liệu luôn đồng nhất</span>
                  </div>
                </div>

                {/* Setting 4: Auto-upload Attachments */}
                <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <UploadCloud className="w-4 h-4 text-blue-600" />
                        <span>Tự tải tệp lên NAS</span>
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoBackupConfig.autoUploadFiles}
                          onChange={(e) => updateAutoBackupConfig({ autoUploadFiles: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Mọi file scan OCR, PDF, ảnh đính kèm khi tạo hoặc duyệt hồ sơ sẽ được lưu trực tiếp vào bucket NAS <code className="font-mono text-[10px]">crm.trunghaico.vn</code>.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-blue-700 font-semibold flex items-center gap-1">
                    <Server className="w-3.5 h-3.5" />
                    <span>Lưu trữ vĩnh viễn trên NAS</span>
                  </div>
                </div>

              </div>
            </div>

            {/* 2. SERVER STATUS & CREDENTIALS CARD */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2 p-5 rounded-xl bg-slate-50/80 border border-slate-200/90 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Thông Số MinIO S3 API (Synology NAS)</h3>
                      <p className="text-[11px] text-slate-500">Cổng lưu trữ chuẩn S3 tốc độ cao</p>
                    </div>
                  </div>
                  <button
                    onClick={handleTestNAS}
                    disabled={isTestingNAS}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-brand-blue ${isTestingNAS ? 'animate-spin' : ''}`} />
                    <span>{isTestingNAS ? 'Đang kiểm tra...' : 'Kiểm Tra Kết Nối'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 text-[10.5px] font-medium block">Endpoint S3 API</span>
                    <span className="font-mono font-bold text-slate-800 text-xs">{MINIO_ENDPOINT}</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 text-[10.5px] font-medium block">Bucket Lưu Trữ</span>
                    <span className="font-mono font-bold text-brand-blue text-xs">{MINIO_BUCKET}</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 text-[10.5px] font-medium block">Access Key ID</span>
                    <span className="font-mono font-bold text-slate-800 text-xs">{MINIO_ACCESS_KEY}</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 text-[10.5px] font-medium block">Secret Key</span>
                    <span className="font-mono font-bold text-slate-800 text-xs">•••••••• (Đã bảo mật)</span>
                  </div>
                </div>

                {nasTestResult && (
                  <div className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                    nasTestResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    {nasTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span>{nasTestResult.message}</span>
                  </div>
                )}
              </div>

              {/* Quick Actions Panel */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-brand-blue/5 to-slate-50 border border-brand-blue/20 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-2">
                    <Database className="w-4 h-4 text-brand-blue" />
                    <span>Dung Lượng & Thống Kê Database</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Đang quản lý <strong>{documents.length}</strong> hồ sơ, <strong>{users.length}</strong> nhân sự, <strong>{departments.length}</strong> phòng ban và <strong>{jobTitles.length}</strong> chức vụ.
                  </p>
                  <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">Lần sao lưu gần nhất: {lastNASSyncTime ? new Date(lastNASSyncTime).toLocaleString('vi-VN') : 'Chưa đồng bộ'}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <button
                    onClick={handleSyncToNAS}
                    disabled={isNASSyncing}
                    className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <UploadCloud className={`w-4 h-4 ${isNASSyncing ? 'animate-bounce' : ''}`} />
                    <span>{isNASSyncing ? 'Đang sao lưu...' : 'Sao Lưu Database Ngay'}</span>
                  </button>

                  <button
                    onClick={() => handleRestoreFromNAS()}
                    disabled={isNASSyncing}
                    className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <DownloadCloud className="w-4 h-4 text-brand-blue" />
                    <span>Khôi Phục Bản Mới Nhất</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 3. File Upload Test on NAS */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <UploadCloud className="w-4 h-4 text-emerald-600" />
                  <span>Test Tải Tệp / Đính Kèm Trực Tiếp Lên MinIO NAS</span>
                </div>
                <span className="text-[11px] text-slate-400">Hỗ trợ PDF, hình ảnh, tài liệu scan...</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <label className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer transition-colors">
                  <UploadCloud className="w-4 h-4 text-brand-blue" />
                  <span>{isUploadingTest ? 'Đang tải lên NAS...' : 'Chọn file test upload lên NAS'}</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleTestFileUpload}
                    disabled={isUploadingTest}
                  />
                </label>

                {testUploadMsg && (
                  <div className="flex-1 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between gap-2 overflow-hidden">
                    <span className="truncate font-mono text-[11px]">{testUploadMsg.url}</span>
                    <a
                      href={testUploadMsg.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[11px] shrink-0"
                    >
                      Mở file ↗
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Historical Backups on NAS Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <Database className="w-4 h-4 text-purple-600" />
                  <span>Lịch Sử Các Bản Sao Lưu Database Trên MinIO NAS ({backups.length})</span>
                </div>
                <button
                  onClick={handleLoadBackups}
                  disabled={isLoadingBackups}
                  className="flex items-center gap-1 text-xs text-brand-blue font-semibold hover:underline cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBackups ? 'animate-spin' : ''}`} />
                  <span>Làm mới danh sách</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-3 px-4 w-12 text-center">STT</th>
                      <th className="py-3 px-4">Tên File Bản Sao Lưu Trên NAS</th>
                      <th className="py-3 px-4">Thời Điểm Sao Lưu</th>
                      <th className="py-3 px-4 text-right">Dung Lượng</th>
                      <th className="py-3 px-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {backups.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          {isLoadingBackups ? 'Đang tải danh sách bản sao lưu từ NAS...' : 'Chưa có bản sao lưu lịch sử nào. Nhấn "Sao Lưu Lên NAS" để tạo bản snapshot đầu tiên!'}
                        </td>
                      </tr>
                    ) : (
                      backups.map((b, idx) => (
                        <tr key={b.key} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-brand-blue">{b.fileName}</span>
                            <div className="text-[10px] text-slate-400 font-mono">{b.key}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {new Date(b.lastModified).toLocaleString('vi-VN')}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">
                            {(b.size / 1024).toFixed(1)} KB
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleRestoreFromNAS(b.key)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-brand-blue border border-brand-blue/30 rounded text-xs font-semibold transition-colors cursor-pointer"
                              title="Khôi phục database từ snapshot này"
                            >
                              Khôi phục bản này
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Thêm / Chỉnh sửa Phòng Ban */}
      <AnimatePresence>
        {isDeptModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-100 text-brand-blue rounded-lg">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {editingDept ? 'Chỉnh Sửa Phòng Ban' : 'Thêm Phòng Ban Mới'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {editingDept ? `Cập nhật thông tin phòng ban ${editingDept.code}` : 'Khai báo phòng ban mới vào hệ thống'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDeptModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveDept} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên phòng ban <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Phòng Kỹ thuật & Dự án, Ban Giám Đốc..."
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mã phòng ban (Viết tắt) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: KTDA, TCKT, PCKS, HCNS..."
                    value={deptCode}
                    onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2 text-xs uppercase font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Mã dùng để phân loại hồ sơ và ký hiệu phân quyền</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Thời gian phê duyệt SLA mặc định (Giờ) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      required
                      min="1"
                      max="720"
                      value={deptSlaHours}
                      onChange={(e) => setDeptSlaHours(Math.max(1, Number(e.target.value)))}
                      className="w-32 px-3.5 py-2 text-xs font-bold font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                    />
                    <span className="text-xs text-slate-500 font-medium">{formatSlaHelpText(deptSlaHours)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[4, 8, 12, 24, 48, 72].map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setDeptSlaHours(h)}
                        className={`px-2 py-0.5 text-[11px] rounded border transition-colors cursor-pointer ${
                          deptSlaHours === h
                            ? 'bg-brand-blue text-white border-brand-blue font-bold shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        }`}
                      >
                        {formatSlaPresetLabel(h)}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Hạn SLA mặc định sẽ tự động điền khi người lập trình hồ sơ tới phòng ban này</p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsDeptModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-brand-blue hover:bg-blue-800 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    {editingDept ? 'Cập Nhật' : 'Tạo Mới Phòng Ban'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Thêm / Chỉnh sửa Chức Vụ */}
      <AnimatePresence>
        {isJobModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {editingJob ? 'Chỉnh Sửa Chức Vụ' : 'Thêm Chức Vụ Mới'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {editingJob ? `Cập nhật thông tin chức vụ ${editingJob.code}` : 'Khai báo chức danh/vị trí công việc mới'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsJobModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveJob} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên chức vụ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Tổng Giám Đốc, Trưởng Phòng, Kế Toán Trưởng, Chuyên viên..."
                    value={jobName}
                    onChange={(e) => setJobName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mã chức vụ (Viết tắt) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: TGD, PTGD, KTT, TP_KTDA, CV_DA..."
                    value={jobCode}
                    onChange={(e) => setJobCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2 text-xs uppercase font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Thuộc phòng ban nào <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={jobDepartment}
                    onChange={(e) => setJobDepartment(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue cursor-pointer"
                  >
                    <option value="" disabled>-- Chọn phòng ban trực thuộc --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>{d.code} - {d.name}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">Chọn phòng ban trực tiếp quản lý chức vụ này</p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsJobModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-brand-blue hover:bg-blue-800 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    {editingJob ? 'Cập Nhật' : 'Tạo Mới Chức Vụ'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PERMISSION PRESET MODAL */}
      <PermissionPresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        initialPresetId={selectedPresetIdForModal}
      />
    </div>
  );
};
