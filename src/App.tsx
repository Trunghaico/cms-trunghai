import React from 'react';
import { DocumentProvider, useDocument } from './context/DocumentContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { DocumentTable } from './components/documents/DocumentTable';
import { WorkflowConfigView } from './components/workflow/WorkflowConfigView';
import { DMSStorageView } from './components/dms/DMSStorageView';
import { CreateDocumentModal } from './components/documents/CreateDocumentModal';
import { DocumentDetailModal } from './components/documents/DocumentDetailModal';
import { UserManagementView } from './components/users/UserManagementView';
import { LoginPage } from './components/auth/LoginPage';

const AppContent: React.FC = () => {
  const { activeTab, isAuthenticated } = useDocument();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'my-documents':
        return (
          <DocumentTable
            filterType="MY_DOCS"
            title="Hồ Sơ Của Tôi"
            subtitle="Danh sách các hồ sơ, hợp đồng và tờ trình do bạn lập & theo dõi tiến trình phê duyệt"
          />
        );
      case 'pending-approvals':
        return (
          <DocumentTable
            filterType="PENDING_MY_APPROVAL"
            title="Hồ Sơ Cần Tôi Phê Duyệt"
            subtitle="Danh sách các văn bản đang chờ bạn thẩm định, ký số điện tử hoặc cho ý kiến"
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
      case 'workflow-templates':
        return <WorkflowConfigView />;
      case 'dms-repository':
        return <DMSStorageView />;
      case 'users':
        return <UserManagementView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header - Fixed & Sticky */}
      <Header />

      {/* Main Layout: Fixed Compact Sidebar (w-56) on Left + Scrollable Content on Right (pl-56) */}
      <div className="flex-1 flex">
        {/* Left Fixed Sidebar */}
        <Sidebar />

        {/* Right Main Content Area with pl-56 offset */}
        <main className="flex-1 pl-56 min-w-0">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full animate-fade-in">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Global Modals */}
      <CreateDocumentModal />
      <DocumentDetailModal />
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
