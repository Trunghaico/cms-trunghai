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
      className="min-h-screen w-full flex items-center justify-center p-4 selection:bg-indigo-500 selection:text-white relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 50% 20%, #1e1b4b 0%, #0f172a 50%, #020617 100%)'
      }}
    >
      {/* AI Glow background orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[440px] relative z-10 animate-fade-in">
        
        {/* Main Login Card with Glassmorphism */}
        <div className="bg-white/95 backdrop-blur-2xl rounded-3xl border border-slate-200/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5),0_0_40px_rgba(99,102,241,0.15)] px-7 py-9 sm:px-9 sm:py-10">
          
          {/* Logo with rounded container */}
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:border-indigo-400 hover:shadow-[0_0_20px_rgba(99,102,241,0.25)] transition-all">
              <img 
                src="/logo.png" 
                alt="TRUNG HAI" 
                className="h-14 w-auto object-contain" 
              />
            </div>
          </div>

          {/* Header Title */}
          <h1 className="text-center font-extrabold text-base sm:text-lg bg-gradient-to-r from-brand-blue via-indigo-700 to-indigo-900 bg-clip-text text-transparent uppercase tracking-wide">
            ĐĂNG NHẬP HỆ THỐNG CMS
          </h1>
          <div className="flex justify-center mt-1 mb-6">
            <span className="text-center text-[10px] font-bold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 uppercase tracking-wider">
              E-Approval Workflow AI • Trung Hải Corp
            </span>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-start gap-2 animate-shake">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-brand-red" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            
            {/* Username / Code / Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tên đăng nhập / Mã NV / Email
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Vui lòng nhập username"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 bg-slate-50/80 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mật khẩu truy cập
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Vui lòng nhập password"
                  className="w-full pl-10 pr-10 py-2.5 text-xs text-slate-800 placeholder-slate-400 bg-slate-50/80 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-2xs"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 focus:outline-none p-1 rounded-full hover:bg-slate-100 transition-colors"
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
              className="w-full mt-6 py-3 px-4 bg-gradient-to-r from-brand-blue via-indigo-700 to-indigo-800 hover:from-indigo-700 hover:to-brand-blue text-white font-bold text-xs rounded-xl shadow-[0_4px_16px_rgba(99,102,241,0.35)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.5)] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <LogIn className="h-4 w-4 stroke-[2.2]" />
              <span>Đăng Nhập Vào Hệ Thống</span>
            </button>
          </form>

          {/* Quick Demo Accounts Toggle */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowDemoAccounts(!showDemoAccounts)}
              className="w-full flex items-center justify-between text-xs font-bold text-indigo-700 hover:text-indigo-900 py-1.5 px-2 rounded-xl hover:bg-indigo-50/60 transition-colors cursor-pointer"
            >
              <span>Chọn tài khoản mẫu đăng nhập nhanh</span>
              {showDemoAccounts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showDemoAccounts && (
              <div className="mt-2.5 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {users.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleQuickLogin(u.username, u.pass)}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50/80 hover:bg-indigo-50/80 border border-slate-200 hover:border-indigo-300 transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-700 flex items-center gap-1.5">
                        {u.name}
                        {u.secondaryPositions && u.secondaryPositions.length > 0 && (
                          <span className="text-[9.5px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded-full font-bold">
                            Kiêm 2 ban
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        @{u.username} • {u.roleTitle} ({u.department})
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      Đăng nhập →
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
