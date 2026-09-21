import React, { useState } from 'react';
import { WORKFLOW_TEMPLATES } from '../../lib/initialData';
import { 
  GitFork, 
  Clock, 
  Shield, 
  CheckCircle2, 
  ArrowRight, 
  Plus, 
  Settings, 
  Layers,
  Building2,
  FileCheck2,
  UserCheck
} from 'lucide-react';
import { useDocument } from '../../context/DocumentContext';

export const WorkflowConfigView: React.FC = () => {
  const [selectedWorkflow, setSelectedWorkflow] = useState(WORKFLOW_TEMPLATES[0]);
  const { setIsCreateModalOpen } = useDocument();

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <GitFork className="h-5 w-5 text-brand-blue" />
            <span>Quản Lý Quy Trình Trình Ký (BPM Workflow Engine)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cấu hình các bước phê duyệt đa cấp, thẩm quyền ký và hạn mức thời gian xử lý (SLA)
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-xs font-bold uppercase tracking-wider rounded-[3px] shadow transition-all flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>Áp Dụng Trình Ký</span>
        </button>
      </div>

      {/* Grid: Template Selector + Visual Workflow Diagram */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Template List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Danh Mục Quy Trình Chuẩn
          </h3>

          {WORKFLOW_TEMPLATES.map((tpl) => {
            const isSelected = tpl.id === selectedWorkflow.id;
            return (
              <div
                key={tpl.id}
                onClick={() => setSelectedWorkflow(tpl)}
                className={`p-4 bg-white border rounded-[3px] cursor-pointer transition-all ${
                  isSelected
                    ? 'border-brand-blue ring-1 ring-brand-blue shadow-md bg-blue-50/20'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-bold text-brand-red uppercase px-2 py-0.5 bg-brand-red/10 rounded-[3px]">
                    {tpl.category}
                  </span>
                  <span className="text-xs font-bold text-slate-500 font-mono">
                    {tpl.steps.length} Bước
                  </span>
                </div>

                <h4 className="text-xs font-bold text-slate-900 mt-2 line-clamp-2">
                  {tpl.name}
                </h4>

                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                  {tpl.description}
                </p>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-brand-blue">
                  <span>Xem sơ đồ luân chuyển</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Right 2 Columns: Visual Workflow Step Routing */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-5 rounded-[3px] border border-slate-200 shadow-card">
            
            <div className="border-b border-slate-200 pb-4 mb-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-1 bg-brand-blue text-white rounded-[3px]">
                  {selectedWorkflow.category}
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  Tổng thời gian SLA cam kết: {selectedWorkflow.steps.reduce((sum, s) => sum + s.slaHours, 0)} Giờ
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-2">
                {selectedWorkflow.name}
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                {selectedWorkflow.description}
              </p>
            </div>

            {/* Stepper Diagram */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Sơ Đồ Các Cấp Phê Duyệt Tuần Tự
              </h4>

              <div className="relative border-l-2 border-brand-blue/40 ml-4 pl-6 space-y-6 py-2">
                {selectedWorkflow.steps.map((step, idx) => (
                  <div key={idx} className="relative group">
                    {/* Node Dot */}
                    <div className="absolute -left-[31px] top-1.5 h-6 w-6 rounded-full bg-white border-2 border-brand-blue flex items-center justify-center text-[11px] font-black text-brand-blue shadow-sm">
                      {step.order}
                    </div>

                    <div className="p-4 bg-slate-50 hover:bg-blue-50/40 border border-slate-200 group-hover:border-brand-blue/40 rounded-[3px] transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-bold text-slate-900">
                              Bước {step.order}: {step.title}
                            </h5>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[11px]">
                            <span className="font-semibold text-brand-blue flex items-center gap-1">
                              <UserCheck className="h-3.5 w-3.5" />
                              {step.roleTitle}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500 flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5" />
                              {step.department}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-[3px] text-[11px] font-bold flex items-center gap-1">
                            <Clock className="h-3 w-3 text-amber-600" />
                            SLA: {step.slaHours} giờ
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
