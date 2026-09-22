import React from 'react';
import { useDocument } from '../../context/DocumentContext';
import { StatCard } from './StatCard';
import { WorkflowSLAChart } from './WorkflowSLAChart';
import { RecentActivity } from './RecentActivity';
import { 
  FileCheck, 
  Clock, 
  AlertCircle, 
  FileText, 
  Flame, 
  Plus, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileSignature,
  Sparkles
} from 'lucide-react';
import { formatDate, formatCurrency } from '../../lib/storage';
import { isUserApproverForStep } from '../../lib/permissions';

export const DashboardView: React.FC = () => {
  const { 
    stats, 
    activeUser, 
    documents, 
    setSelectedDocument, 
    setActiveTab, 
    setIsCreateModalOpen,
    hasPermission 
  } = useDocument();

  if (!activeUser) return null;

  // Hồ sơ cần người dùng hiện tại xử lý ngay
  const pendingForMe = documents.filter(doc => {
    if (doc.status === 'APPROVED' || doc.status === 'REJECTED' || doc.status === 'ADDITIONAL_REQ') return false;
    const currentStep = doc.steps[doc.currentStepIndex];
    if (!currentStep || currentStep.status !== 'CURRENT') return false;
    return isUserApproverForStep(activeUser, currentStep);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Banner with Welcome & Quick Action */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-brand-blue-dark text-white p-7 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 border border-indigo-500/30">
        
        {/* Background ambient AI glow */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -top-10 w-48 h-48 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-white/10 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider rounded-full border border-white/15 shadow-xs flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-cyan-300 animate-pulse" />
              <span>TRUNG HAI AI APPROVAL</span>
            </span>
            <span className="text-xs text-indigo-200">Hệ thống Trình ký Điện tử Thế hệ mới</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
            Xin chào, {activeUser.name}
          </h1>
          <p className="text-xs text-slate-300/90 mt-1.5 max-w-xl leading-relaxed">
            {pendingForMe.length > 0 
              ? `Bạn đang có ${pendingForMe.length} hồ sơ cần phê duyệt hoặc ký số điện tử. Vui lòng kiểm tra và xử lý kịp thời hạn SLA.`
              : 'Hiện tại bạn không có hồ sơ nào bị tồn đọng cần phê duyệt. Hệ thống AI đang liên tục giám sát tiến độ luân chuyển!'}
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          {pendingForMe.length > 0 && (
            <button
              onClick={() => setActiveTab('pending-approvals')}
              className="px-4.5 py-2.5 bg-gradient-to-r from-brand-red to-red-600 hover:from-red-600 hover:to-brand-red text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(237,50,55,0.4)] hover:shadow-[0_0_25px_rgba(237,50,55,0.6)] transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 cursor-pointer"
            >
              <FileSignature className="h-4 w-4" />
              <span>Duyệt Ngay ({pendingForMe.length})</span>
            </button>
          )}

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4.5 py-2.5 bg-white hover:bg-slate-100 text-brand-blue hover:text-indigo-900 text-xs font-bold uppercase tracking-wider rounded-xl shadow-md hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Tạo Trình Ký Mới</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Hồ sơ đang mở"
          value={stats.inProgress + stats.pending}
          subtitle="Đang trong các bước duyệt"
          icon={Clock}
          iconColor="text-indigo-600"
          bgColor="bg-indigo-50"
          onClick={() => setActiveTab('all-documents')}
        />

        <StatCard
          title="Hồ sơ quá hạn SLA"
          value={stats.overdueCount}
          subtitle="Cần can thiệp & nhắc nhở"
          icon={AlertCircle}
          iconColor="text-brand-red"
          bgColor="bg-red-50"
          borderColor={stats.overdueCount > 0 ? 'border-red-400/60 ring-2 ring-red-400/20' : 'border-slate-200'}
          onClick={() => (hasPermission('report.sla') || activeUser.role === 'ADMIN') ? setActiveTab('report-sla') : setActiveTab('all-documents')}
          urgentBadge={stats.overdueCount > 0}
        />

        <StatCard
          title="Chờ tôi duyệt"
          value={stats.myPendingApprovalsCount}
          subtitle="Đang chờ bạn thẩm định/ký"
          icon={FileSignature}
          iconColor="text-amber-600"
          bgColor="bg-amber-50"
          borderColor={stats.myPendingApprovalsCount > 0 ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200'}
          onClick={() => setActiveTab('pending-approvals')}
          urgentBadge={stats.myPendingApprovalsCount > 0}
        />

        <StatCard
          title="Hồ sơ đã hoàn tất"
          value={stats.approved}
          subtitle="Đã duyệt & lưu kho DMS"
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          bgColor="bg-emerald-50"
          onClick={() => setActiveTab('dms-archive')}
        />
      </div>

      {/* Lối tắt truy cập nhanh vào các hồ sơ gần đây */}
      <div className="bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200/90 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Lối Tắt Truy Cập Nhanh Hồ Sơ Gần Đây</h3>
              <p className="text-[11px] text-slate-500">Các hồ sơ vừa được tạo hoặc cập nhật gần nhất trong hệ thống</p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('all-documents')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>Xem tất cả hồ sơ</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {documents.slice(0, 4).map((doc) => {
            const isApproved = doc.status === 'APPROVED';
            const isRejected = doc.status === 'REJECTED';
            const isAddReq = doc.status === 'ADDITIONAL_REQ';
            return (
              <div
                key={doc.id}
                onClick={() => setSelectedDocument(doc)}
                className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-indigo-50/40 hover:border-indigo-300/80 hover:shadow-ai-card transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-black text-indigo-700 group-hover:underline">
                      {doc.code}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isApproved ? 'bg-emerald-100 text-emerald-800' :
                      isRejected ? 'bg-red-100 text-red-800' :
                      isAddReq ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {isApproved ? 'Hoàn tất' : isRejected ? 'Từ chối' : isAddReq ? 'Bổ sung' : 'Đang xử lý'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 line-clamp-2 mb-2 group-hover:text-indigo-700 transition-colors">
                    {doc.title}
                  </h4>
                </div>
                <div className="pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate max-w-[110px] font-medium">{doc.department}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{formatDate(doc.updatedAt || doc.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Urgent Action Table: Hồ sơ cần tôi duyệt ngay */}
      {pendingForMe.length > 0 && (
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-red-200 shadow-card hover:shadow-elevated transition-shadow duration-200 overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-red-50 to-orange-50/40 border-b border-red-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-red animate-ping" />
              <h3 className="text-sm font-bold text-red-900">
                Danh Sách Hồ Sơ Đang Chờ Bạn Ký Duyệt ({pendingForMe.length})
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('pending-approvals')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Xem phân hệ duyệt</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Số Hiệu / Trích Yếu</th>
                  <th className="px-4 py-3.5">Người Trình / Phòng Ban</th>
                  <th className="px-4 py-3.5">Bước Của Bạn</th>
                  <th className="px-4 py-3.5">Giá Trị (VNĐ)</th>
                  <th className="px-4 py-3.5">Mức Độ</th>
                  <th className="px-4 py-3.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingForMe.map((doc) => {
                  const currentStep = doc.steps[doc.currentStepIndex];
                  return (
                    <tr key={doc.id} className="hover:bg-indigo-50/40 transition-colors duration-150 group">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-indigo-700 group-hover:underline cursor-pointer" onClick={() => setSelectedDocument(doc)}>
                          {doc.code}
                        </div>
                        <div className="text-slate-700 font-medium line-clamp-1 max-w-md">
                          {doc.title}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-800">{doc.creatorName}</p>
                        <p className="text-[11px] text-slate-500">{doc.department}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-block px-2.5 py-0.5 bg-amber-100 text-amber-900 font-bold text-[10px] rounded-full border border-amber-200">
                          Bước {doc.currentStepIndex + 1}: {currentStep?.title}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800 font-mono">
                        {formatCurrency(doc.amount)}
                      </td>
                      <td className="px-4 py-3.5">
                        {doc.priority === 'VERY_URGENT' ? (
                          <span className="px-2.5 py-0.5 bg-brand-red text-white text-[10px] font-bold rounded-full shadow-xs">
                            Hỏa tốc
                          </span>
                        ) : doc.priority === 'URGENT' ? (
                          <span className="px-2.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                            Khẩn
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-full">
                            Thường
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedDocument(doc)}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-brand-blue to-indigo-600 hover:from-indigo-600 hover:to-brand-blue text-white font-bold text-xs rounded-xl transition-all duration-150 transform hover:-translate-y-0.5 active:translate-y-0 shadow-xs cursor-pointer"
                        >
                          Ký Duyệt
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BPM Workflow Analytics & Chart */}
      <WorkflowSLAChart />

      {/* Audit Activity Trail */}
      <RecentActivity />

    </div>
  );
};
