import React, { useMemo } from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Plus, 
  FolderGit2, 
  Menu
} from 'lucide-react';
import { useDocument } from '../../context/DocumentContext';
import { isUserApproverForStep } from '../../lib/permissions';

interface MobileBottomNavProps {
  onOpenDrawer: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenDrawer }) => {
  const { 
    activeTab, 
    setActiveTab, 
    setIsCreateModalOpen,
    documents,
    activeUser,
    unreadNotificationCount,
    hasPermission 
  } = useDocument();

  const canCreate = hasPermission('doc.create') || activeUser?.role === 'ADMIN';

  // Số lượng hồ sơ chờ duyệt của tài khoản hiện tại
  const pendingMyApprovalCount = useMemo(() => {
    if (!activeUser) return 0;
    return documents.filter(doc => {
      if (doc.status === 'APPROVED' || doc.status === 'REJECTED' || doc.status === 'ADDITIONAL_REQ') return false;
      const currentStep = doc.steps[doc.currentStepIndex];
      if (!currentStep || currentStep.status !== 'CURRENT') return false;
      return isUserApproverForStep(activeUser, currentStep);
    }).length;
  }, [documents, activeUser]);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 select-none pointer-events-auto">
      
      {/* Curved Container Wrapper */}
      <div className="relative bg-white/98 backdrop-blur-2xl rounded-t-[26px] shadow-[0_-6px_25px_rgba(0,0,0,0.08)] border-t border-slate-200/80 px-2 pt-2 pb-[max(env(safe-area-inset-bottom,0px),8px)]">
        
        {/* Seamless Center Arch Dome (Curved wave rising behind center button) */}
        {canCreate && (
          <div className="absolute -top-[19px] left-1/2 -translate-x-1/2 w-28 h-5 pointer-events-none overflow-visible">
            <svg 
              className="w-full h-full text-white fill-current filter drop-shadow-[0_-3px_4px_rgba(0,0,0,0.04)]"
              viewBox="0 0 112 20" 
              fill="none"
              preserveAspectRatio="none"
            >
              <path d="M 0 20 C 22 20 28 0 56 0 C 84 0 90 20 112 20 Z" />
            </svg>
          </div>
        )}

        {/* 5 Navigation Items Grid / Flex */}
        <div className="flex items-end justify-around relative z-10 min-h-[52px]">
          
          {/* 1. Tổng quan (Trang chủ) */}
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-1 flex-col items-center justify-center py-1 transition-all cursor-pointer ${
              activeTab === 'dashboard' 
                ? 'text-brand-blue font-bold' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="relative p-1">
              <LayoutDashboard className={`h-5 w-5 transition-transform ${activeTab === 'dashboard' ? 'stroke-[2.5] scale-105' : 'stroke-[1.8]'}`} />
            </div>
            <span className={`text-[10px] tracking-tight leading-tight mt-0.5 ${activeTab === 'dashboard' ? 'font-bold' : 'font-medium'}`}>
              Tổng quan
            </span>
          </button>

          {/* 2. Chờ duyệt */}
          <button
            type="button"
            onClick={() => setActiveTab('pending-approvals')}
            className={`relative flex flex-1 flex-col items-center justify-center py-1 transition-all cursor-pointer ${
              activeTab === 'pending-approvals' 
                ? 'text-brand-blue font-bold' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="relative p-1">
              <CheckSquare className={`h-5 w-5 transition-transform ${activeTab === 'pending-approvals' ? 'stroke-[2.5] scale-105' : 'stroke-[1.8]'}`} />
              {pendingMyApprovalCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center text-[9px] font-black text-white bg-brand-red rounded-full shadow-md animate-bounce">
                  {pendingMyApprovalCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] tracking-tight leading-tight mt-0.5 ${activeTab === 'pending-approvals' ? 'font-bold' : 'font-medium'}`}>
              Chờ duyệt
            </span>
          </button>

          {/* 3. Nút Nổi Bật Ở Giữa: Trình Ký (+ Form) */}
          {canCreate ? (
            <div className="-mt-8 flex-1 flex flex-col items-center justify-center relative z-20">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="w-13.5 h-13.5 rounded-full bg-gradient-to-tr from-brand-blue via-indigo-600 to-blue-500 text-white shadow-[0_8px_20px_rgba(37,99,235,0.4)] flex items-center justify-center active:scale-95 transition-transform cursor-pointer border-[3.5px] border-white ring-1 ring-blue-500/10"
                title="Khởi tạo hồ sơ trình ký mới"
              >
                <Plus className="h-6.5 w-6.5 stroke-[2.8] text-white" />
              </button>
              <span className="text-[10px] font-extrabold text-brand-blue mt-1 tracking-tight leading-tight uppercase">
                Trình Ký
              </span>
            </div>
          ) : (
            <div className="w-10" />
          )}

          {/* 4. Hồ sơ của tôi */}
          <button
            type="button"
            onClick={() => setActiveTab('my-documents')}
            className={`flex flex-1 flex-col items-center justify-center py-1 transition-all cursor-pointer ${
              activeTab === 'my-documents' 
                ? 'text-brand-blue font-bold' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="relative p-1">
              <FolderGit2 className={`h-5 w-5 transition-transform ${activeTab === 'my-documents' ? 'stroke-[2.5] scale-105' : 'stroke-[1.8]'}`} />
            </div>
            <span className={`text-[10px] tracking-tight leading-tight mt-0.5 ${activeTab === 'my-documents' ? 'font-bold' : 'font-medium'}`}>
              Hồ sơ tôi
            </span>
          </button>

          {/* 5. Menu mở rộng Drawer (Tất cả) */}
          <button
            type="button"
            onClick={onOpenDrawer}
            className="relative flex flex-1 flex-col items-center justify-center py-1 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
          >
            <div className="relative p-1">
              <Menu className="h-5 w-5 stroke-[1.8]" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center text-[9px] font-black text-white bg-brand-red rounded-full shadow-md animate-bounce">
                  {unreadNotificationCount}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight leading-tight mt-0.5 font-medium">
              Tất cả
            </span>
          </button>

        </div>

        {/* Bottom Home Indicator Bar (Mô phỏng thanh gạt đáy màn hình) */}
        <div className="w-32 h-1 bg-slate-900/80 rounded-full mx-auto mt-2 opacity-80" />

      </div>

    </nav>
  );
};
