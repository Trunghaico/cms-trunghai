import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Bell, 
  ChevronDown, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Clock, 
  Building2, 
  LogOut,
  ExternalLink,
  X,
  User as UserIcon,
  Server,
  UploadCloud,
  RefreshCw,
  Database,
  Camera,
  KeyRound,
  PenTool,
  Settings
} from 'lucide-react';
import { useDocument } from '../../context/DocumentContext';
import { formatDate } from '../../lib/storage';

export const Header: React.FC = () => {
  const { 
    activeUser, 
    logout,
    notifications, 
    unreadNotificationCount, 
    markNotificationAsRead, 
    markAllNotificationsAsRead,
    searchQuery, 
    setSearchQuery,
    setSelectedDocument,
    documents,
    isNASSyncing,
    lastNASSyncTime,
    nasSyncStatus,
    autoBackupConfig,
    autoBackupCountdown,
    syncToNAS,
    setActiveTab,
    openProfileModal
  } = useDocument();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNASMenuOpen, setIsNASMenuOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const nasMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (nasMenuRef.current && !nasMenuRef.current.contains(event.target as Node)) {
        setIsNASMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatCountdown = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Keyboard shortcut for quick search: Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNotificationClick = (documentId: string, notifId: string) => {
    markNotificationAsRead(notifId);
    const targetDoc = documents.find(d => d.id === documentId);
    if (targetDoc) {
      setSelectedDocument(targetDoc);
    }
    setIsNotifOpen(false);
  };

  if (!activeUser) return null;

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-xs transition-all select-none">
      <div className="flex items-center justify-between px-4 lg:px-7 h-16">
        
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 group cursor-pointer">
            {/* Logo Image */}
            <div className="h-10 w-10 flex items-center justify-center p-1.5 bg-white border border-slate-200/90 rounded-xl shadow-xs group-hover:border-indigo-400 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.25)] transition-all duration-300">
              <img src="/logo.png" alt="Trung Hải Logo" className="h-7 w-auto object-contain transition-transform duration-300 group-hover:scale-105" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-wider bg-gradient-to-r from-brand-blue via-indigo-600 to-indigo-800 bg-clip-text text-transparent uppercase transition-colors">
                  TRUNG HAI
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 rounded-full border border-indigo-200/60 shadow-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  E-APPROVAL AI
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 leading-none mt-0.5">
                Hệ Thống Trình Ký & Quản Lý Hồ Sơ Điện Tử
              </p>
            </div>
          </div>
        </div>

        {/* Center: Global Quick Search (Modern AI Pill Searchbar) */}
        <div className="flex-1 max-w-lg lg:max-w-xl mx-4 lg:mx-8 hidden md:block">
          <div className="relative group flex items-center">
            {/* Left Search Icon */}
            <div className="absolute left-3.5 flex items-center pointer-events-none z-10">
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 group-hover:text-slate-600 transition-colors duration-200" />
            </div>

            {/* Search Input Field */}
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm nhanh theo số hiệu, tên hồ sơ, người lập, phòng ban..."
              className="w-full pl-10 pr-16 py-2 text-xs text-slate-800 placeholder:text-slate-400 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-full shadow-2xs focus:shadow-[0_0_20px_rgba(99,102,241,0.18)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-250"
            />

            {/* Right Action: Clear Button OR Shortcut Badge */}
            <div className="absolute right-2.5 flex items-center">
              {searchQuery ? (
                <button 
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-full transition-colors cursor-pointer"
                  title="Xóa nội dung tìm kiếm"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <div className="hidden sm:flex items-center gap-0.5 px-2 py-0.5 bg-white border border-slate-200/90 rounded-full text-[10px] font-mono font-medium text-slate-400 shadow-2xs group-focus-within:border-indigo-400 group-focus-within:text-indigo-600 transition-colors select-none">
                  <span className="text-[9px]">Ctrl</span>
                  <span>K</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: NAS Auto-Sync, Notifications & User Profile with Logout */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* NAS Synology MinIO Live Auto-Backup & Sync Indicator (Chỉ Quản trị viên mới được thấy) */}
          {activeUser?.role === 'ADMIN' && (
            <div className="relative" ref={nasMenuRef}>
              <button
                onClick={() => setIsNASMenuOpen(!isNASMenuOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer select-none ${
                  isNASSyncing 
                    ? 'bg-blue-50 border-blue-300 text-brand-blue animate-pulse' 
                    : nasSyncStatus === 'error'
                    ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                    : 'bg-emerald-50/90 hover:bg-emerald-100/90 border-emerald-200 text-emerald-800 shadow-2xs'
                }`}
                title="Trạng thái tự động đồng bộ & sao lưu lên MinIO NAS"
              >
                <div className="relative flex items-center justify-center">
                  {isNASSyncing ? (
                    <RefreshCw className="w-3.5 h-3.5 text-brand-blue animate-spin" />
                  ) : (
                    <>
                      <Server className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                    </>
                  )}
                </div>
                <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-medium">
                  <span className="font-bold">NAS MinIO</span>
                  {isNASSyncing ? (
                    <span className="text-brand-blue font-semibold">Đang sao lưu...</span>
                  ) : autoBackupConfig.enabled ? (
                    <span className="text-emerald-700 font-mono text-[10px] bg-emerald-200/70 px-1.5 py-0.2 rounded-full font-bold">
                      {formatCountdown(autoBackupCountdown)}
                    </span>
                  ) : (
                    <span className="text-slate-500 text-[10px]">Tắt auto</span>
                  )}
                </div>
              </button>

              {/* NAS Auto-Sync Dropdown */}
              {isNASMenuOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-50 overflow-hidden animate-slide-down">
                  <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                          <Database className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-xs">MinIO NAS Auto-Backup</h4>
                          <p className="text-[10px] text-slate-500">Synology NAS (113.161.53.133)</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-[10px] font-bold">
                        Online
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3 text-xs">
                    <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">Tự động sao lưu:</span>
                        <span className={`font-bold ${autoBackupConfig.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {autoBackupConfig.enabled ? `Bật (Mỗi ${autoBackupConfig.intervalMinutes} phút)` : 'Đang tắt'}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">Lần sao lưu tới sau:</span>
                        <span className="font-mono font-bold text-brand-blue">
                          {autoBackupConfig.enabled ? formatCountdown(autoBackupCountdown) : '--:--'}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">Sao lưu gần nhất:</span>
                        <span className="text-slate-700 font-medium truncate max-w-[140px]" title={lastNASSyncTime || ''}>
                          {lastNASSyncTime ? new Date(lastNASSyncTime).toLocaleTimeString('vi-VN') : 'Chưa có'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          syncToNAS(false);
                        }}
                        disabled={isNASSyncing}
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs hover:shadow cursor-pointer disabled:opacity-50"
                      >
                        <UploadCloud className={`w-3.5 h-3.5 ${isNASSyncing ? 'animate-bounce' : ''}`} />
                        <span>{isNASSyncing ? 'Đang lưu...' : 'Sao lưu ngay'}</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('settings');
                          setIsNASMenuOpen(false);
                        }}
                        className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        Cài đặt NAS
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notifications Center */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/60 rounded-full transition-all duration-200"
              aria-label="Thông báo"
            >
              <Bell className={`h-4.5 w-4.5 transition-transform duration-200 ${unreadNotificationCount > 0 ? 'hover:rotate-12' : ''}`} />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 px-1 items-center justify-center text-[10px] font-bold text-white bg-brand-red rounded-full shadow-md animate-bounce">
                  {unreadNotificationCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-50 overflow-hidden animate-slide-down">
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 to-indigo-50/40 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800">Thông báo hệ thống</span>
                    {unreadNotificationCount > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-brand-red text-white rounded-full shadow-xs">
                        {unreadNotificationCount} mới
                      </span>
                    )}
                  </div>
                  {unreadNotificationCount > 0 && (
                    <button
                      onClick={markAllNotificationsAsRead}
                      className="text-xs text-indigo-600 hover:underline font-semibold"
                    >
                      Đọc tất cả
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-sm">
                      Không có thông báo mới
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n.documentId, n.id)}
                        className={`p-3.5 hover:bg-slate-50/80 transition-colors duration-150 cursor-pointer flex gap-3 items-start ${
                          n.type === 'SLA_VIOLATION' ? 'bg-red-50/70 border-l-3 border-red-500' : !n.read ? 'bg-indigo-50/40' : ''
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {n.type === 'SLA_VIOLATION' ? (
                            <AlertTriangle className="h-4 w-4 text-brand-red animate-pulse" />
                          ) : n.type === 'ACTION_REQUIRED' ? (
                            <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
                          ) : n.type === 'APPROVED' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-brand-red" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs ${!n.read || n.type === 'SLA_VIOLATION' ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                            {n.title}
                          </p>
                          <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                          <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                            {formatDate(n.createdAt)}
                          </span>
                        </div>
                        {!n.read && (
                          <span className="h-2 w-2 rounded-full bg-indigo-600 shrink-0 mt-1.5 animate-pulse" />
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
                  <span className="text-[11px] text-slate-500">
                    Hệ thống tự động thông báo theo thời gian thực
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-slate-200" />

            {/* User Profile */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2.5 p-1 text-left rounded-full hover:bg-slate-100 transition-all duration-200 group cursor-pointer"
              >
                <div className="relative shrink-0 w-8 h-8">
                  <img
                    src={activeUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeUser.name)}&background=3e4095&color=fff`}
                    alt={activeUser.name}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/20 group-hover:ring-indigo-500 transition-all shadow-xs"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                </div>
                <div className="hidden lg:block text-left pr-1">
                  <p className="text-xs font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">
                    {activeUser.name}
                  </p>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    {activeUser.roleTitle}
                  </p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden lg:block transition-transform duration-200 group-hover:translate-y-0.5" />
              </button>

            {/* Profile Dropdown */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-50 overflow-hidden animate-slide-down">
                <div className="p-4 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 border-b border-slate-200">
                  <p className="text-xs font-bold text-slate-900">{activeUser.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">@{activeUser.username}</p>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>{activeUser.department}</span>
                  </div>
                  <div className="mt-2 inline-block px-2.5 py-0.5 bg-gradient-to-r from-brand-blue to-indigo-600 text-white text-[10px] font-bold rounded-full shadow-xs">
                    {activeUser.roleTitle}
                  </div>
                </div>

                <div className="p-2 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      openProfileModal('PROFILE');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/70 font-semibold rounded-xl text-left transition-colors duration-150 cursor-pointer"
                  >
                    <Camera className="h-4 w-4 text-indigo-600" />
                    <span>Hồ sơ cá nhân & Đổi Avatar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      openProfileModal('PASSWORD');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:text-amber-700 hover:bg-amber-50/70 font-semibold rounded-xl text-left transition-colors duration-150 cursor-pointer"
                  >
                    <KeyRound className="h-4 w-4 text-amber-600" />
                    <span>Đổi mật khẩu tài khoản</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      openProfileModal('SIGNATURE');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/70 font-semibold rounded-xl text-left transition-colors duration-150 cursor-pointer"
                  >
                    <PenTool className="h-4 w-4 text-emerald-600" />
                    <span>Chữ ký số & Khắc dấu</span>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-brand-red hover:bg-red-50 font-bold rounded-xl text-left transition-colors duration-150 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 text-brand-red" />
                    <span>Đăng xuất khỏi hệ thống</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
