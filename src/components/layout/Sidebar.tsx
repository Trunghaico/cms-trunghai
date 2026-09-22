import React, { useMemo } from 'react';
import {
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
  ShieldCheck,
  Building2,
  FileCheck2,
  ChevronRight
} from 'lucide-react';
import { useDocument } from '../../context/DocumentContext';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    stats,
    activeUser,
    users,
    documents,
    hasPermission,
    openProfileModal
  } = useDocument();

  const isAdmin = activeUser?.role === 'ADMIN';

  // Quyền truy cập các khối
  const canViewDashboard = hasPermission('system.dashboard');
  const canViewDocs = hasPermission('doc.view') || hasPermission('doc.view_all');
  const canApprove = hasPermission('approval.approve') || hasPermission('approval.override') || hasPermission('approval.internal_check');
  const canViewCategory = hasPermission('category.view') || hasPermission('category.manage') || isAdmin;
  const canManageWorkflow = hasPermission('workflow.manage') || isAdmin;
  const canManageUsers = hasPermission('user.view') || hasPermission('user.create') || hasPermission('user.edit') || isAdmin;

  // Quyền truy cập từng mục trong Dữ liệu & Báo cáo
  const canViewReportSLA = hasPermission('report.sla') || isAdmin;
  const canViewReportAnalytics = hasPermission('report.analytics') || isAdmin;
  const canViewAuditLog = hasPermission('system.audit_log') || isAdmin;

  // Tính toán số lượng badge thời gian thực
  const badgeCounts = useMemo(() => {
    if (!activeUser) {
      return {
        myCreated: 0,
        received: 0,
        archive: 0,
        myApprovedHistory: 0,
        overdueCount: 0,
        allTotal: 0
      };
    }
    const now = Date.now();
    const myCreated = documents.filter(d => d.creatorId === activeUser.id).length;

    const received = documents.filter(d =>
      (d.status === 'PENDING' || d.status === 'IN_PROGRESS' || d.status === 'ADDITIONAL_REQ') &&
      (d.department?.toLowerCase() === activeUser.department.toLowerCase() ||
        d.steps[d.currentStepIndex]?.department?.toLowerCase() === activeUser.department.toLowerCase())
    ).length;

    const archive = documents.filter(d => d.status === 'APPROVED').length;

    const myApprovedHistory = documents.filter(d =>
      d.steps.some(s => s.status === 'APPROVED' && (
        s.approverId === activeUser.id ||
        (s.approverName && s.approverName.trim().toLowerCase() === activeUser.name.trim().toLowerCase())
      ))
    ).length;

    const overdueCount = documents.filter(d =>
      d.isOverdue ||
      (d.steps[d.currentStepIndex]?.status === 'CURRENT' &&
        d.steps[d.currentStepIndex]?.deadline &&
        now > new Date(d.steps[d.currentStepIndex].deadline!).getTime())
    ).length;

    return {
      myCreated,
      received,
      archive,
      myApprovedHistory,
      overdueCount,
      allTotal: documents.length
    };
  }, [documents, activeUser]);

  // Cấu trúc 3 Khối
  const block1Items = [
    {
      id: 'dashboard',
      label: 'Tổng quan hệ thống',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'my-documents',
      label: 'Hồ sơ của tôi',
      icon: FolderGit2,
      badge: badgeCounts.myCreated > 0 ? badgeCounts.myCreated : null,
      badgeColor: 'bg-brand-blue text-white',
    },
    {
      id: 'received-documents',
      label: 'Hồ sơ tiếp nhận',
      icon: Inbox,
      badge: badgeCounts.received > 0 ? badgeCounts.received : null,
      badgeColor: 'bg-emerald-600 text-white',
    },
    {
      id: 'all-documents',
      label: 'Tất cả hồ sơ',
      icon: FileStack,
      badge: badgeCounts.allTotal > 0 ? badgeCounts.allTotal : null,
      badgeColor: 'bg-slate-700 text-slate-200',
    },
    {
      id: 'dms-archive',
      label: 'Kho lưu trữ (DMS)',
      icon: Archive,
      badge: badgeCounts.archive > 0 ? badgeCounts.archive : null,
      badgeColor: 'bg-slate-700 text-slate-300',
    },
    {
      id: 'pending-approvals',
      label: 'Chờ tôi duyệt',
      icon: CheckSquare,
      badge: stats.myPendingApprovalsCount > 0 ? stats.myPendingApprovalsCount : null,
      badgeColor: 'bg-brand-red text-white font-black animate-pulse shadow-xs',
      isHot: stats.myPendingApprovalsCount > 0,
    },
    {
      id: 'my-approved-history',
      label: 'Tôi đã duyệt',
      icon: FileCheck2,
      badge: badgeCounts.myApprovedHistory > 0 ? badgeCounts.myApprovedHistory : null,
      badgeColor: 'bg-slate-800 text-slate-300',
    },
  ];

  const block2Items = [
    {
      id: 'report-sla',
      label: 'Báo cáo tiến độ & SLA',
      icon: Clock,
      badge: badgeCounts.overdueCount > 0 ? `Trễ ${badgeCounts.overdueCount}` : null,
      badgeColor: 'bg-brand-red text-white font-bold animate-pulse',
      visible: canViewReportSLA,
    },
    {
      id: 'report-analytics',
      label: 'Thống kê hồ sơ',
      icon: BarChart3,
      badge: null,
      visible: canViewReportAnalytics,
    },
    {
      id: 'audit-logs',
      label: 'Nhật ký hoạt động',
      icon: History,
      badge: null,
      visible: canViewAuditLog,
    },
  ].filter(item => item.visible);

  const block3Items = [
    {
      id: 'settings-categories',
      label: 'Danh mục chung',
      icon: ListTree,
      badge: null,
      visible: canViewCategory,
    },
    {
      id: 'workflow-config',
      label: 'Cấu hình Quy trình (SLA)',
      icon: GitFork,
      badge: null,
      visible: canManageWorkflow,
    },
    {
      id: 'user-management',
      label: 'Quản trị & Phân quyền',
      icon: Users,
      badge: `${users.length}`,
      badgeColor: 'bg-brand-blue text-white',
      visible: canManageUsers,
    },
  ].filter(item => item.visible);

  if (!activeUser) return null;

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-60 bg-slate-950/95 backdrop-blur-2xl text-slate-300 flex flex-col shrink-0 z-20 border-r border-slate-800/80 shadow-2xl transition-all select-none">

      {/* Main Navigation Menu */}
      <div className="flex-1 py-3.5 px-3 space-y-4 overflow-y-auto custom-scrollbar text-xs">

        {/* KHỐI 1: TỔNG QUAN & HỒ SƠ */}
        <div className="space-y-1">
          <div className="px-3 pb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400/90 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            <span>TỔNG QUAN & HỒ SƠ</span>
          </div>

          {block1Items.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 font-semibold rounded-xl transition-all duration-200 group relative cursor-pointer ${isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-brand-blue text-white shadow-[0_4px_16px_rgba(99,102,241,0.35)] font-bold translate-x-1'
                  : item.isHot
                    ? 'text-red-200 bg-red-950/40 border border-red-800/40 hover:bg-red-900/40 hover:text-white'
                    : 'text-slate-300 hover:bg-slate-900/90 hover:text-white hover:translate-x-1'
                  }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? 'text-white' : item.isHot ? 'text-red-400' : 'text-slate-400 group-hover:text-indigo-400'
                  }`} />
                  <span className="truncate text-xs">{item.label}</span>
                </div>

                {item.badge !== null && (
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 shadow-xs ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* KHỐI 2: DỮ LIỆU & BÁO CÁO (Chỉ hiển thị cho người có quyền từng mục) */}
        {block2Items.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-slate-800/80">
            <div className="px-3 pb-1.5 pt-1 text-[10px] font-black uppercase tracking-wider text-slate-400/90 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span>DỮ LIỆU & BÁO CÁO</span>
            </div>

            {block2Items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 font-semibold rounded-xl transition-all duration-200 group relative cursor-pointer ${isActive
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-[0_4px_16px_rgba(16,185,129,0.3)] font-bold translate-x-1'
                    : 'text-slate-300 hover:bg-slate-900/90 hover:text-white hover:translate-x-1'
                    }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'
                    }`} />
                    <span className="truncate text-xs">{item.label}</span>
                  </div>

                  {item.badge !== null && (
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 shadow-xs ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* KHỐI 3: THIẾT LẬP HỆ THỐNG & DANH MỤC (Chỉ hiển thị cho người có quyền) */}
        {block3Items.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-slate-800/80">
            <div className="px-3 pb-1.5 pt-1 text-[10px] font-black uppercase tracking-wider text-amber-400/90 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                <span>CẤU HÌNH & QUẢN TRỊ</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded-full font-bold">Admin</span>
            </div>

            {block3Items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 font-semibold rounded-xl transition-all duration-200 group relative cursor-pointer ${isActive
                    ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-[0_4px_16px_rgba(245,158,11,0.3)] font-bold translate-x-1'
                    : 'text-slate-300 hover:bg-slate-900/90 hover:text-white hover:translate-x-1'
                    }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-amber-400'
                    }`} />
                    <span className="truncate text-xs">{item.label}</span>
                  </div>

                  {item.badge !== null && (
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 shadow-xs ${item.badgeColor || 'bg-slate-800 text-white'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

      </div>

      {/* User Footer with AI modern glow card */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950">
        <button
          type="button"
          onClick={() => openProfileModal('PROFILE')}
          className="w-full text-left flex items-center gap-2.5 p-2 bg-slate-900/90 hover:bg-slate-850 rounded-2xl border border-slate-800 hover:border-indigo-500/40 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all group cursor-pointer"
          title="Xem hồ sơ, đổi mật khẩu & cập nhật Avatar"
        >
          <div className="relative shrink-0 w-8 h-8">
            {activeUser.avatar ? (
              <img
                src={activeUser.avatar}
                alt={activeUser.name}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/30 group-hover:ring-indigo-400 transition-all shadow-xs"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-brand-blue flex items-center justify-center text-white font-bold text-xs shadow-xs group-hover:brightness-110">
                {activeUser.name.split(' ').pop()?.charAt(0) || 'U'}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-950 rounded-full" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate group-hover:text-indigo-300 transition-colors">{activeUser.name}</p>
            <p className="text-[10px] text-red-400 font-medium truncate">{activeUser.roleTitle}</p>
          </div>

          <div className="text-xs text-slate-500 group-hover:text-indigo-400 transition-colors">
            ⚙️
          </div>
        </button>
      </div>

    </aside>
  );
};
