import React, { useMemo } from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Plus, 
  FolderGit2, 
  Menu,
  FileCheck2,
  Clock
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-2xl border-t border-slate-200/90 shadow-[0_-4px_25px_rgba(0,0,0,0.06)] px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom,0px),10px)] flex items-center justify-around select-none">
      
      {/* 1. Trang chủ */}
      <button
        type="button"
        onClick={() => setActiveTab('dashboard')}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
          activeTab === 'dashboard' 
            ? 'text-brand-blue font-bold' 
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div className={`p-1 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-blue-50' : ''}`}>
          <LayoutDashboard className="h-5 w-5" />
        </div>
        <span className="text-[10px] mt-0.5 font-semibold">Tổng quan</span>
      </button>

      {/* 2. Chờ tôi duyệt (Pending) */}
      <button
        type="button"
        onClick={() => setActiveTab('pending-approvals')}
        className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
          activeTab === 'pending-approvals' 
            ? 'text-brand-blue font-bold' 
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div className={`relative p-1 rounded-xl transition-all ${activeTab === 'pending-approvals' ? 'bg-blue-50' : ''}`}>
          <CheckSquare className="h-5 w-5" />
          {pendingMyApprovalCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center text-[9px] font-black text-white bg-brand-red rounded-full shadow-md animate-bounce">
              {pendingMyApprovalCount}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-0.5 font-semibold">Chờ duyệt</span>
      </button>

      {/* 3. Nút Nổi Bật Ở Giữa: Trình Ký Mới (+ Form) */}
      {canCreate && (
        <div className="-mt-6 flex flex-col items-center">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="w-13 h-13 rounded-full bg-gradient-to-tr from-brand-blue via-indigo-600 to-cyan-500 text-white shadow-[0_8px_20px_rgba(62,64,149,0.4)] flex items-center justify-center active:scale-95 transition-transform cursor-pointer border-3 border-white ring-2 ring-indigo-500/20"
            title="Khởi tạo hồ sơ trình ký mới"
          >
            <Plus className="h-6 w-6 stroke-[2.5]" />
          </button>
          <span className="text-[9.5px] font-extrabold text-brand-blue mt-1 uppercase tracking-tight">Trình Ký</span>
        </div>
      )}

      {/* 4. Hồ sơ của tôi */}
      <button
        type="button"
        onClick={() => setActiveTab('my-documents')}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
          activeTab === 'my-documents' 
            ? 'text-brand-blue font-bold' 
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div className={`p-1 rounded-xl transition-all ${activeTab === 'my-documents' ? 'bg-blue-50' : ''}`}>
          <FolderGit2 className="h-5 w-5" />
        </div>
        <span className="text-[10px] mt-0.5 font-semibold">Hồ sơ tôi</span>
      </button>

      {/* 5. Menu mở rộng Drawer */}
      <button
        type="button"
        onClick={onOpenDrawer}
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
      >
        <div className="p-1 rounded-xl">
          <Menu className="h-5 w-5" />
        </div>
        <span className="text-[10px] mt-0.5 font-semibold">Tất cả</span>
      </button>

    </nav>
  );
};
