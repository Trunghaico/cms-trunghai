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
import { canUserOverseeAllDocuments } from '../../lib/permissions';

export const Sidebar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    stats, 
    activeUser,
    users,
    documents,
    hasPermission
  } = useDocument();

  if (!activeUser) return null;

  // Quyền truy cập các khối
  const canViewDashboard = hasPermission('system.dashboard');
  const canViewDocs = hasPermission('doc.view') || hasPermission('doc.view_all');
  const canApprove = hasPermission('approval.approve') || hasPermission('approval.override');
  const isManagerOrAdmin = 
    activeUser.role === 'ADMIN' || 
    activeUser.role === 'DIRECTOR' || 
    activeUser.role === 'BOARD_HEAD' || 
    activeUser.role === 'DEPT_HEAD' ||
    activeUser.role === 'CHIEF_ACCOUNTANT' ||
    activeUser.role === 'LEGAL_DEPT' ||
    hasPermission('user.view') || 
    hasPermission('workflow.manage') ||
    canUserOverseeAllDocuments(activeUser);

  // Tính toán số lượng badge thời gian thực
  const badgeCounts = useMemo(() => {
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
    },
    {
      id: 'report-analytics',
      label: 'Thống kê hồ sơ',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'audit-logs',
      label: 'Nhật ký hoạt động',
      icon: History,
      badge: null,
    },
  ];

  const block3Items = [
    {
      id: 'settings-categories',
      label: 'Danh mục chung',
      icon: ListTree,
      badge: null,
    },
    {
      id: 'workflow-config',
      label: 'Cấu hình Quy trình (SLA)',
      icon: GitFork,
      badge: null,
    },
    {
      id: 'user-management',
      label: 'Quản trị & Phân quyền',
      icon: Users,
      badge: `${users.length}`,
      badgeColor: 'bg-brand-blue text-white',
    },
  ];

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-60 bg-slate-900 text-slate-300 flex flex-col shrink-0 z-20 border-r border-slate-800 shadow-xl transition-all select-none">
      
      {/* Main Navigation Menu */}
      <div className="flex-1 py-3 px-2 space-y-4 overflow-y-auto custom-scrollbar text-xs">
        
        {/* KHỐI 1: TỔNG QUAN & HỒ SƠ */}
        <div className="space-y-1">
          <div className="px-2.5 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
            <span>KHỐI 1: TỔNG QUAN & HỒ SƠ</span>
          </div>

          {block1Items.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-2.5 py-2 font-semibold rounded-[3px] transition-all duration-150 group relative cursor-pointer ${
                  isActive
                    ? 'bg-brand-blue text-white shadow-sm font-bold translate-x-0.5'
                    : item.isHot
                    ? 'text-white bg-red-950/40 border border-brand-red/30 hover:bg-brand-red/20'
                    : 'text-slate-300 hover:bg-slate-800/90 hover:text-white hover:translate-x-0.5'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-red rounded-r" />
                )}

                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                    isActive ? 'text-white' : item.isHot ? 'text-brand-red' : 'text-slate-400 group-hover:text-brand-blue'
                  }`} />
                  <span className="truncate text-xs">{item.label}</span>
                </div>
                
                {item.badge !== null && (
                  <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded-[3px] shrink-0 ${item.badgeColor || 'bg-slate-700 text-white'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* KHỐI 2: DỮ LIỆU & BÁO CÁO */}
        <div className="space-y-1 pt-1 border-t border-slate-800/80">
          <div className="px-2.5 pb-1 pt-2 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>KHỐI 2: DỮ LIỆU & BÁO CÁO</span>
          </div>

          {block2Items.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-2.5 py-2 font-semibold rounded-[3px] transition-all duration-150 group relative cursor-pointer ${
                  isActive
                    ? 'bg-brand-blue text-white shadow-sm font-bold translate-x-0.5'
                    : 'text-slate-300 hover:bg-slate-800/90 hover:text-white hover:translate-x-0.5'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-red rounded-r" />
                )}

                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'
                  }`} />
                  <span className="truncate text-xs">{item.label}</span>
                </div>
                
                {item.badge !== null && (
                  <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded-[3px] shrink-0 ${item.badgeColor || 'bg-slate-700 text-white'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* KHỐI 3: THIẾT LẬP HỆ THỐNG & DANH MỤC (Chỉ hiển thị cho Manager/Admin) */}
        {isManagerOrAdmin && (
          <div className="space-y-1 pt-1 border-t border-slate-800/80">
            <div className="px-2.5 pb-1 pt-2 text-[10px] font-black uppercase tracking-wider text-amber-400/90 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>KHỐI 3: CẤU HÌNH & QUẢN TRỊ</span>
              </div>
              <span className="text-[9px] px-1 bg-amber-500/20 text-amber-300 rounded font-normal">Admin</span>
            </div>

            {block3Items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 font-semibold rounded-[3px] transition-all duration-150 group relative cursor-pointer ${
                    isActive
                      ? 'bg-brand-blue text-white shadow-sm font-bold translate-x-0.5'
                      : 'text-slate-300 hover:bg-slate-800/90 hover:text-white hover:translate-x-0.5'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-red rounded-r" />
                  )}

                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-amber-400'
                    }`} />
                    <span className="truncate text-xs">{item.label}</span>
                  </div>
                  
                  {item.badge !== null && (
                    <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded-[3px] shrink-0 ${item.badgeColor || 'bg-slate-700 text-white'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

      </div>

      {/* User Footer */}
      <div className="p-2.5 border-t border-slate-800 bg-slate-950/80">
        <div className="flex items-center gap-2.5 px-2 py-1.5 bg-slate-900/90 rounded-[3px] border border-slate-800">
          <div className="h-8 w-8 rounded-[3px] bg-brand-blue flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
            {activeUser.name.split(' ').pop()?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{activeUser.name}</p>
            <p className="text-[10px] text-brand-red font-medium truncate">{activeUser.roleTitle}</p>
          </div>
        </div>
      </div>

    </aside>
  );
};

