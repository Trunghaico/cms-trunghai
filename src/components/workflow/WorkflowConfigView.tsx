import React, { useState, useMemo } from 'react';
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
  UserCheck,
  Edit3,
  Trash2,
  Copy,
  RotateCcw,
  Search,
  Filter,
  Check,
  X,
  AlertCircle,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Info
} from 'lucide-react';
import { useDocument } from '../../context/DocumentContext';
import { WorkflowTemplate, WorkflowStep, UserRole, OverdueAction } from '../../types';

export const WorkflowConfigView: React.FC = () => {
  const { 
    workflowTemplates, 
    createWorkflowTemplate, 
    updateWorkflowTemplate, 
    deleteWorkflowTemplate, 
    resetWorkflowTemplatesToDefault,
    departments,
    jobTitles,
    hasPermission,
    activeUser,
    setIsCreateModalOpen 
  } = useDocument();

  const canManage = hasPermission('workflow.manage') || activeUser?.role === 'ADMIN';

  // Active Selected Workflow
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(() => {
    return workflowTemplates[0]?.id || '';
  });

  const selectedWorkflow = useMemo(() => {
    return workflowTemplates.find(w => w.id === selectedWorkflowId) || workflowTemplates[0] || null;
  }, [workflowTemplates, selectedWorkflowId]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Categories list
  const allCategories = useMemo(() => {
    const cats = Array.from(new Set(workflowTemplates.map(w => w.category).filter(Boolean)));
    return ['ALL', ...cats];
  }, [workflowTemplates]);

  // Filtered Templates
  const filteredTemplates = useMemo(() => {
    return workflowTemplates.filter(w => {
      const matchSearch = !searchQuery.trim() || 
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        w.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = selectedCategoryFilter === 'ALL' || w.category === selectedCategoryFilter;
      return matchSearch && matchCategory;
    });
  }, [workflowTemplates, searchQuery, selectedCategoryFilter]);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkflowTemplate | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    category: string;
    customCategory: string;
    description: string;
    steps: WorkflowStep[];
  }>({
    name: '',
    category: 'Hợp đồng kinh tế',
    customCategory: '',
    description: '',
    steps: []
  });

  // Modal State for Delete Confirmation
  const [deletingTemplate, setDeletingTemplate] = useState<WorkflowTemplate | null>(null);
  const [modalError, setModalError] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Standard category presets
  const standardCategories = [
    'Hợp đồng kinh tế',
    'Tờ trình phê duyệt',
    'Đề xuất thanh toán',
    'Biên bản nghiệm thu',
    'Văn bản nội bộ',
    'Hồ sơ đấu thầu & Dự toán',
    'Tài liệu kỹ thuật & Thiết kế',
    '__CUSTOM__'
  ];

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingTemplate(null);
    const firstDept = departments[0]?.name || 'Phòng Kỹ thuật & Dự án';
    const firstDeptObj = departments.find(d => d.name === firstDept);
    setFormData({
      name: '',
      category: 'Hợp đồng kinh tế',
      customCategory: '',
      description: '',
      steps: [
        {
          order: 1,
          title: 'Kiểm tra & Rà soát nội dung',
          role: 'DEPT_HEAD',
          roleTitle: 'Trưởng phòng Bộ phận',
          department: firstDept,
          slaHours: firstDeptObj?.defaultSlaHours || 8,
          overdueAction: firstDeptObj?.defaultOverdueAction || 'WARN_AND_RETURN',
          isInternalCheck: false
        },
        {
          order: 2,
          title: 'Phê duyệt & Ký số quyết định',
          role: 'DIRECTOR',
          roleTitle: 'Tổng Giám đốc',
          department: 'Ban Giám đốc',
          slaHours: 24,
          overdueAction: 'WARN_AND_RETURN',
          isInternalCheck: false
        }
      ]
    });
    setModalError('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (tpl: WorkflowTemplate, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTemplate(tpl);
    const isStandard = standardCategories.includes(tpl.category);
    setFormData({
      name: tpl.name,
      category: isStandard ? tpl.category : '__CUSTOM__',
      customCategory: isStandard ? '' : tpl.category,
      description: tpl.description || '',
      steps: tpl.steps.map(s => ({ ...s }))
    });
    setModalError('');
    setIsModalOpen(true);
  };

  // Duplicate Template
  const handleDuplicate = (tpl: WorkflowTemplate, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const res = createWorkflowTemplate({
      name: `${tpl.name} (Bản sao)`,
      category: tpl.category,
      description: tpl.description,
      steps: tpl.steps.map(s => ({ ...s }))
    });
    if (res.success && res.template) {
      setSelectedWorkflowId(res.template.id);
      showToast(`Đã nhân bản quy trình "${res.template.name}" thành công.`);
    }
  };

  // Delete Template
  const handleConfirmDelete = () => {
    if (!deletingTemplate) return;
    const res = deleteWorkflowTemplate(deletingTemplate.id);
    if (res.success) {
      showToast(`Đã xóa quy trình "${deletingTemplate.name}".`);
      setDeletingTemplate(null);
      if (selectedWorkflowId === deletingTemplate.id) {
        const remaining = workflowTemplates.filter(w => w.id !== deletingTemplate.id);
        if (remaining.length > 0) {
          setSelectedWorkflowId(remaining[0].id);
        }
      }
    } else {
      showToast(res.message || 'Lỗi khi xóa quy trình', 'error');
    }
  };

  // Step Builder Handlers
  const handleAddStep = () => {
    const nextOrder = formData.steps.length + 1;
    // Tìm phòng ban khả dụng chưa được chọn trong các bước trước
    const selectedDeptNames = new Set(formData.steps.map(s => s.department.trim().toLowerCase()));
    const allAvailable = [
      ...departments.map(d => ({ name: d.name, code: d.code, defaultSla: d.defaultSlaHours, defaultOverdue: d.defaultOverdueAction })),
      { name: 'Ban Giám đốc', code: 'BGD', defaultSla: 24, defaultOverdue: 'WARN_AND_RETURN' as OverdueAction },
      { name: 'Ban Pháp chế & Kiểm soát', code: 'PCKS', defaultSla: 12, defaultOverdue: 'WARN_AND_RETURN' as OverdueAction },
      { name: 'Phòng ban đề xuất', code: 'DX', defaultSla: 8, defaultOverdue: 'WARN_AND_RETURN' as OverdueAction }
    ];
    
    const availableDept = allAvailable.find(d => !selectedDeptNames.has(d.name.toLowerCase()));
    const defaultDept = availableDept ? availableDept.name : (departments[0]?.name || 'Phòng Kỹ thuật & Dự án');
    const deptObj = departments.find(d => d.name === defaultDept);

    setFormData(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          order: nextOrder,
          title: `Bước ${nextOrder}: Xét duyệt & Thẩm định`,
          role: defaultDept.includes('Giám đốc') ? 'DIRECTOR' : defaultDept.includes('Pháp chế') ? 'LEGAL_DEPT' : defaultDept.includes('Kế toán') ? 'CHIEF_ACCOUNTANT' : 'DEPT_HEAD',
          roleTitle: defaultDept.includes('Giám đốc') ? 'Tổng Giám đốc' : defaultDept.includes('Pháp chế') ? 'Trưởng ban Pháp chế' : defaultDept.includes('Kế toán') ? 'Kế toán trưởng' : 'Trưởng bộ phận',
          department: defaultDept,
          slaHours: availableDept?.defaultSla || deptObj?.defaultSlaHours || 8,
          overdueAction: availableDept?.defaultOverdue || deptObj?.defaultOverdueAction || 'WARN_AND_RETURN',
          isInternalCheck: false
        }
      ]
    }));
  };

  const handleRemoveStep = (index: number) => {
    if (formData.steps.length <= 1) {
      setModalError('Quy trình phải có ít nhất 01 bước phê duyệt.');
      return;
    }
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.filter((_, idx) => idx !== index).map((s, i) => ({ ...s, order: i + 1 }))
    }));
  };

  const handleMoveStepUp = (index: number) => {
    if (index === 0) return;
    setFormData(prev => {
      const arr = [...prev.steps];
      const temp = arr[index - 1];
      arr[index - 1] = arr[index];
      arr[index] = temp;
      return {
        ...prev,
        steps: arr.map((s, i) => ({ ...s, order: i + 1 }))
      };
    });
  };

  const handleMoveStepDown = (index: number) => {
    if (index >= formData.steps.length - 1) return;
    setFormData(prev => {
      const arr = [...prev.steps];
      const temp = arr[index + 1];
      arr[index + 1] = arr[index];
      arr[index] = temp;
      return {
        ...prev,
        steps: arr.map((s, i) => ({ ...s, order: i + 1 }))
      };
    });
  };

  const handleUpdateStep = (index: number, patch: Partial<WorkflowStep>) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map((s, idx) => idx === index ? { ...s, ...patch } : s)
    }));
  };

  // Submit Modal Form
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setModalError('Vui lòng nhập tên quy trình.');
      return;
    }

    const finalCategory = formData.category === '__CUSTOM__' 
      ? formData.customCategory.trim() 
      : formData.category.trim();

    if (!finalCategory) {
      setModalError('Vui lòng chọn hoặc nhập Loại hồ sơ áp dụng.');
      return;
    }

    if (formData.steps.length === 0) {
      setModalError('Quy trình phải có ít nhất 01 bước phê duyệt.');
      return;
    }

    // Check duplicate departments across steps (Mỗi phòng ban chỉ được duyệt 1 lần tránh sai quy trình)
    const seenDepts = new Set<string>();
    for (let i = 0; i < formData.steps.length; i++) {
      const s = formData.steps[i];
      const d = s.department.trim().toLowerCase();
      if (seenDepts.has(d)) {
        setModalError(`Bước ${i + 1} chứa phòng ban "${s.department}" đã được chọn ở bước khác. Mỗi phòng ban chỉ được duyệt 1 lần để tránh sai quy trình.`);
        return;
      }
      seenDepts.add(d);
    }

    // Check valid step titles & SLA
    for (let i = 0; i < formData.steps.length; i++) {
      const s = formData.steps[i];
      if (!s.title.trim()) {
        setModalError(`Vui lòng nhập tiêu đề cho Bước ${i + 1}.`);
        return;
      }
      if (!s.slaHours || s.slaHours < 1) {
        setModalError(`Thời gian SLA của Bước ${i + 1} phải từ 1 giờ trở lên.`);
        return;
      }
    }

    if (editingTemplate) {
      // Update
      const res = updateWorkflowTemplate(editingTemplate.id, {
        name: trimmedName,
        category: finalCategory,
        description: formData.description.trim(),
        steps: formData.steps
      });
      if (res.success) {
        showToast(`Đã cập nhật quy trình "${trimmedName}".`);
        setIsModalOpen(false);
      } else {
        setModalError(res.message || 'Lỗi khi cập nhật quy trình');
      }
    } else {
      // Create
      const res = createWorkflowTemplate({
        name: trimmedName,
        category: finalCategory,
        description: formData.description.trim(),
        steps: formData.steps
      });
      if (res.success && res.template) {
        showToast(`Đã tạo mới quy trình "${trimmedName}".`);
        setSelectedWorkflowId(res.template.id);
        setIsModalOpen(false);
      } else {
        setModalError(res.message || 'Lỗi khi tạo quy trình');
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-glow-blue flex items-center gap-2 text-xs font-bold text-white transition-all backdrop-blur-md ${
          toastMessage.type === 'success' ? 'bg-emerald-600/95' : 'bg-brand-red/95'
        }`}>
          <CheckCircle2 className="h-4 w-4" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-ai-card">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-brand-blue border border-blue-100">
              <GitFork className="h-5 w-5" />
            </div>
            <span>Quản Lý Quy Trình Trình Ký (BPM Workflow Engine)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Cấu hình các bước phê duyệt đa cấp, phân luồng theo Loại hồ sơ, thẩm quyền ký và hạn mức SLA cam kết
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canManage && (
            <>
              <button
                onClick={() => {
                  if (confirm('Bạn có chắc chắn muốn khôi phục danh mục quy trình hệ thống về mặc định ban đầu không?')) {
                    resetWorkflowTemplatesToDefault();
                    showToast('Đã khôi phục các quy trình hệ thống về mặc định.');
                  }
                }}
                title="Khôi phục các quy trình hệ thống chuẩn"
                className="px-3.5 py-2 bg-slate-100/80 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                <span className="hidden md:inline">Khôi Phục Mặc Định</span>
              </button>

              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-glow-emerald transition-all flex items-center gap-1.5 cursor-pointer active:scale-98"
              >
                <Plus className="h-4 w-4" />
                <span>Thêm Quy Trình Mới</span>
              </button>
            </>
          )}

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-brand-blue to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-glow-blue transition-all flex items-center gap-1.5 cursor-pointer active:scale-98"
          >
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span>Tạo Hồ Sơ Mới</span>
          </button>
        </div>
      </div>

      {/* Grid: Template Selector + Visual Workflow Diagram */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Template List & Search */}
        <div className="space-y-3">
          
          {/* Search & Filter Bar */}
          <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 space-y-3 shadow-ai-card">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm quy trình hoặc loại hồ sơ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50/80 border border-slate-200/80 rounded-xl font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
              {allCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategoryFilter === cat
                      ? 'bg-brand-blue text-white shadow-glow-blue'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'ALL' ? 'Tất cả' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-brand-blue" />
              <span>Danh Mục Quy Trình ({filteredTemplates.length})</span>
            </h3>
          </div>

          {filteredTemplates.length === 0 ? (
            <div className="p-8 bg-white border border-slate-200/80 rounded-2xl text-center text-slate-400 text-xs shadow-ai-card">
              Không tìm thấy quy trình nào phù hợp.
            </div>
          ) : (
            filteredTemplates.map((tpl) => {
              const isSelected = selectedWorkflow && tpl.id === selectedWorkflow.id;
              const totalSla = tpl.steps.reduce((sum, s) => sum + s.slaHours, 0);

              return (
                <div
                  key={tpl.id}
                  onClick={() => setSelectedWorkflowId(tpl.id)}
                  className={`p-4 bg-white border rounded-2xl cursor-pointer transition-all duration-200 relative group shadow-ai-card ${
                    isSelected
                      ? 'border-brand-blue ring-2 ring-brand-blue/30 shadow-glow-blue bg-blue-50/20'
                      : 'border-slate-200/80 hover:border-blue-300 hover:shadow-card'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold text-brand-red uppercase px-2.5 py-1 bg-red-50 text-red-700 border border-red-100 rounded-full shrink-0">
                      {tpl.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-full">
                        {tpl.steps.length} Bước • {totalSla}h
                      </span>
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 mt-2.5 line-clamp-2">
                    {tpl.name}
                  </h4>

                  {tpl.description && (
                    <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2">
                      {tpl.description}
                    </p>
                  )}

                  {/* Actions & Detail Footer */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-brand-blue flex items-center gap-1">
                      <span>Xem chi tiết lưu đồ</span>
                      <ArrowRight className="h-3 w-3" />
                    </span>

                    {canManage && (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEdit(tpl, e)}
                          title="Chỉnh sửa quy trình"
                          className="p-1.5 text-slate-500 hover:text-brand-blue hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-200 transition-colors"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDuplicate(tpl, e)}
                          title="Nhân bản quy trình"
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg border border-transparent hover:border-emerald-200 transition-colors"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingTemplate(tpl);
                          }}
                          title="Xóa quy trình"
                          className="p-1.5 text-slate-400 hover:text-brand-red hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right 2 Columns: Visual Workflow Step Routing */}
        <div className="lg:col-span-2 space-y-4">
          {selectedWorkflow ? (
            <div className="bg-white/95 backdrop-blur-md p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-ai-card space-y-5">
              
              {/* Header Box */}
              <div className="border-b border-slate-200/80 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold px-3 py-1 bg-brand-blue text-white rounded-full shadow-xs">
                      {selectedWorkflow.category}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1 shadow-xs">
                      <Clock className="h-3.5 w-3.5 text-emerald-600" />
                      Tổng SLA cam kết: {selectedWorkflow.steps.reduce((sum, s) => sum + s.slaHours, 0)} Giờ
                    </span>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(selectedWorkflow)}
                        className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-brand-blue text-xs font-bold rounded-xl border border-blue-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Chỉnh Sửa</span>
                      </button>
                      <button
                        onClick={() => handleDuplicate(selectedWorkflow)}
                        className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Nhân Bản</span>
                      </button>
                      <button
                        onClick={() => setDeletingTemplate(selectedWorkflow)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-brand-red text-xs font-bold rounded-xl border border-red-200 transition-colors flex items-center gap-1 cursor-pointer shadow-xs active:scale-98"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-3">
                  {selectedWorkflow.name}
                </h3>
                {selectedWorkflow.description && (
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                    <span className="font-semibold text-slate-700">Mô tả & Phạm vi:</span> {selectedWorkflow.description}
                  </p>
                )}
              </div>

              {/* Stepper Diagram */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck2 className="h-4 w-4 text-brand-blue" />
                    <span>Sơ Đồ Các Cấp Phê Duyệt Tuần Tự ({selectedWorkflow.steps.length} Cấp Duyệt)</span>
                  </h4>
                  <span className="text-[11px] text-slate-400 font-medium italic">
                    Luân chuyển tự động theo từng bước
                  </span>
                </div>

                <div className="relative border-l-2 border-brand-blue/30 ml-4 pl-6 space-y-4 py-2">
                  {selectedWorkflow.steps.map((step, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === selectedWorkflow.steps.length - 1;

                    return (
                      <div key={idx} className="relative group">
                        {/* Node Dot */}
                        <div className={`absolute -left-[31px] top-3 h-6 w-6 rounded-full border-2 flex items-center justify-center text-[11px] font-black shadow-sm ${
                          isFirst 
                            ? 'bg-emerald-600 border-emerald-600 text-white' 
                            : isLast 
                            ? 'bg-brand-red border-brand-red text-white' 
                            : 'bg-white border-brand-blue text-brand-blue'
                        }`}>
                          {step.order}
                        </div>

                        <div className="p-4 bg-slate-50/80 hover:bg-blue-50/40 border border-slate-200/80 group-hover:border-brand-blue/40 rounded-2xl transition-all space-y-2 shadow-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="text-xs font-bold text-slate-900">
                                  Bước {step.order}: {step.title}
                                </h5>
                                {step.isInternalCheck && (
                                  <span className="text-[9.5px] font-bold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                                    🏢 Yêu cầu kiểm tra nội bộ ban trước
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] flex-wrap">
                                <span className="font-bold text-brand-blue flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-blue-100 shadow-2xs">
                                  <UserCheck className="h-3.5 w-3.5 text-brand-blue" />
                                  {step.roleTitle}
                                </span>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-600 flex items-center gap-1 font-medium">
                                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                                  {step.department}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                              <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-2xs">
                                <Clock className="h-3.5 w-3.5 text-amber-600" />
                                SLA: {step.slaHours} giờ
                              </span>
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 border shadow-2xs ${
                                step.overdueAction === 'AUTO_APPROVE'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-orange-50 text-orange-700 border-orange-200'
                              }`}>
                                {step.overdueAction === 'AUTO_APPROVE' ? '⚡ Quá hạn: Tự động duyệt' : '⚠️ Quá hạn: Cảnh báo & Trả'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>

            </div>
          ) : (
            <div className="p-12 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 text-center text-slate-400 text-xs shadow-ai-card">
              Vui lòng chọn một quy trình từ danh sách bên trái để xem chi tiết.
            </div>
          )}
        </div>

      </div>

      {/* MODAL: ADD / EDIT WORKFLOW TEMPLATE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-brand-navy to-slate-900 border-b border-navy-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/10 text-brand-blue-light">
                  <GitFork className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-wide">
                    {editingTemplate ? `Chỉnh Sửa Quy Trình: ${editingTemplate.name}` : 'Thêm Mới Quy Trình Ký (BPM Workflow)'}
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Thiết lập chuỗi cấp duyệt và định mức thời gian SLA
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveForm} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-800 flex-1">
                {modalError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 flex items-center gap-2 rounded-xl">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span className="font-semibold">{modalError}</span>
                  </div>
                )}

                {/* 1. Tên quy trình & Loại hồ sơ */}
                <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80 space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tên mẫu quy trình ký <span className="text-brand-red">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="VD: Quy trình Trình ký Hợp đồng Kinh tế (> 100 Triệu)..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Loại hồ sơ áp dụng <span className="text-brand-red">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all cursor-pointer"
                    >
                      {standardCategories.map(cat => (
                        <option key={cat} value={cat}>
                          {cat === '__CUSTOM__' ? '✨ + Thêm loại hồ sơ mới (Tự nhập)...' : cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.category === '__CUSTOM__' && (
                    <div>
                      <label className="block font-bold text-brand-blue mb-1">
                        Nhập tên Loại hồ sơ mới <span className="text-brand-red">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.customCategory}
                        onChange={(e) => setFormData(prev => ({ ...prev, customCategory: e.target.value }))}
                        placeholder="VD: Quyết định bổ nhiệm, Kế hoạch đấu thầu..."
                        className="w-full px-3.5 py-2.5 bg-blue-50/50 border border-brand-blue rounded-xl font-semibold text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all"
                      />
                    </div>
                  )}

                  <div className={formData.category === '__CUSTOM__' ? 'sm:col-span-2' : ''}>
                    <label className="block font-bold text-slate-700 mb-1">
                      Mô tả & Phạm vi áp dụng
                    </label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="VD: Áp dụng cho mọi hợp đồng mua sắm vật tư trên 100 triệu..."
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Step Builder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="h-4 w-4 text-brand-blue" />
                    <span className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                      Cấu Hình Các Bước Phê Duyệt Tuần Tự ({formData.steps.length} Bước)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="px-3.5 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-[11px] font-bold rounded-xl transition-all shadow-glow-blue flex items-center gap-1 cursor-pointer active:scale-98"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Thêm Bước Duyệt</span>
                  </button>
                </div>

                {/* Steps List */}
                <div className="space-y-3">
                  {formData.steps.map((step, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === formData.steps.length - 1;

                    return (
                      <div
                        key={idx}
                        className="p-4 bg-white border border-slate-200/80 hover:border-brand-blue/50 rounded-2xl shadow-xs space-y-3 transition-all"
                      >
                        {/* Row 1: Order, Step Title, Action buttons */}
                        <div className="flex items-center justify-between gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] text-white shrink-0 shadow-xs ${
                            isFirst ? 'bg-emerald-600' : isLast ? 'bg-brand-red' : 'bg-brand-blue'
                          }`}>
                            {idx + 1}
                          </span>

                          <input
                            type="text"
                            required
                            value={step.title}
                            onChange={(e) => handleUpdateStep(idx, { title: e.target.value })}
                            placeholder={`VD: Bước ${idx + 1}: Kiểm tra kỹ thuật & phạm vi...`}
                            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all"
                          />

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={isFirst}
                              onClick={() => handleMoveStepUp(idx)}
                              title="Đẩy lên trước"
                              className={`p-1.5 rounded-lg border ${
                                isFirst ? 'text-slate-200 border-slate-100 cursor-not-allowed' : 'text-slate-500 hover:text-brand-blue hover:bg-blue-50 border-slate-200 cursor-pointer'
                              }`}
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={isLast}
                              onClick={() => handleMoveStepDown(idx)}
                              title="Đẩy xuống sau"
                              className={`p-1.5 rounded-lg border ${
                                isLast ? 'text-slate-200 border-slate-100 cursor-not-allowed' : 'text-slate-500 hover:text-brand-blue hover:bg-blue-50 border-slate-200 cursor-pointer'
                              }`}
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveStep(idx)}
                              title="Xóa bước này"
                              className="p-1.5 text-slate-400 hover:text-brand-red hover:bg-red-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Row 2: Department, Role / Position, SLA Hours, Overdue Action */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-[11px]">
                          
                          {/* Department */}
                          <div>
                            <label className="block font-semibold text-slate-600 mb-1">
                              Phòng ban phụ trách:
                            </label>
                            <select
                              value={step.department}
                              onChange={(e) => {
                                const deptName = e.target.value;
                                const isDuplicate = formData.steps.some((s, i) => i !== idx && s.department.trim().toLowerCase() === deptName.trim().toLowerCase());
                                if (isDuplicate) {
                                  setModalError(`Phòng ban "${deptName}" đã được chọn ở bước khác. Mỗi phòng ban chỉ được duyệt 1 lần.`);
                                  return;
                                }
                                setModalError('');
                                const foundDept = departments.find(d => d.name === deptName);
                                handleUpdateStep(idx, { 
                                  department: deptName,
                                  slaHours: step.slaHours || foundDept?.defaultSlaHours || 8,
                                  overdueAction: step.overdueAction || foundDept?.defaultOverdueAction || 'WARN_AND_RETURN'
                                });
                              }}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200/80 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 cursor-pointer"
                            >
                              {departments.map(d => {
                                const isSelectedInOther = formData.steps.some((s, i) => i !== idx && s.department.trim().toLowerCase() === d.name.trim().toLowerCase());
                                return (
                                  <option key={d.id} value={d.name} disabled={isSelectedInOther}>
                                    {d.name} ({d.code}) {isSelectedInOther ? ' — (⚠️ Đã chọn ở bước khác)' : ''}
                                  </option>
                                );
                              })}
                              {['Ban Giám đốc', 'Ban Pháp chế & Kiểm soát', 'Phòng ban đề xuất'].map(name => {
                                const isSelectedInOther = formData.steps.some((s, i) => i !== idx && s.department.trim().toLowerCase() === name.trim().toLowerCase());
                                return (
                                  <option key={name} value={name} disabled={isSelectedInOther}>
                                    {name} {isSelectedInOther ? ' — (⚠️ Đã chọn ở bước khác)' : ''}
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          {/* Role / Position Title */}
                          <div>
                            <label className="block font-semibold text-slate-600 mb-1">
                              Đại diện / Chức danh ký:
                            </label>
                            <input
                              type="text"
                              value={step.roleTitle}
                              onChange={(e) => handleUpdateStep(idx, { roleTitle: e.target.value })}
                              placeholder="VD: Trưởng phòng, Kế toán trưởng..."
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200/80 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                            />
                          </div>

                          {/* SLA Hours */}
                          <div>
                            <label className="block font-semibold text-slate-600 mb-1">
                              Thời gian SLA cam kết:
                            </label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="1"
                                max="360"
                                value={step.slaHours || 8}
                                onChange={(e) => handleUpdateStep(idx, { slaHours: Math.max(1, parseInt(e.target.value) || 8) })}
                                className="w-12 px-1 py-1.5 bg-amber-50 border border-amber-300 rounded-xl font-bold text-amber-900 text-center focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                              />
                              <span className="text-slate-500 font-medium">giờ</span>
                              <div className="flex items-center gap-0.5">
                                {[4, 8, 12, 24].map(h => (
                                  <button
                                    key={h}
                                    type="button"
                                    onClick={() => handleUpdateStep(idx, { slaHours: h })}
                                    className={`px-1.5 py-1 text-[9px] font-bold rounded-lg border transition-all ${
                                      step.slaHours === h 
                                        ? 'bg-amber-600 text-white border-amber-600' 
                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50'
                                    }`}
                                  >
                                    {h}h
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Overdue Action */}
                          <div>
                            <label className="block font-semibold text-slate-600 mb-1">
                              Xử lý khi quá hạn SLA:
                            </label>
                            <select
                              value={step.overdueAction || 'WARN_AND_RETURN'}
                              onChange={(e) => handleUpdateStep(idx, { overdueAction: e.target.value as OverdueAction })}
                              className={`w-full px-2.5 py-1.5 bg-white border rounded-xl font-semibold text-[11px] focus:outline-none focus:ring-2 cursor-pointer ${
                                step.overdueAction === 'AUTO_APPROVE'
                                  ? 'border-purple-300 text-purple-700 focus:ring-purple-400/30 bg-purple-50/40'
                                  : 'border-slate-200/80 text-slate-800 focus:ring-brand-blue/30'
                              }`}
                            >
                              <option value="WARN_AND_RETURN">⚠️ Cảnh báo & Trả</option>
                              <option value="AUTO_APPROVE">⚡ Tự động duyệt</option>
                            </select>
                          </div>

                        </div>

                        {/* Row 3: Internal Check Toggle */}
                        <div className="flex items-center gap-2 pt-1.5">
                          <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={!!step.isInternalCheck}
                              onChange={(e) => handleUpdateStep(idx, { isInternalCheck: e.target.checked })}
                              className="rounded text-brand-blue focus:ring-brand-blue cursor-pointer"
                            />
                            <span>Yêu cầu nhân sự trong ban thực hiện <strong>Kiểm tra hồ sơ nội bộ</strong> trước khi cấp quản lý phê duyệt</span>
                          </label>
                        </div>

                      </div>
                    );
                  })}
                </div>

                {/* Summary Info */}
                <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-2xl flex items-center justify-between text-xs font-semibold text-brand-navy">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-brand-blue" />
                    <span>Tổng chuỗi duyệt: <strong>{formData.steps.length} cấp duyệt</strong></span>
                  </div>
                  <span className="font-bold text-amber-800 bg-amber-100/60 px-3 py-1 rounded-full border border-amber-300">
                    Tổng thời gian SLA: {formData.steps.reduce((sum, s) => sum + (s.slaHours || 0), 0)} Giờ
                  </span>
                </div>

                </div>

              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 bg-slate-50/90 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 rounded-b-3xl">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition-colors cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-brand-blue to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-glow-blue transition-all flex items-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <Check className="h-4 w-4" />
                  <span>{editingTemplate ? 'Lưu Thay Đổi' : 'Tạo Mới Quy Trình'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL: CONFIRM DELETE */}
      {deletingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-brand-red">
              <div className="p-3 bg-red-100 rounded-2xl">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Xác Nhận Xóa Quy Trình
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa quy trình <strong>"{deletingTemplate.name}"</strong> (Loại hồ sơ: <em>{deletingTemplate.category}</em>) không? Thao tác này sẽ xóa quy trình khỏi danh sách mẫu tạo nhanh.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingTemplate(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-brand-red hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-glow-red transition-all cursor-pointer active:scale-98"
              >
                Xóa Vĩnh Viễn
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
