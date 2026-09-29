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
      
      {/* Curved Container Wrapper with Top Shadow */}
      <div className="relative bg-white/98 backdrop-blur-2xl rounded-t-[28px] shadow-[0_-5px_22px_rgba(0,0,0,0.07)] border-t border-slate-200/70 px-2 pt-2 pb-[max(env(safe-area-inset-bottom,0px),10px)]">
        
        {/* Seamless Center Arch Dome (Bo theo góc vòm ôm trọn nút tròn Trình Ký) */}
        {canCreate && (
          <div className="absolute -top-[27px] left-1/2 -translate-x-1/2 w-36 h-7 pointer-events-none overflow-visible z-0">
            <svg 
              className="w-full h-full text-white fill-current filter drop-shadow-[0_-3px_5px_rgba(0,0,0,0.04)]"
              viewBox="0 0 144 28" 
              fill="none"
              preserveAspectRatio="none"
            >
              <path d="M 0 28 C 30 28 42 0 72 0 C 102 0 114 28 144 28 Z" />
            </svg>
          </div>
        )}

        {/* 5 Navigation Items Grid */}
        <div className="grid grid-cols-5 items-end relative z-10 min-h-[50px]">
          
          {/* 1. Tổng quan (Trang chủ) */}
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
              activeTab === 'dashboard' 
                ? 'text-blue-600 font-bold' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="h-6 flex items-center justify-center">
              <LayoutDashboard className={`h-5 w-5 transition-transform ${activeTab === 'dashboard' ? 'stroke-[2.5] scale-105' : 'stroke-[1.8]'}`} />
            </div>
            <span className={`text-[10.5px] tracking-tight leading-tight mt-1 ${activeTab === 'dashboard' ? 'font-bold' : 'font-medium'}`}>
              Tổng quan
            </span>
          </button>

          {/* 2. Chờ duyệt (Thanh toán / Chờ xử lý) */}
          <button
            type="button"
            onClick={() => setActiveTab('pending-approvals')}
            className={`relative flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
              activeTab === 'pending-approvals' 
                ? 'text-blue-600 font-bold' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="h-6 flex items-center justify-center relative">
              <CheckSquare className={`h-5 w-5 transition-transform ${activeTab === 'pending-approvals' ? 'stroke-[2.5] scale-105' : 'stroke-[1.8]'}`} />
              {pendingMyApprovalCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 px-1 items-center justify-center text-[9px] font-black text-white bg-brand-red rounded-full shadow-md animate-bounce">
                  {pendingMyApprovalCount}
                </span>
              )}
            </div>
            <span className={`text-[10.5px] tracking-tight leading-tight mt-1 ${activeTab === 'pending-approvals' ? 'font-bold' : 'font-medium'}`}>
              Chờ duyệt
            </span>
          </button>

          {/* 3. Nút Nổi Bật Ở Giữa: Trình Ký (Bo tròn theo vòm trên) */}
          {canCreate ? (
            <div className="flex flex-col items-center justify-center relative -top-6 z-20">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="w-13.5 h-13.5 rounded-full bg-gradient-to-b from-blue-400 via-blue-600 to-indigo-700 text-white shadow-[0_6px_18px_rgba(37,99,235,0.4)] flex items-center justify-center active:scale-95 transition-transform cursor-pointer border-[3px] border-white"
                title="Khởi tạo hồ sơ trình ký mới"
              >
                <Plus className="h-8 w-8 stroke-[3] text-white" />
              </button>
              <span className="text-[10.5px] font-bold text-slate-700 mt-1 tracking-tight leading-tight">
                Trình ký
              </span>
            </div>
          ) : (
            <div className="h-6" />
          )}

          {/* 4. Hồ sơ của tôi (Ưu đãi / Hồ sơ tôi) */}
          <button
            type="button"
            onClick={() => setActiveTab('my-documents')}
            className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
              activeTab === 'my-documents' 
                ? 'text-blue-600 font-bold' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="h-6 flex items-center justify-center">
              <FolderGit2 className={`h-5 w-5 transition-transform ${activeTab === 'my-documents' ? 'stroke-[2.5] scale-105' : 'stroke-[1.8]'}`} />
            </div>
            <span className={`text-[10.5px] tracking-tight leading-tight mt-1 ${activeTab === 'my-documents' ? 'font-bold' : 'font-medium'}`}>
              Hồ sơ tôi
            </span>
          </button>

          {/* 5. Menu mở rộng Drawer (Tài khoản / Tất cả) */}
          <button
            type="button"
            onClick={onOpenDrawer}
            className="relative flex flex-col items-center justify-center py-1 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
          >
            <div className="h-6 flex items-center justify-center relative">
              <Menu className="h-5 w-5 stroke-[1.8]" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 px-1 items-center justify-center text-[9px] font-black text-white bg-brand-red rounded-full shadow-md animate-bounce">
                  {unreadNotificationCount}
                </span>
              )}
            </div>
            <span className="text-[10.5px] tracking-tight leading-tight mt-1 font-medium">
              Tất cả
            </span>
          </button>

        </div>

      </div>

    </nav>
  );
};
