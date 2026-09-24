import React, { useState, useEffect } from 'react';
import { 
  Download, 
  X, 
  Smartphone, 
  Bell, 
  CheckCircle2, 
  Share, 
  PlusSquare, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { 
  isStandaloneApp, 
  isMobileOrTabletDevice, 
  getNotificationPermission, 
  requestNotificationPermission 
} from '../../lib/pwaService';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed / standalone
    if (isStandaloneApp()) {
      setShowInstallBanner(false);
      return;
    }

    // Check iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Capture beforeinstallprompt for Android / Chrome / Edge
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show banner after 3 seconds if not dismissed previously
      const dismissed = localStorage.getItem('cms_pwa_dismissed');
      if (!dismissed) {
        setTimeout(() => setShowInstallBanner(true), 2500);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show iOS banner if mobile and not dismissed
    if (isIosDevice && isMobileOrTabletDevice()) {
      const dismissed = localStorage.getItem('cms_pwa_dismissed');
      if (!dismissed) {
        setTimeout(() => setShowInstallBanner(true), 3000);
      }
    }

    // Check Notification permission
    const currentPermission = getNotificationPermission();
    setNotifPermission(currentPermission);
    if (currentPermission === 'default') {
      const notifDismissed = localStorage.getItem('cms_notif_dismissed');
      if (!notifDismissed) {
        setTimeout(() => setShowNotifPrompt(true), 4500);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallBanner(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  const handleDismissInstall = () => {
    setShowInstallBanner(false);
    localStorage.setItem('cms_pwa_dismissed', 'true');
  };

  const handleEnableNotification = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setNotifPermission('granted');
      setShowNotifPrompt(false);
    }
  };

  const handleDismissNotif = () => {
    setShowNotifPrompt(false);
    localStorage.setItem('cms_notif_dismissed', 'true');
  };

  return (
    <>
      {/* 1. NOTIFICATION PERMISSION PROMPT BANNER */}
      {showNotifPrompt && notifPermission === 'default' && (
        <div className="fixed top-20 right-3 sm:right-6 z-50 max-w-sm w-[calc(100%-24px)] sm:w-auto bg-gradient-to-r from-slate-900 via-indigo-950 to-brand-blue text-white p-4 rounded-2xl shadow-2xl border border-indigo-500/30 animate-slide-down backdrop-blur-md">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-400 text-slate-950 rounded-xl shrink-0 shadow-xs animate-bounce">
              <Bell className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <h4 className="font-bold text-xs text-white">Bật Thông Báo Phê Duyệt</h4>
                <button 
                  onClick={handleDismissNotif}
                  className="text-white/60 hover:text-white p-1 rounded-lg"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                Nhận cảnh báo ngay trên màn hình khóa điện thoại khi có hồ sơ mới cần ký hoặc sắp trễ hạn SLA.
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  onClick={handleEnableNotification}
                  className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <span>Bật thông báo ngay</span>
                </button>
                <button
                  onClick={handleDismissNotif}
                  className="px-2.5 py-1.5 text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Để sau
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. PWA INSTALL FLOATING BANNER FOR MOBILE & TABLET */}
      {showInstallBanner && (
        <div className="fixed bottom-20 md:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-white/95 backdrop-blur-xl border border-indigo-200/80 p-4 rounded-3xl shadow-2xl animate-slide-up">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm shrink-0 flex items-center justify-center">
                <img src="/logo.png" alt="CMS Trung Hải" className="w-8 h-8 object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-xs text-slate-900">Cài Đặt App CMS Trung Hải</h4>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full">
                    Miễn phí
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Thêm vào màn hình chính để duyệt văn bản toàn màn hình và nhận thông báo mượt mà.
                </p>
              </div>
            </div>
            <button 
              onClick={handleDismissInstall}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={handleInstallClick}
              className="flex-1 py-2 px-3.5 bg-gradient-to-r from-brand-blue to-indigo-600 hover:from-indigo-600 hover:to-brand-blue text-white text-xs font-bold rounded-xl shadow-glow-blue flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isIOS ? 'Xem hướng dẫn cài trên iPhone' : 'Cài đặt ngay (1-Chạm)'}</span>
            </button>
            <button
              onClick={handleDismissInstall}
              className="py-2 px-3 text-slate-500 hover:text-slate-800 text-xs font-semibold rounded-xl"
            >
              Không nhắc lại
            </button>
          </div>
        </div>
      )}

      {/* 3. IOS SAFARI STEP-BY-STEP INSTALL GUIDE MODAL */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Cài đặt trên iPhone / iPad</h3>
                  <p className="text-[10px] text-slate-500">Chỉ 2 bước đơn giản qua trình duyệt Safari</p>
                </div>
              </div>
              <button 
                onClick={() => setShowIOSGuide(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl font-bold text-xs shrink-0 flex items-center justify-center w-7 h-7">
                  1
                </div>
                <div>
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Bấm nút <strong>Chia sẻ (Share)</strong></span>
                    <Share className="h-4 w-4 text-blue-600 inline" />
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Nút nằm ở thanh công cụ dưới đáy màn hình Safari trên iPhone.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl font-bold text-xs shrink-0 flex items-center justify-center w-7 h-7">
                  2
                </div>
                <div>
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Chọn <strong>"Thêm vào MH chính"</strong></span>
                    <PlusSquare className="h-4 w-4 text-emerald-600 inline" />
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    (Add to Home Screen) rồi bấm <strong>Thêm</strong> ở góc trên bên phải.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowIOSGuide(false);
                setShowInstallBanner(false);
              }}
              className="w-full py-2.5 bg-brand-blue hover:bg-brand-blue-dark text-white font-bold text-xs rounded-xl shadow-glow-blue text-center transition-all cursor-pointer"
            >
              Đã hiểu & Đóng hướng dẫn
            </button>
          </div>
        </div>
      )}
    </>
  );
};
