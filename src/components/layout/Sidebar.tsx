import React from 'react';
import { 
  LayoutDashboard, 
  FolderGit2, 
  CheckSquare, 
  FileStack, 
  ShieldCheck
} from 'lucide-react';
import { useDocument } from '../../context/DocumentContext';

export const Sidebar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    stats, 
    activeUser,
    users,
    hasPermission
  } = useDocument();

  if (!activeUser) return null;

  const canViewDashboard = hasPermission('system.dashboard');
  const canViewDocs = hasPermission('doc.view') || hasPermission('doc.view_all');
  const canApprove = hasPermission('approval.approve') || hasPermission('approval.override');
  const canManageUsers = hasPermission('user.view') || hasPermission('user.create') || hasPermission('user.edit');

  const navItems = [
    ...(canViewDashboard ? [{
      id: 'dashboard',
      label: 'Tổng quan',
      icon: LayoutDashboard,
      badge: null,
    }] : []),
    ...(canViewDocs ? [{
      id: 'my-documents',
      label: 'Hồ sơ của tôi',
      icon: FolderGit2,
      badge: stats.myCreatedCount > 0 ? stats.myCreatedCount : null,
      badgeColor: 'bg-brand-blue text-white',
    }] : []),
    ...(canApprove ? [{
      id: 'pending-approvals',
      label: 'Cần tôi duyệt',
      icon: CheckSquare,
      badge: stats.myPendingApprovalsCount > 0 ? stats.myPendingApprovalsCount : null,
      badgeColor: 'bg-brand-red text-white animate-pulse-subtle shadow-xs',
    }] : []),
    ...(canViewDocs ? [{
      id: 'all-documents',
      label: 'Tất cả hồ sơ',
      icon: FileStack,
      badge: stats.total,
      badgeColor: 'bg-slate-700 text-slate-200',
    }] : []),
    ...(canManageUsers ? [{
      id: 'users',
      label: 'Phân quyền',
      icon: ShieldCheck,
      badge: `${users.length}`,
      badgeColor: 'bg-brand-red text-white font-bold',
    }] : []),
  ];

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-56 bg-slate-900 text-slate-300 flex flex-col shrink-0 z-20 border-r border-slate-800 shadow-xl transition-all select-none">
      
      {/* Main Navigation Menu */}
      <div className="flex-1 py-3 px-2.5 space-y-1 overflow-y-auto">
        <div className="px-2.5 pb-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
          Chức năng
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-semibold rounded-[3px] transition-all duration-150 group relative overflow-hidden cursor-pointer ${
                isActive
                  ? 'bg-brand-blue text-white shadow-sm translate-x-0.5'
                  : 'text-slate-300 hover:bg-slate-800/90 hover:text-white hover:translate-x-0.5'
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-red rounded-r" />
              )}

              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-brand-red'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              
              {item.badge !== null && (
                <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded-[3px] ${item.badgeColor || 'bg-slate-700 text-white'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* User Footer */}
      <div className="p-2.5 border-t border-slate-800 bg-slate-950/70">
        <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-900/90 rounded-[3px] border border-slate-800">
          <div className="h-7 w-7 rounded-[3px] bg-brand-blue flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
            {activeUser.name.split(' ').pop()?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-white truncate">{activeUser.name}</p>
            <p className="text-[9px] text-brand-red font-medium truncate">{activeUser.roleTitle}</p>
          </div>
        </div>
      </div>

    </aside>
  );
};
