import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  User as UserIcon, 
  Lock, 
  KeyRound, 
  Shield, 
  Camera, 
  Upload, 
  Check, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Building2, 
  CheckCircle2, 
  RefreshCw, 
  PenTool, 
  Trash2, 
  Image as ImageIcon,
  CheckCheck,
  ShieldCheck,
  Briefcase
} from 'lucide-react';
import { useDocument } from '../../context/DocumentContext';
import { uploadFileToNAS } from '../../lib/nasStorageService';

// Bộ sưu tập avatar phong cách công sở chuyên nghiệp có sẵn
const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
];

export const UserProfileModal: React.FC = () => {
  const { 
    isProfileModalOpen, 
    setIsProfileModalOpen, 
    profileInitialTab = 'PROFILE',
    activeUser, 
    updateMyProfile,
    changePassword 
  } = useDocument();

  const [activeTab, setActiveTab] = useState<'PROFILE' | 'PASSWORD' | 'SIGNATURE'>(profileInitialTab);

  // Profile fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [signatureUrl, setSignatureUrl] = useState<string | undefined>(undefined);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sigFileInputRef = useRef<HTMLInputElement>(null);

  // Password fields
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Canvas for signature
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnSig, setHasDrawnSig] = useState(false);

  // Toast / Messages
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state when modal opens or activeUser changes
  useEffect(() => {
    if (isProfileModalOpen && activeUser) {
      setName(activeUser.name || '');
      setEmail(activeUser.email || `${activeUser.username}@trunghai.com.vn`);
      setAvatarUrl(activeUser.avatar || '');
      setSignatureUrl(activeUser.signatureUrl);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setErrorMessage('');
      setSuccessMessage('');
      setActiveTab(profileInitialTab || 'PROFILE');
    }
  }, [isProfileModalOpen, activeUser, profileInitialTab]);

  // Signature canvas setup
  useEffect(() => {
    if (activeTab === 'SIGNATURE' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#1e3a8a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [activeTab]);

  if (!isProfileModalOpen || !activeUser) return null;

  const handleClose = () => {
    setIsProfileModalOpen(false);
    setErrorMessage('');
    setSuccessMessage('');
  };

  // Avatar Upload Handler
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Vui lòng chọn tệp định dạng hình ảnh (PNG, JPG, WEBP).');
      return;
    }

    // Check size < 5MB
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Dung lượng ảnh đại diện không được vượt quá 5MB.');
      return;
    }

    setIsUploadingAvatar(true);
    setErrorMessage('');

    try {
      // 1. Đọc file thành Data URL để hiển thị tức thì và lưu trữ an toàn
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          setAvatarUrl(dataUrl);
        }
        
        // 2. Thử tải lên NAS Storage nếu có kết nối
        try {
          const nasRes = await uploadFileToNAS(file);
          if (nasRes && nasRes.url) {
            setAvatarUrl(nasRes.url);
          }
        } catch {
          // Fallback dataUrl đã được set
        }

        setIsUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setIsUploadingAvatar(false);
      setErrorMessage('Lỗi khi đọc file ảnh. Vui lòng thử lại.');
    }
  };

  // Save Profile Handler
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!name.trim()) {
      setErrorMessage('Họ và tên không được để trống.');
      return;
    }

    setIsSubmitting(true);
    const res = updateMyProfile({
      name: name.trim(),
      email: email.trim() || undefined,
      avatar: avatarUrl || activeUser.avatar
    });

    setIsSubmitting(false);
    if (res.success) {
      setSuccessMessage('Đã cập nhật thông tin hồ sơ và ảnh đại diện thành công!');
      setTimeout(() => {
        setSuccessMessage('');
      }, 3500);
    } else {
      setErrorMessage(res.message || 'Lỗi khi cập nhật thông tin.');
    }
  };

  // Change Password Handler
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!currentPass.trim()) {
      setErrorMessage('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }

    if (newPass.length < 6) {
      setErrorMessage('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    if (newPass !== confirmPass) {
      setErrorMessage('Xác nhận mật khẩu mới không trùng khớp. Vui lòng kiểm tra lại!');
      return;
    }

    setIsSubmitting(true);
    const res = changePassword(currentPass, newPass);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage('Đổi mật khẩu thành công! Hãy sử dụng mật khẩu mới cho các lần đăng nhập tiếp theo.');
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
    } else {
      setErrorMessage(res.message || 'Lỗi khi đổi mật khẩu.');
    }
  };

  // Signature Canvas Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawnSig(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnSig(false);
  };

  const saveCanvasSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setSignatureUrl(dataUrl);
    updateMyProfile({ signatureUrl: dataUrl });
    setSuccessMessage('Đã lưu chữ ký điện tử cá nhân thành công!');
    setTimeout(() => setSuccessMessage(''), 3500);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setSignatureUrl(dataUrl);
        updateMyProfile({ signatureUrl: dataUrl });
        setSuccessMessage('Đã tải ảnh chữ ký cá nhân thành công!');
        setTimeout(() => setSuccessMessage(''), 3500);
      }
    };
    reader.readAsDataURL(file);
  };

  // Password Strength Calculator
  const getPasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass) || /[A-Z]/.test(pass)) score += 1;
    return score;
  };

  const passStrength = getPasswordStrength(newPass);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-2xl overflow-hidden animate-slide-down my-auto transition-all">
        
        {/* Header Bar */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between border-b border-indigo-900/40 relative overflow-hidden">
          <div className="absolute top-0 right-1/4 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-amber-300 rounded-2xl text-slate-950 shadow-glow-amber">
              <UserIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-2">
                <span>Thiết Lập Tài Khoản Cá Nhân</span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 bg-amber-400/90 text-slate-950 rounded-full shadow-xs">
                  @{activeUser.username}
                </span>
              </h2>
              <p className="text-[11px] text-blue-200/80 mt-0.5">
                Tự đổi ảnh đại diện (Avatar), cập nhật mật khẩu và chữ ký số cá nhân
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer relative z-10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200/80 bg-slate-50/90 px-6 pt-3 gap-2 text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('PROFILE');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`px-4 py-2.5 font-bold flex items-center gap-2 border-b-2 rounded-t-xl transition-all cursor-pointer ${
              activeTab === 'PROFILE'
                ? 'border-brand-blue text-brand-blue bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="h-4 w-4" />
            <span>Ảnh Đại Diện & Thông Tin</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('PASSWORD');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`px-4 py-2.5 font-bold flex items-center gap-2 border-b-2 rounded-t-xl transition-all cursor-pointer ${
              activeTab === 'PASSWORD'
                ? 'border-brand-blue text-brand-blue bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="h-4 w-4" />
            <span>Đổi Mật Khẩu</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('SIGNATURE');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`px-4 py-2.5 font-bold flex items-center gap-2 border-b-2 rounded-t-xl transition-all cursor-pointer ${
              activeTab === 'SIGNATURE'
                ? 'border-brand-blue text-brand-blue bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PenTool className="h-4 w-4" />
            <span>Chữ Ký Số</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-slate-800 custom-scrollbar">
          
          {/* Notifications */}
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 flex items-center gap-2.5 rounded-2xl text-xs animate-shake shadow-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2.5 rounded-2xl text-xs shadow-xs">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{successMessage}</span>
            </div>
          )}

          {/* TAB 1: ẢNH ĐẠI DIỆN & THÔNG TIN */}
          {activeTab === 'PROFILE' && (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              
              {/* Avatar Section */}
              <div className="p-5 bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-slate-200/80 rounded-2xl space-y-4 shadow-2xs">
                <span className="block font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Ảnh Đại Diện (Avatar)
                </span>

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  {/* Current Avatar Preview */}
                  <div className="relative group shrink-0">
                    <img
                      src={avatarUrl || activeUser.avatar}
                      alt={activeUser.name}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-white shadow-lg ring-2 ring-brand-blue/30"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-slate-950/60 rounded-full text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold backdrop-blur-xs"
                    >
                      <Camera className="h-5 w-5 mb-0.5" />
                      <span>Đổi ảnh</span>
                    </button>
                  </div>

                  {/* Upload Button & Information */}
                  <div className="space-y-2 text-center sm:text-left flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      onChange={handleAvatarFileChange}
                      className="hidden"
                    />
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <button
                        type="button"
                        disabled={isUploadingAvatar}
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-gradient-to-r from-brand-blue to-indigo-600 hover:from-brand-blue-dark hover:to-indigo-700 text-white font-bold rounded-xl shadow-glow-blue transition-all flex items-center gap-1.5 cursor-pointer text-xs"
                      >
                        {isUploadingAvatar ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            <span>Đang tải ảnh...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-3.5 w-3.5" />
                            <span>Tải Ảnh Từ Máy Tính</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setAvatarUrl(`https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl border border-slate-300 transition-colors text-xs"
                      >
                        Khôi phục ảnh mặc định
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Hỗ trợ định dạng JPG, PNG, WEBP dung lượng tối đa 5MB. Ảnh sẽ được tự động lưu trữ an toàn và đồng bộ.
                    </p>
                  </div>
                </div>

                {/* Preset Avatar Gallery */}
                <div className="pt-3 border-t border-slate-200/80 space-y-2">
                  <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>Hoặc chọn nhanh từ kho Avatar phong cách công sở có sẵn:</span>
                  </span>
                  
                  <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 pt-1">
                    {PRESET_AVATARS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAvatarUrl(preset)}
                        className={`relative rounded-full overflow-hidden aspect-square border-2 transition-transform hover:scale-110 cursor-pointer shadow-xs ${
                          avatarUrl === preset ? 'border-brand-blue ring-2 ring-brand-blue/50 scale-105' : 'border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        <img src={preset} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                        {avatarUrl === preset && (
                          <div className="absolute inset-0 bg-brand-blue/50 flex items-center justify-center text-white backdrop-blur-2xs">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Account Details */}
              <div className="bg-white p-5 border border-slate-200/80 rounded-2xl space-y-3.5 shadow-2xs">
                <span className="block font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Thông Tin Tài Khoản
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Họ và tên người dùng <span className="text-brand-red">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="VD: Nguyễn Văn A..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Tên đăng nhập (Username)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={activeUser.username}
                      className="w-full px-3.5 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl font-mono font-bold text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Email liên hệ / Nhận thông báo
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="VD: user@trunghai.com.vn..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Phòng ban / Đơn vị
                    </label>
                    <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100/70 border border-slate-200 rounded-xl text-slate-700 font-semibold text-xs">
                      <Building2 className="h-4 w-4 text-brand-blue shrink-0" />
                      <span className="truncate">{activeUser.department}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Chức danh hiển thị
                    </label>
                    <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100/70 border border-slate-200 rounded-xl text-slate-700 font-semibold text-xs">
                      <Briefcase className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="truncate">{activeUser.roleTitle}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Nhóm quyền hạn thẩm quyền
                    </label>
                    <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100/70 border border-slate-200 rounded-xl text-slate-700 font-semibold text-xs">
                      <ShieldCheck className="h-4 w-4 text-purple-600 shrink-0" />
                      <span className="truncate font-mono">{activeUser.role}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-300 transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-brand-blue to-indigo-600 hover:from-brand-blue-dark hover:to-indigo-700 text-white font-bold rounded-xl shadow-glow-blue transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>{isSubmitting ? 'Đang Lưu...' : 'Lưu Thay Đổi Thông Tin'}</span>
                </button>
              </div>

            </form>
          )}

          {/* TAB 2: ĐỔI MẬT KHẨU */}
          {activeTab === 'PASSWORD' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              
              <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/90 p-4 border border-blue-200/80 rounded-2xl space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-brand-navy">
                  <Shield className="h-4 w-4 text-brand-blue" />
                  <span>Quy chuẩn bảo mật mật khẩu tài khoản</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Để đảm bảo an toàn cho các tác vụ phê duyệt và ký số hồ sơ điện tử, mật khẩu mới của bạn cần có tối thiểu <strong>6 ký tự</strong>, khuyến khích kết hợp giữa chữ cái, số và ký tự đặc biệt.
                </p>
              </div>

              <div className="space-y-4 bg-slate-50/90 p-5 border border-slate-200/80 rounded-2xl shadow-2xs">
                
                {/* Current Password */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mật khẩu hiện tại <span className="text-brand-red">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      required
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      placeholder="Nhập mật khẩu bạn đang sử dụng..."
                      className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mật khẩu mới <span className="text-brand-red">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      required
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)..."
                      className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Password strength meter */}
                  {newPass && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 font-medium">Độ mạnh mật khẩu:</span>
                        <span className={`font-bold ${
                          passStrength <= 1 ? 'text-brand-red' : passStrength <= 3 ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                          {passStrength <= 1 ? 'Yếu' : passStrength <= 3 ? 'Trung bình' : 'Rất mạnh'}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex gap-1">
                        <div className={`h-full flex-1 rounded-full transition-all ${passStrength >= 1 ? (passStrength <= 1 ? 'bg-red-500' : passStrength <= 3 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-transparent'}`} />
                        <div className={`h-full flex-1 rounded-full transition-all ${passStrength >= 2 ? (passStrength <= 3 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-transparent'}`} />
                        <div className={`h-full flex-1 rounded-full transition-all ${passStrength >= 3 ? (passStrength <= 3 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-transparent'}`} />
                        <div className={`h-full flex-1 rounded-full transition-all ${passStrength >= 4 ? 'bg-emerald-500' : 'bg-transparent'}`} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nhập lại mật khẩu mới <span className="text-brand-red">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      required
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                      placeholder="Nhập lại chính xác mật khẩu mới..."
                      className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPass && newPass !== confirmPass && (
                    <p className="text-[10px] text-brand-red font-semibold mt-1.5 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>Mật khẩu xác nhận chưa khớp với mật khẩu mới.</span>
                    </p>
                  )}
                </div>

              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-300 transition-colors cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (confirmPass.length > 0 && newPass !== confirmPass)}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-glow-emerald transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Lock className="h-4 w-4" />
                  <span>{isSubmitting ? 'Đang Lưu...' : 'Xác Nhận Đổi Mật Khẩu'}</span>
                </button>
              </div>

            </form>
          )}

          {/* TAB 3: CHỮ KÝ SỐ CÁ NHÂN */}
          {activeTab === 'SIGNATURE' && (
            <div className="space-y-4">
              
              <div className="bg-slate-50/90 p-5 border border-slate-200/80 rounded-2xl space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Vẽ Chữ Ký Điện Tử Trực Tiếp
                  </span>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="px-3 py-1.5 text-[11px] bg-white hover:bg-red-50 text-slate-600 hover:text-brand-red font-semibold rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Xóa nét vẽ</span>
                  </button>
                </div>

                {/* Signature Canvas Pad */}
                <div className="border-2 border-dashed border-slate-300/80 bg-white rounded-2xl p-2 flex items-center justify-center shadow-inner">
                  <canvas
                    ref={canvasRef}
                    width={520}
                    height={160}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-40 cursor-crosshair touch-none rounded-xl"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500 text-center sm:text-left">
                    Sử dụng chuột hoặc màn hình cảm ứng để ký trực tiếp vào khung trên.
                  </span>
                  <button
                    type="button"
                    disabled={!hasDrawnSig}
                    onClick={saveCanvasSignature}
                    className="px-4 py-2 bg-gradient-to-r from-brand-blue to-indigo-600 hover:from-brand-blue-dark hover:to-indigo-700 text-white font-bold rounded-xl shadow-glow-blue transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <CheckCheck className="h-4 w-4" />
                    <span>Lưu Chữ Ký Vừa Vẽ</span>
                  </button>
                </div>
              </div>

              {/* Upload Signature Image */}
              <div className="p-5 bg-slate-50/90 border border-slate-200/80 rounded-2xl space-y-3.5 shadow-2xs">
                <span className="block font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Hoặc Tải Lên Ảnh Chữ Ký / Con Dấu Mẫu
                </span>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    ref={sigFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleSignatureUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => sigFileInputRef.current?.click()}
                    className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl border border-slate-300 transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <ImageIcon className="h-4 w-4 text-brand-blue" />
                    <span>Chọn file ảnh chữ ký (PNG nền trong suốt)</span>
                  </button>
                </div>

                {signatureUrl && (
                  <div className="pt-2">
                    <span className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                      Chữ ký hiện tại đang lưu:
                    </span>
                    <div className="p-3 bg-white border border-slate-200 rounded-2xl inline-block shadow-2xs">
                      <img src={signatureUrl} alt="Chữ ký" className="h-16 max-w-xs object-contain" />
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
