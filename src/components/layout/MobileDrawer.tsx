import React, { useMemo } from 'react';
import {
  X,
  LayoutDashboard,
  FolderGit2,
  Inbox,
  FileStack,
  Archive,
  CheckSquare,
  History,
  Clock,
  BarChart3,
  ListTree,
  SlidersHorizontal,
  GitFork,
  Users,
  Building2,
  User as UserIcon,
  LogOut,
  Bell,
  Download,
  Server,
  ShieldCheck,
  ChevronRight,
  Plus
} from 'lucide-react';
import { useDocument } from '../../context/DocumentContext';
import { isUserApproverForStep } from '../../lib/permissions';
import { requestNotificationPermission, getNotificationPermission } from '../../lib/pwaService';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose }) => {
  const {
    activeTab,
    setActiveTab,
    activeUser,
    logout,
    documents,
    hasPermission,
    openProfileModal,
    setIsCreateModalOpen,
    unreadNotificationCount
  } = useDocument();

  const [pushStatus, setPushStatus] = React.useState<string>('');

  const isAdmin = activeUser?.role === 'ADMIN';

  // Permission checks
  const canViewDashboard = hasPermission('system.dashboard');
  const canViewDocs = hasPermission('doc.view') || hasPermission('doc.view_all');
  const canApprove = hasPermission('approval.approve') || hasPermission('approval.override') || hasPermission('approval.internal_check');
  const canViewCategory = hasPermission('category.view') || hasPermission('category.manage') || isAdmin;
  const canManageWorkflow = hasPermission('workflow.manage') || isAdmin;
  const canManageUsers = hasPermission('user.view') || hasPermission('user.create') || hasPermission('user.edit') || isAdmin;
  const canViewReportSLA = hasPermission('report.sla') || isAdmin;
  const canViewReportAnalytics = hasPermission('report.analytics') || isAdmin;
  const canViewAuditLog = hasPermission('system.audit_log') || isAdmin;
  const canCreate = hasPermission('doc.create') || isAdmin;

  // Real-time badge counts
  const badges = useMemo(() => {
    if (!activeUser) return { myCreated: 0, received: 0, archive: 0, myApproved: 0, pending: 0, all: 0 };
    
    const myCreated = documents.filter(d => d.creatorId === activeUser.id).length;
    const received = documents.filter(d =>
      (d.status === 'PENDING' || d.status === 'IN_PROGRESS' || d.status === 'ADDITIONAL_REQ') &&
      (d.department?.toLowerCase() === activeUser.department.toLowerCase() ||
        d.steps[d.currentStepIndex]?.department?.toLowerCase() === activeUser.department.toLowerCase())
    ).length;
    const archive = documents.filter(d => d.status === 'APPROVED').length;
    const myApproved = documents.filter(d =>
      d.steps.some(s => s.status === 'APPROVED' && (
        s.approverId === activeUser.id ||
        (s.approverName && s.approverName.trim().toLowerCase() === activeUser.name.trim().toLowerCase())
      ))
    ).length;
    const pending = documents.filter(doc => {
      if (doc.status === 'APPROVED' || doc.status === 'REJECTED' || doc.status === 'ADDITIONAL_REQ') return false;
      const currentStep = doc.steps[doc.currentStepIndex];
      if (!currentStep || currentStep.status !== 'CURRENT') return false;
      return isUserApproverForStep(activeUser, currentStep);
    }).length;

    return { myCreated, received, archive, myApproved, pending, all: documents.length };
  }, [documents, activeUser]);

  if (!isOpen || !activeUser) return null;

  const handleSelectTab = (tab: any) => {
    setActiveTab(tab);
    onClose();
  };

  const handleEnablePush = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setPushStatus('✅ Đã bật thông báo thành công');
      setTimeout(() => setPushStatus(''), 4000);
    } else {
      setPushStatus('⚠️ Vui lòng cho phép thông báo');
      setTimeout(() => setPushStatus(''), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex select-none animate-fade-in">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity" 
      />

      {/* Slide Drawer Content */}
      <div className="relative w-full max-w-xs sm:max-w-sm bg-white h-full flex flex-col shadow-2xl z-10 animate-slide-right overflow-hidden">
        
        {/* Drawer Header: User Profile Card */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-brand-blue text-white shrink-0 border-b border-indigo-900/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                onClick={() => {
                  openProfileModal();
                  onClose();
                }}
                className="w-11 h-11 rounded-2xl bg-white/10 border-2 border-indigo-300/40 flex items-center justify-center font-black text-sm text-cyan-300 shadow-md cursor-pointer hover:scale-105 transition-transform"
              >
                {activeUser.avatar ? (
                  <img src={activeUser.avatar} alt={activeUser.name} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  activeUser.name.charAt(0)
                )}
              </div>
              <div 
                onClick={() => {
                  openProfileModal();
                  onClose();
                }}
                className="cursor-pointer"
              >
                <h3 className="font-bold text-sm tracking-tight hover:underline flex items-center gap-1.5">
                  <span>{activeUser.name}</span>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-indigo-500 text-white rounded-full">
                    {activeUser.role}
                  </span>
                </h3>
                <p className="text-[11px] text-indigo-200 mt-0.5 truncate max-w-[180px]">
                  {activeUser.roleTitle}
                </p>
                <p className="text-[10px] text-slate-300 flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3 w-3 text-cyan-400" />
                  <span className="truncate max-w-[180px]">{activeUser.department}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Create Document Button */}
          {canCreate && (
            <button
              onClick={() => {
                onClose();
                setIsCreateModalOpen(true);
              }}
              className="mt-3.5 w-full py-2 px-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Tạo Hồ Sơ Trình Ký Mới</span>
            </button>
          )}
        </div>

        {/* Drawer Scrollable Navigation Links */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-slate-700">
          
          {/* SECTION 1: HỒ SƠ & PHÊ DUYỆT */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-1.5">
              Hồ Sơ & Phê Duyệt
            </span>
            <div className="space-y-1">
              <button
                onClick={() => handleSelectTab('dashboard')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                  activeTab === 'dashboard' ? 'bg-blue-50 text-brand-blue font-bold' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard className="h-4 w-4 text-slate-500" />
                  <span>Tổng quan (Dashboard)</span>
                </div>
              </button>

              <button
                onClick={() => handleSelectTab('pending-approvals')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                  activeTab === 'pending-approvals' ? 'bg-blue-50 text-brand-blue font-bold' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CheckSquare className="h-4 w-4 text-amber-600" />
                  <span>Chờ tôi duyệt</span>
                </div>
                {badges.pending > 0 && (
                  <span className="px-2 py-0.5 bg-brand-red text-white font-bold text-[10px] rounded-full shadow-xs">
                    {badges.pending}
                  </span>
                )}
              </button>

              <button
                onClick={() => handleSelectTab('my-documents')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                  activeTab === 'my-documents' ? 'bg-blue-50 text-brand-blue font-bold' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FolderGit2 className="h-4 w-4 text-slate-500" />
                  <span>Hồ sơ của tôi</span>
                </div>
                <span className="text-[11px] font-bold text-slate-400">{badges.myCreated}</span>
              </button>

              <button
                onClick={() => handleSelectTab('received-documents')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                  activeTab === 'received-documents' ? 'bg-blue-50 text-brand-blue font-bold' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Inbox className="h-4 w-4 text-slate-500" />
                  <span>Hồ sơ tiếp nhận / Phòng ban</span>
                </div>
                <span className="text-[11px] font-bold text-slate-400">{badges.received}</span>
              </button>

              <button
                onClick={() => handleSelectTab('dms-archive')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                  activeTab === 'dms-archive' ? 'bg-blue-50 text-brand-blue font-bold' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Archive className="h-4 w-4 text-emerald-600" />
                  <span>Kho lưu trữ số DMS</span>
                </div>
                <span className="text-[11px] font-bold text-slate-400">{badges.archive}</span>
              </button>

              <button
                onClick={() => handleSelectTab('my-approved-history')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                  activeTab === 'my-approved-history' ? 'bg-blue-50 text-brand-blue font-bold' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <History className="h-4 w-4 text-slate-500" />
                  <span>Lịch sử tôi đã duyệt</span>
                </div>
                <span className="text-[11px] font-bold text-slate-400">{badges.myApproved}</span>
              </button>

              <button
                onClick={() => handleSelectTab('all-documents')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                  activeTab === 'all-documents' ? 'bg-blue-50 text-brand-blue font-bold' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileStack className="h-4 w-4 text-slate-500" />
                  <span>Tất cả hồ sơ công ty</span>
                </div>
                <span className="text-[11px] font-bold text-slate-400">{badges.all}</span>
              </button>
            </div>
          </div>

          {/* SECTION 2: BÁO CÁO & DỮ LIỆU */}
          {(canViewReportSLA || canViewReportAnalytics || canViewAuditLog) && (
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-1.5">
                Báo Cáo & Thống Kê
              </span>
              <div className="space-y-1">
                {canViewReportSLA && (
                  <button
                    onClick={() => handleSelectTab('report-sla')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                      activeTab === 'report-sla' ? 'bg-blue-50 text-brand-blue font-bold' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <span>Báo cáo tiến độ & SLA</span>
                    </div>
                  </button>
                )}

                {canViewReportAnalytics && (
                  <button
                    onClick={() => handleSelectTab('report-analytics')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                      activeTab === 'report-analytics' ? 'bg-blue-50 text-brand-blue font-bold' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <BarChart3 className="h-4 w-4 text-indigo-600" />
                      <span>Thống kê phân tích hồ sơ</span>
                    </div>
                  </button>
                )}

                {canViewAuditLog && (
                  <button
                    onClick={() => handleSelectTab('audit-logs')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                      activeTab === 'audit-logs' ? 'bg-blue-50 text-brand-blue font-bold' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ListTree className="h-4 w-4 text-slate-500" />
                      <span>Nhật ký hệ thống (Audit Logs)</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* SECTION 3: CẤU HÌNH & QUẢN TRỊ */}
          {(canManageWorkflow || canManageUsers || canViewCategory) && (
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-1.5">
                Thiết Lập & Quản Trị
              </span>
              <div className="space-y-1">
                {canManageWorkflow && (
                  <button
                    onClick={() => handleSelectTab('workflow-config')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                      activeTab === 'workflow-config' ? 'bg-blue-50 text-brand-blue font-bold' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <GitFork className="h-4 w-4 text-brand-blue" />
                      <span>Mẫu quy trình BPM</span>
                    </div>
                  </button>
                )}

                {canManageUsers && (
                  <button
                    onClick={() => handleSelectTab('user-management')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                      activeTab === 'user-management' ? 'bg-blue-50 text-brand-blue font-bold' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className="h-4 w-4 text-indigo-600" />
                      <span>Người dùng & Phân quyền</span>
                    </div>
                  </button>
                )}

                {canViewCategory && (
                  <button
                    onClick={() => handleSelectTab('settings')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                      activeTab === 'settings' ? 'bg-blue-50 text-brand-blue font-bold' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <SlidersHorizontal className="h-4 w-4 text-slate-600" />
                      <span>Cấu hình danh mục & NAS</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* SECTION 4: TÍNH NĂNG DI ĐỘNG & THÔNG BÁO */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <button
              onClick={handleEnablePush}
              className="w-full p-2.5 bg-blue-50/70 hover:bg-blue-100/70 text-brand-navy rounded-xl flex items-center justify-between transition-colors text-[11px] font-semibold cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-brand-blue" />
                <span>{pushStatus || 'Bật thông báo & Huy hiệu ngoài màn hình'}</span>
              </div>
              {unreadNotificationCount > 0 && !pushStatus ? (
                <span className="px-2 py-0.5 bg-brand-red text-white font-bold text-[10px] rounded-full shadow-xs">
                  {unreadNotificationCount} mới
                </span>
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              )}
            </button>

            <button
              onClick={() => {
                openProfileModal();
                onClose();
              }}
              className="w-full p-2.5 hover:bg-slate-100 text-slate-700 rounded-xl flex items-center justify-between transition-colors text-[11px] font-semibold cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-slate-500" />
                <span>Trang hồ sơ & Chữ ký của tôi</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>

        </div>

        {/* Drawer Footer: Logout */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Trung Hải CMS v1.0.1</span>
          </div>

          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-brand-red font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>

      </div>
    </div>
  );
};
