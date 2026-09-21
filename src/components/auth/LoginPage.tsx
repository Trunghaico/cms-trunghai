import React, { useState } from 'react';
import { useDocument } from '../../context/DocumentContext';
import { 
  Lock, 
  User as UserIcon, 
  LogIn, 
  AlertCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, users } = useDocument();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    const result = login(username, password);
    if (!result.success) {
      setErrorMsg(result.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    }
  };

  const handleQuickLogin = (uName: string, uPass: string) => {
    setUsername(uName);
    setPassword(uPass);
    login(uName, uPass);
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-4 selection:bg-[#203a7a] selection:text-white"
      style={{
        background: 'radial-gradient(ellipse at center, #153468 0%, #0c234a 45%, #061226 100%)'
      }}
    >
      <div className="w-full max-w-[430px] relative z-10 animate-fade-in">
        
        {/* Main Login Card */}
        <div className="bg-white rounded-[3px] border-t-[3.5px] border-[#e52d27] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] px-7 py-8 sm:px-9 sm:py-9">
          
          {/* Logo */}
          <div className="flex justify-center mb-3">
            <img 
              src="/logo.png" 
              alt="TRUNG HAI" 
              className="h-16 w-auto object-contain" 
            />
          </div>

          {/* Header Title */}
          <h1 className="text-center font-bold text-[16px] sm:text-[17px] text-[#203a7a] uppercase tracking-wide">
            ĐĂNG NHẬP HỆ THỐNG CMS
          </h1>
          <p className="text-center text-[10.5px] font-medium text-[#4b6b94] uppercase tracking-wider mt-1 mb-6">
            CÔNG TY CỔ PHẦN ĐẦU TƯ VÀ XÂY DỰNG TRUNG HẢI
          </p>

          {/* Error Alert */}
          {errorMsg && (
            <div className="mb-4 p-2.5 bg-red-50 border border-red-200 rounded-[3px] text-xs text-red-600 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            
            {/* Username / Code / Email */}
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-800 mb-1.5">
                Tên đăng nhập / Mã NV / Email
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-[17px] w-[17px] text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Vui lòng nhập username"
                  className="w-full pl-9 pr-3.5 py-2 text-[13px] text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-[2px] focus:outline-none focus:border-[#203a7a] focus:ring-1 focus:ring-[#203a7a] transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-800 mb-1.5">
                Mật khẩu truy cập
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-[17px] w-[17px] text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Vui lòng nhập password"
                  className="w-full pl-9 pr-9 py-2 text-[13px] text-slate-800 placeholder-slate-400 bg-white border border-slate-200 rounded-[2px] focus:outline-none focus:border-[#203a7a] focus:ring-1 focus:ring-[#203a7a] transition-all"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-0.5"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="w-full mt-6 py-2.5 px-4 bg-[#203a7a] hover:bg-[#182e63] active:bg-[#132550] text-white font-semibold text-[13px] rounded-[3px] shadow transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="h-4 w-4 stroke-[2.2]" />
              <span>Đăng Nhập Vào Hệ Thống</span>
            </button>
          </form>

        </div>

      </div>
    </div>
  );
};
