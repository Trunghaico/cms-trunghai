import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Briefcase, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Users, 
  Sliders
} from 'lucide-react';
import { useDocument } from '../../context/DocumentContext';
import { DepartmentItem, JobTitleItem } from '../../types';

export const SystemSettingsView: React.FC = () => {
  const { 
    departments, 
    jobTitles, 
    users, 
    createDepartment, 
    updateDepartment, 
    deleteDepartment, 
    createJobTitle, 
    updateJobTitle, 
    deleteJobTitle 
  } = useDocument();

  const [activeSubTab, setActiveSubTab] = useState<'departments' | 'job-titles'>('departments');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Department Modal State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');

  // Job Title Modal State
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobTitleItem | null>(null);
  const [jobName, setJobName] = useState('');
  const [jobCode, setJobCode] = useState('');
  const [jobDepartment, setJobDepartment] = useState('');

  // Status message
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => {
      setMessage(null);
    }, 4000);
  };

  // Filtered Lists
  const filteredDepartments = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return departments;
    return departments.filter(d => 
      d.name.toLowerCase().includes(term) || 
      d.code.toLowerCase().includes(term)
    );
  }, [departments, searchTerm]);

  const filteredJobTitles = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return jobTitles;
    return jobTitles.filter(j => 
      j.name.toLowerCase().includes(term) || 
      j.code.toLowerCase().includes(term) ||
      (j.department && j.department.toLowerCase().includes(term))
    );
  }, [jobTitles, searchTerm]);

  // Department Modal Handlers
  const handleOpenCreateDept = () => {
    setEditingDept(null);
    setDeptName('');
    setDeptCode('');
    setIsDeptModalOpen(true);
  };

  const handleOpenEditDept = (dept: DepartmentItem) => {
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptCode(dept.code);
    setIsDeptModalOpen(true);
  };

  const handleSaveDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !deptCode.trim()) {
      showNotification('error', 'Vui lòng điền đầy đủ tên và mã phòng ban.');
      return;
    }

    if (editingDept) {
      const res = updateDepartment(editingDept.id, {
        name: deptName.trim(),
        code: deptCode.trim().toUpperCase()
      });
      if (res.success) {
        showNotification('success', `Đã cập nhật phòng ban "${deptName.trim()}" thành công!`);
        setIsDeptModalOpen(false);
      } else {
        showNotification('error', res.message || 'Cập nhật thất bại.');
      }
    } else {
      const res = createDepartment({
        name: deptName.trim(),
        code: deptCode.trim().toUpperCase()
      });
      if (res.success) {
        showNotification('success', `Đã tạo mới phòng ban "${deptName.trim()}" thành công!`);
        setIsDeptModalOpen(false);
      } else {
        showNotification('error', res.message || 'Tạo mới thất bại.');
      }
    }
  };

  const handleDeleteDept = (dept: DepartmentItem) => {
    const userCount = users.filter(u => u.department.toLowerCase() === dept.name.toLowerCase()).length;
    if (userCount > 0) {
      showNotification('error', `Không thể xóa phòng ban "${dept.name}" vì đang có ${userCount} nhân sự trực thuộc!`);
      return;
    }

    if (window.confirm(`Bạn có chắc chắn muốn xóa phòng ban "${dept.name}" (${dept.code})?`)) {
      const res = deleteDepartment(dept.id);
      if (res.success) {
        showNotification('success', `Đã xóa phòng ban "${dept.name}" thành công.`);
      } else {
        showNotification('error', res.message || 'Xóa thất bại.');
      }
    }
  };

  // Job Title Modal Handlers
  const handleOpenCreateJob = () => {
    setEditingJob(null);
    setJobName('');
    setJobCode('');
    setJobDepartment(departments[0]?.name || 'Phòng Kỹ thuật & Dự án');
    setIsJobModalOpen(true);
  };

  const handleOpenEditJob = (job: JobTitleItem) => {
    setEditingJob(job);
    setJobName(job.name);
    setJobCode(job.code);
    setJobDepartment(job.department || departments[0]?.name || '');
    setIsJobModalOpen(true);
  };

  const handleSaveJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobName.trim() || !jobCode.trim() || !jobDepartment.trim()) {
      showNotification('error', 'Vui lòng điền đầy đủ tên chức vụ, mã chức vụ và chọn phòng ban trực thuộc.');
      return;
    }

    if (editingJob) {
      const res = updateJobTitle(editingJob.id, {
        name: jobName.trim(),
        code: jobCode.trim().toUpperCase(),
        department: jobDepartment.trim()
      });
      if (res.success) {
        showNotification('success', `Đã cập nhật chức vụ "${jobName.trim()}" thành công!`);
        setIsJobModalOpen(false);
      } else {
        showNotification('error', res.message || 'Cập nhật thất bại.');
      }
    } else {
      const res = createJobTitle({
        name: jobName.trim(),
        code: jobCode.trim().toUpperCase(),
        department: jobDepartment.trim()
      });
      if (res.success) {
        showNotification('success', `Đã tạo mới chức vụ "${jobName.trim()}" thành công!`);
        setIsJobModalOpen(false);
      } else {
        showNotification('error', res.message || 'Tạo mới thất bại.');
      }
    }
  };

  const handleDeleteJob = (job: JobTitleItem) => {
    const userCount = users.filter(u => u.roleTitle.toLowerCase() === job.name.toLowerCase()).length;
    if (userCount > 0) {
      showNotification('error', `Không thể xóa chức vụ "${job.name}" vì đang có ${userCount} nhân sự nắm giữ!`);
      return;
    }

    if (window.confirm(`Bạn có chắc chắn muốn xóa chức vụ "${job.name}" (${job.code})?`)) {
      const res = deleteJobTitle(job.id);
      if (res.success) {
        showNotification('success', `Đã xóa chức vụ "${job.name}" thành công.`);
      } else {
        showNotification('error', res.message || 'Xóa thất bại.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 right-8 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium ${
              message.type === 'success' 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                : 'bg-red-50 border-red-300 text-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{message.text}</span>
            <button 
              onClick={() => setMessage(null)}
              className="ml-2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-gradient-to-br from-brand-blue to-blue-700 text-white rounded-lg shadow-xs">
                <Sliders className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cấu hình Hệ thống</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quản lý danh mục tên các phòng ban và chức vụ trong doanh nghiệp
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => { setActiveSubTab('departments'); setSearchTerm(''); }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeSubTab === 'departments'
                    ? 'bg-white text-brand-blue shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Phòng Ban ({departments.length})</span>
              </button>
              <button
                onClick={() => { setActiveSubTab('job-titles'); setSearchTerm(''); }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeSubTab === 'job-titles'
                    ? 'bg-white text-brand-blue shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Chức Vụ ({jobTitles.length})</span>
              </button>
            </div>

            {activeSubTab === 'departments' ? (
              <button
                onClick={handleOpenCreateDept}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-blue hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Phòng Ban</span>
              </button>
            ) : (
              <button
                onClick={handleOpenCreateJob}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-blue hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Chức Vụ</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center gap-3.5 p-3.5 rounded-lg bg-blue-50/50 border border-blue-100">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">{departments.length}</div>
              <div className="text-[11px] font-medium text-slate-500">Tổng số phòng ban</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3.5 rounded-lg bg-indigo-50/50 border border-indigo-100">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-md">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">{jobTitles.length}</div>
              <div className="text-[11px] font-medium text-slate-500">Tổng chức vụ định danh</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-3.5 rounded-lg bg-emerald-50/50 border border-emerald-100">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-md">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">{users.length}</div>
              <div className="text-[11px] font-medium text-slate-500">Nhân sự trong hệ thống</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                activeSubTab === 'departments' 
                  ? 'Tìm theo tên, mã phòng ban...' 
                  : 'Tìm theo tên chức vụ, mã, phòng ban...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Hiển thị: </span>
            <span className="font-semibold text-slate-800">
              {activeSubTab === 'departments' ? filteredDepartments.length : filteredJobTitles.length}
            </span>
            <span>mục</span>
          </div>
        </div>

        {/* TAB 1: DEPARTMENTS */}
        {activeSubTab === 'departments' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-16 text-center">STT</th>
                  <th className="py-3 px-4 w-36">Mã Phòng</th>
                  <th className="py-3 px-4">Tên Phòng Ban</th>
                  <th className="py-3 px-4 text-center w-44">Nhân sự trực thuộc</th>
                  <th className="py-3 px-4 text-right w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-normal">
                {filteredDepartments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                      <p className="text-sm font-medium">Không tìm thấy phòng ban nào phù hợp</p>
                      <p className="text-xs text-slate-400 mt-0.5">Vui lòng thử tìm với từ khóa khác hoặc thêm mới</p>
                    </td>
                  </tr>
                ) : (
                  filteredDepartments.map((dept, idx) => {
                    const deptUsers = users.filter(u => u.department.toLowerCase() === dept.name.toLowerCase());
                    return (
                      <tr key={dept.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-slate-400 text-center">{idx + 1}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-blue-50 text-brand-blue border border-blue-200 font-mono">
                            {dept.code}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 text-sm">{dept.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">ID: {dept.id}</div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                            deptUsers.length > 0 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            <Users className="w-3.5 h-3.5" />
                            {deptUsers.length} nhân sự
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditDept(dept)}
                              className="p-1.5 text-slate-500 hover:text-brand-blue hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                              title="Chỉnh sửa phòng ban"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDept(dept)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                              title="Xóa phòng ban"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: JOB TITLES */}
        {activeSubTab === 'job-titles' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-16 text-center">STT</th>
                  <th className="py-3 px-4 w-36">Mã Chức Vụ</th>
                  <th className="py-3 px-4">Tên Chức Vụ</th>
                  <th className="py-3 px-4 w-72">Thuộc Phòng Ban</th>
                  <th className="py-3 px-4 text-center w-44">Nhân sự nắm giữ</th>
                  <th className="py-3 px-4 text-right w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-normal">
                {filteredJobTitles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Briefcase className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                      <p className="text-sm font-medium">Không tìm thấy chức vụ nào phù hợp</p>
                      <p className="text-xs text-slate-400 mt-0.5">Vui lòng thử tìm với từ khóa khác hoặc thêm mới</p>
                    </td>
                  </tr>
                ) : (
                  filteredJobTitles.map((job, idx) => {
                    const jobUsers = users.filter(u => u.roleTitle.toLowerCase() === job.name.toLowerCase());
                    return (
                      <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-slate-400 text-center">{idx + 1}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 font-mono">
                            {job.code}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 text-sm">{job.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">ID: {job.id}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            <Building2 className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                            <span className="truncate max-w-[220px]">{job.department || 'Chưa gán'}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                            jobUsers.length > 0 
                              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            <Users className="w-3.5 h-3.5" />
                            {jobUsers.length} người
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditJob(job)}
                              className="p-1.5 text-slate-500 hover:text-brand-blue hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                              title="Chỉnh sửa chức vụ"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteJob(job)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                              title="Xóa chức vụ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Thêm / Chỉnh sửa Phòng Ban */}
      <AnimatePresence>
        {isDeptModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-100 text-brand-blue rounded-lg">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {editingDept ? 'Chỉnh Sửa Phòng Ban' : 'Thêm Phòng Ban Mới'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {editingDept ? `Cập nhật thông tin phòng ban ${editingDept.code}` : 'Khai báo phòng ban mới vào hệ thống'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDeptModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveDept} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên phòng ban <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Phòng Kỹ thuật & Dự án, Ban Giám Đốc..."
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mã phòng ban (Viết tắt) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: KTDA, TCKT, PCKS, HCNS..."
                    value={deptCode}
                    onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2 text-xs uppercase font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Mã dùng để phân loại hồ sơ và ký hiệu phân quyền</p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsDeptModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-brand-blue hover:bg-blue-800 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    {editingDept ? 'Cập Nhật' : 'Tạo Mới Phòng Ban'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Thêm / Chỉnh sửa Chức Vụ */}
      <AnimatePresence>
        {isJobModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {editingJob ? 'Chỉnh Sửa Chức Vụ' : 'Thêm Chức Vụ Mới'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {editingJob ? `Cập nhật thông tin chức vụ ${editingJob.code}` : 'Khai báo chức danh/vị trí công việc mới'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsJobModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveJob} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên chức vụ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Tổng Giám Đốc, Trưởng Phòng, Kế Toán Trưởng, Chuyên viên..."
                    value={jobName}
                    onChange={(e) => setJobName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mã chức vụ (Viết tắt) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: TGD, PTGD, KTT, TP_KTDA, CV_DA..."
                    value={jobCode}
                    onChange={(e) => setJobCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2 text-xs uppercase font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Thuộc phòng ban nào <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={jobDepartment}
                    onChange={(e) => setJobDepartment(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue cursor-pointer"
                  >
                    <option value="" disabled>-- Chọn phòng ban trực thuộc --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>{d.code} - {d.name}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">Chọn phòng ban trực tiếp quản lý chức vụ này</p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsJobModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-brand-blue hover:bg-blue-800 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    {editingJob ? 'Cập Nhật' : 'Tạo Mới Chức Vụ'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
