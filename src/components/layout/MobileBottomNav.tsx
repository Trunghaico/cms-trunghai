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
      
      {/* Compact Curved Container Wrapper (Solid 100% Opaque White) */}
      <div className="relative bg-white rounded-t-2xl shadow-[0_-4px_16px_rgba(0,0,0,0.06)] border-t border-slate-200/80 px-1 pt-1.5 pb-[max(env(safe-area-inset-bottom,0px),6px)]">
        
        {/* Seamless Center Arch Dome (Bo theo góc vòm ôm trọn nút tròn Trình Ký gọn gàng) */}
        {canCreate && (
          <div className="absolute -top-[19px] left-1/2 -translate-x-1/2 w-28 h-5 pointer-events-none overflow-visible z-0">
            <svg 
              className="w-full h-full text-white fill-white filter drop-shadow-[0_-2px_4px_rgba(0,0,0,0.03)]"
              viewBox="0 0 112 20" 
              fill="#ffffff"
              preserveAspectRatio="none"
            >
              <path d="M 0 20 C 24 20 34 0 56 0 C 78 0 88 20 112 20 Z" fill="#ffffff" />
            </svg>
          </div>
        )}

        {/* 5 Navigation Items Grid */}
        <div className="grid grid-cols-5 items-end relative z-10 min-h-[44px]">
          
          {/* 1. Tổng quan (Trang chủ) */}
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center py-0.5 transition-all cursor-pointer ${
              activeTab === 'dashboard' 
                ? 'text-blue-600 font-bold' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="h-5 flex items-center justify-center">
              <LayoutDashboard className={`h-4.5 w-4.5 transition-transform ${activeTab === 'dashboard' ? 'stroke-[2.5] scale-105' : 'stroke-[1.8]'}`} />
            </div>
            <span className={`text-[10px] tracking-tight leading-none mt-1 ${activeTab === 'dashboard' ? 'font-bold' : 'font-medium'}`}>
              Tổng quan
            </span>
          </button>

          {/* 2. Chờ duyệt (Thanh toán / Chờ xử lý) */}
          <button
            type="button"
            onClick={() => setActiveTab('pending-approvals')}
            className={`relative flex flex-col items-center justify-center py-0.5 transition-all cursor-pointer ${
              activeTab === 'pending-approvals' 
                ? 'text-blue-600 font-bold' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="h-5 flex items-center justify-center relative">
              <CheckSquare className={`h-4.5 w-4.5 transition-transform ${activeTab === 'pending-approvals' ? 'stroke-[2.5] scale-105' : 'stroke-[1.8]'}`} />
              {pendingMyApprovalCount > 0 && (
                <span className="absolute -top-1 -right-2 flex h-3.5 min-w-3.5 px-0.5 items-center justify-center text-[8.5px] font-black text-white bg-brand-red rounded-full shadow-xs animate-bounce">
                  {pendingMyApprovalCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] tracking-tight leading-none mt-1 ${activeTab === 'pending-approvals' ? 'font-bold' : 'font-medium'}`}>
              Chờ duyệt
            </span>
          </button>

          {/* 3. Nút Nổi Bật Ở Giữa: Trình Ký (Bo tròn theo vòm trên gọn gàng) */}
          {canCreate ? (
            <div className="flex flex-col items-center justify-center relative -top-4.5 z-20">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="w-11.5 h-11.5 rounded-full bg-gradient-to-b from-blue-500 via-blue-600 to-indigo-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.35)] flex items-center justify-center active:scale-95 transition-transform cursor-pointer border-[2.5px] border-white"
                title="Khởi tạo hồ sơ trình ký mới"
              >
                <Plus className="h-6.5 w-6.5 stroke-[2.8] text-white" />
              </button>
              <span className="text-[10px] font-bold text-slate-700 mt-1 tracking-tight leading-none">
                Trình ký
              </span>
            </div>
          ) : (
            <div className="h-5" />
          )}

          {/* 4. Hồ sơ của tôi (Ưu đãi / Hồ sơ tôi) */}
          <button
            type="button"
            onClick={() => setActiveTab('my-documents')}
            className={`flex flex-col items-center justify-center py-0.5 transition-all cursor-pointer ${
              activeTab === 'my-documents' 
                ? 'text-blue-600 font-bold' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="h-5 flex items-center justify-center">
              <FolderGit2 className={`h-4.5 w-4.5 transition-transform ${activeTab === 'my-documents' ? 'stroke-[2.5] scale-105' : 'stroke-[1.8]'}`} />
            </div>
            <span className={`text-[10px] tracking-tight leading-none mt-1 ${activeTab === 'my-documents' ? 'font-bold' : 'font-medium'}`}>
              Hồ sơ tôi
            </span>
          </button>

          {/* 5. Menu mở rộng Drawer (Tài khoản / Tất cả) */}
          <button
            type="button"
            onClick={onOpenDrawer}
            className="relative flex flex-col items-center justify-center py-0.5 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
          >
            <div className="h-5 flex items-center justify-center relative">
              <Menu className="h-4.5 w-4.5 stroke-[1.8]" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-2 flex h-3.5 min-w-3.5 px-0.5 items-center justify-center text-[8.5px] font-black text-white bg-brand-red rounded-full shadow-xs animate-bounce">
                  {unreadNotificationCount}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight leading-none mt-1 font-medium">
              Tất cả
            </span>
          </button>

        </div>

      </div>

    </nav>
  );
};
