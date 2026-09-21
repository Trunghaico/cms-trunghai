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
    setIsCreateModalOpen 
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
      <div className="relative overflow-hidden bg-gradient-to-r from-brand-blue via-[#32347a] to-brand-blue-dark text-white p-6 rounded-[3px] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 border border-brand-blue/30">
        
        {/* Background glow circle */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-brand-red/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 bg-white/20 backdrop-blur-xs text-white text-[10px] font-bold uppercase tracking-wider rounded-[3px] shadow-xs flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-300" />
              TRUNG HAI WORKFLOW
            </span>
            <span className="text-xs text-white/80">Hệ thống Trình ký Điện tử</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight">
            Xin chào, {activeUser.name}
          </h1>
          <p className="text-xs text-blue-100/90 mt-1 max-w-xl leading-relaxed">
            {pendingForMe.length > 0 
              ? `Bạn đang có ${pendingForMe.length} hồ sơ cần phê duyệt hoặc ký số điện tử. Vui lòng kiểm tra và xử lý kịp thời hạn SLA.`
              : 'Hiện tại bạn không có hồ sơ nào bị tồn đọng cần phê duyệt. Chúc bạn một ngày làm việc hiệu quả!'}
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          {pendingForMe.length > 0 && (
            <button
              onClick={() => setActiveTab('pending-approvals')}
              className="px-4 py-2.5 bg-brand-red hover:bg-brand-red-dark text-white text-xs font-bold uppercase tracking-wider rounded-[3px] shadow-lg hover:shadow-glow-red transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 animate-bounce"
            >
              <FileSignature className="h-4 w-4" />
              <span>Duyệt Ngay ({pendingForMe.length})</span>
            </button>
          )}

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-brand-blue hover:text-brand-blue-dark text-xs font-bold uppercase tracking-wider rounded-[3px] shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
          >
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
          iconColor="text-brand-blue"
          bgColor="bg-brand-blue-light"
          onClick={() => setActiveTab('all-documents')}
        />

        <StatCard
          title="Hồ sơ quá hạn SLA"
          value={stats.overdueCount}
          subtitle="Cần can thiệp & nhắc nhở"
          icon={AlertCircle}
          iconColor="text-brand-red"
          bgColor="bg-brand-red-light"
          borderColor={stats.overdueCount > 0 ? 'border-brand-red/60 ring-1 ring-brand-red/20' : 'border-slate-200'}
          onClick={() => setActiveTab('report-sla')}
          urgentBadge={stats.overdueCount > 0}
        />

        <StatCard
          title="Chờ tôi duyệt"
          value={stats.myPendingApprovalsCount}
          subtitle="Đang chờ bạn thẩm định/ký"
          icon={FileSignature}
          iconColor="text-amber-600"
          bgColor="bg-amber-50"
          borderColor={stats.myPendingApprovalsCount > 0 ? 'border-amber-500 ring-1 ring-amber-400/30' : 'border-slate-200'}
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
      <div className="bg-white p-5 rounded-[3px] border border-slate-200 shadow-card">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-brand-blue-light text-brand-blue rounded-[3px]">
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Lối Tắt Truy Cập Nhanh Hồ Sơ Gần Đây</h3>
              <p className="text-[11px] text-slate-500">Các hồ sơ vừa được tạo hoặc cập nhật gần nhất trong hệ thống</p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('all-documents')}
            className="text-xs font-bold text-brand-blue hover:text-brand-blue-dark flex items-center gap-1 hover:underline"
          >
            <span>Xem tất cả hồ sơ</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {documents.slice(0, 4).map((doc) => {
            const isApproved = doc.status === 'APPROVED';
            const isRejected = doc.status === 'REJECTED';
            const isAddReq = doc.status === 'ADDITIONAL_REQ';
            return (
              <div
                key={doc.id}
                onClick={() => setSelectedDocument(doc)}
                className="p-3.5 rounded-[3px] border border-slate-200 bg-slate-50/50 hover:bg-blue-50/30 hover:border-brand-blue/50 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-black text-brand-blue group-hover:underline">
                      {doc.code}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] ${
                      isApproved ? 'bg-emerald-100 text-emerald-800' :
                      isRejected ? 'bg-red-100 text-red-800' :
                      isAddReq ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-brand-blue'
                    }`}>
                      {isApproved ? 'Hoàn tất' : isRejected ? 'Từ chối' : isAddReq ? 'Bổ sung' : 'Đang xử lý'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 line-clamp-2 mb-2 group-hover:text-brand-blue transition-colors">
                    {doc.title}
                  </h4>
                </div>
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
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
        <div className="bg-white rounded-[3px] border border-brand-red/40 shadow-card hover:shadow-elevated transition-shadow duration-200 overflow-hidden">
          <div className="px-5 py-3.5 bg-gradient-to-r from-brand-red-light/80 to-red-50/40 border-b border-brand-red/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-red animate-ping" />
              <h3 className="text-sm font-bold text-brand-red-dark">
                Danh Sách Hồ Sơ Đang Chờ Bạn Ký Duyệt ({pendingForMe.length})
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('pending-approvals')}
              className="text-xs font-bold text-brand-blue hover:text-brand-blue-dark hover:underline flex items-center gap-1 transition-colors"
            >
              <span>Xem phân hệ duyệt</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Số Hiệu / Trích Yếu</th>
                  <th className="px-4 py-3">Người Trình / Phòng Ban</th>
                  <th className="px-4 py-3">Bước Của Bạn</th>
                  <th className="px-4 py-3">Giá Trị (VNĐ)</th>
                  <th className="px-4 py-3">Mức Độ</th>
                  <th className="px-4 py-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingForMe.map((doc) => {
                  const currentStep = doc.steps[doc.currentStepIndex];
                  return (
                    <tr key={doc.id} className="hover:bg-blue-50/40 transition-colors duration-150 group">
                      <td className="px-4 py-3">
                        <div className="font-bold text-brand-blue group-hover:underline cursor-pointer" onClick={() => setSelectedDocument(doc)}>
                          {doc.code}
                        </div>
                        <div className="text-slate-700 font-medium line-clamp-1 max-w-md">
                          {doc.title}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{doc.creatorName}</p>
                        <p className="text-[11px] text-slate-500">{doc.department}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-900 font-bold text-[10px] rounded-[3px] border border-amber-300">
                          Bước {doc.currentStepIndex + 1}: {currentStep?.title}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800 font-mono">
                        {formatCurrency(doc.amount)}
                      </td>
                      <td className="px-4 py-3">
                        {doc.priority === 'VERY_URGENT' ? (
                          <span className="px-2 py-0.5 bg-brand-red text-white text-[10px] font-bold rounded-[3px] shadow-xs">
                            Hỏa tốc
                          </span>
                        ) : doc.priority === 'URGENT' ? (
                          <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-[3px]">
                            Khẩn
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-[3px]">
                            Thường
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedDocument(doc)}
                          className="px-3 py-1.5 bg-brand-blue hover:bg-brand-blue-dark text-white font-bold text-xs rounded-[3px] transition-all duration-150 transform hover:-translate-y-0.5 active:translate-y-0 shadow-sm"
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
