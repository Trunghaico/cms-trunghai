import React, { useState } from 'react';
import { DocumentProvider, useDocument } from './context/DocumentContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { MobileDrawer } from './components/layout/MobileDrawer';
import { PWAInstallPrompt } from './components/common/PWAInstallPrompt';
import { DashboardView } from './components/dashboard/DashboardView';
import { DocumentTable } from './components/documents/DocumentTable';
import { WorkflowConfigView } from './components/workflow/WorkflowConfigView';
import { DMSStorageView } from './components/dms/DMSStorageView';
import { CreateDocumentModal } from './components/documents/CreateDocumentModal';
import { DocumentDetailModal } from './components/documents/DocumentDetailModal';
import { UserProfileModal } from './components/users/UserProfileModal';
import { UserManagementView } from './components/users/UserManagementView';
import { SystemSettingsView } from './components/settings/SystemSettingsView';
import { SLAReportView } from './components/reports/SLAReportView';
import { DocumentAnalyticsView } from './components/reports/DocumentAnalyticsView';
import { AuditLogView } from './components/audit/AuditLogView';
import { LoginPage } from './components/auth/LoginPage';

const AppContent: React.FC = () => {
  const { activeTab, isAuthenticated, hasPermission, activeUser } = useDocument();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      
      // KHỐI 1: TỔNG QUAN & HỒ SƠ
      case 'my-documents':
        return (
          <DocumentTable
            filterType="MY_DOCS"
            title="Hồ Sơ Của Tôi"
            subtitle="Danh sách các hồ sơ do chính bạn lập và phụ trách theo dõi luân chuyển"
          />
        );
      case 'received-documents':
        return (
          <DocumentTable
            filterType="RECEIVED"
            title="Hồ Sơ Tiếp Nhận / Chờ Xử Lý"
            subtitle="Danh sách hồ sơ chuyển đến phòng ban cần thẩm định, phân loại hoặc giao việc"
          />
        );
      case 'all-documents':
        return (
          <DocumentTable
            filterType="ALL"
            title="Tất Cả Hồ Sơ Trình Ký"
            subtitle="Toàn bộ cơ sở dữ liệu hồ sơ và tình trạng luân chuyển trong toàn công ty"
          />
        );
      case 'dms-archive':
        return (
          <DocumentTable
            filterType="ARCHIVE"
            title="Kho Lưu Trữ Hồ Sơ Số (DMS)"
            subtitle="Các hồ sơ, văn bản, hợp đồng đã hoàn tất phê duyệt và lưu trữ lịch sử"
          />
        );
      case 'pending-approvals':
        return (
          <DocumentTable
            filterType="PENDING_MY_APPROVAL"
            title="Chờ Tôi Duyệt"
            subtitle="Gom tất cả các phiếu trình, hồ sơ cần bạn ký số hoặc bấm duyệt"
          />
        );
      case 'my-approved-history':
        return (
          <DocumentTable
            filterType="MY_APPROVED_HISTORY"
            title="Hồ Sơ Tôi Đã Duyệt"
            subtitle="Lịch sử các văn bản bạn đã từng tham gia ký số hoặc phê duyệt"
          />
        );

      // KHỐI 2: DỮ LIỆU & BÁO CÁO (Bảo vệ phân quyền từng mục)
      case 'report-sla':
        if (!hasPermission('report.sla') && activeUser?.role !== 'ADMIN') {
          return <DashboardView />;
        }
        return <SLAReportView />;
      case 'report-analytics':
        if (!hasPermission('report.analytics') && activeUser?.role !== 'ADMIN') {
          return <DashboardView />;
        }
        return <DocumentAnalyticsView />;
      case 'audit-logs':
        if (!hasPermission('system.audit_log') && activeUser?.role !== 'ADMIN') {
          return <DashboardView />;
        }
        return <AuditLogView />;

      // KHỐI 3: THIẾT LẬP HỆ THỐNG & DANH MỤC (Bảo vệ phân quyền)
      case 'settings-categories':
      case 'settings':
        if (!hasPermission('category.view') && !hasPermission('category.manage') && activeUser?.role !== 'ADMIN') {
          return <DashboardView />;
        }
        return <SystemSettingsView />;
      case 'workflow-config':
      case 'workflow-templates':
        if (!hasPermission('workflow.manage') && activeUser?.role !== 'ADMIN') {
          return <DashboardView />;
        }
        return <WorkflowConfigView />;
      case 'user-management':
      case 'users':
        if (!hasPermission('user.view') && !hasPermission('user.create') && !hasPermission('user.edit') && activeUser?.role !== 'ADMIN') {
          return <DashboardView />;
        }
        return <UserManagementView />;
      case 'dms-repository':
        return <DMSStorageView />;

      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header - Fixed & Sticky */}
      <Header onOpenDrawer={() => setIsMobileDrawerOpen(true)} />

      {/* Main Layout: Fixed Compact Sidebar (w-60) on Left + Scrollable Content on Right (pl-0 on mobile, pl-60 on desktop) */}
      <div className="flex-1 flex">
        {/* Left Fixed Sidebar (Hidden on mobile < md) */}
        <Sidebar />

        {/* Right Main Content Area */}
        <main className="flex-1 pl-0 md:pl-60 min-w-0 pb-20 md:pb-8">
          <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full animate-fade-in">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (< md) */}
      <MobileBottomNav onOpenDrawer={() => setIsMobileDrawerOpen(true)} />

      {/* Mobile Slide Drawer Menu */}
      <MobileDrawer 
        isOpen={isMobileDrawerOpen} 
        onClose={() => setIsMobileDrawerOpen(false)} 
      />

      {/* PWA 1-Tap Install & Web Push Prompt */}
      <PWAInstallPrompt />

      {/* Global Modals */}
      <CreateDocumentModal />
      <DocumentDetailModal />
      <UserProfileModal />
    </div>
  );
};

export function App() {
  return (
    <DocumentProvider>
      <AppContent />
    </DocumentProvider>
  );
}

export default App;
