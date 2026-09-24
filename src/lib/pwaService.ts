/**
 * PWA Service & Push Notification Engine for CMS Trung Hải
 * Hỗ trợ thông báo ngoài màn hình khóa, rung chuông trên iOS/Android/Desktop
 */

export interface NotificationPayload {
  title: string;
  body: string;
  documentId?: string;
  type?: 'ACTION_REQUIRED' | 'APPROVED' | 'REJECTED' | 'SLA_VIOLATION' | 'SLA_WARNING' | 'INFO' | string;
  icon?: string;
  badge?: string;
}

// 1. Đăng ký Service Worker
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    console.log('[PWA] Service Worker registered successfully:', registration.scope);
    return registration;
  } catch (error) {
    console.warn('[PWA] Service Worker registration failed:', error);
    return null;
  }
};

// 2. Kiểm tra quyền thông báo hiện tại
export const getNotificationPermission = (): NotificationPermission => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
};

// 3. Yêu cầu cấp quyền nhận thông báo từ người dùng
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Gửi thông báo chào mừng & xác nhận thành công
      sendDeviceNotification({
        title: '🔔 Đã bật thông báo CMS Trung Hải',
        body: 'Bạn sẽ nhận được cảnh báo ngay khi có hồ sơ mới cần duyệt hoặc sắp quá hạn SLA.',
        type: 'INFO'
      });
      return true;
    }
    return false;
  } catch (e) {
    console.warn('[PWA] Request notification permission error:', e);
    return false;
  }
};

// 4. Gửi thông báo đến thiết bị (Hiện ngoài màn hình khóa / Notification Tray)
export const sendDeviceNotification = (payload: NotificationPayload) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const title = payload.title || 'CMS Trung Hải';
  const options: NotificationOptions = {
    body: payload.body,
    icon: payload.icon || '/logo.png',
    badge: payload.badge || '/logo.png',
    tag: payload.documentId ? `doc-${payload.documentId}` : `notif-${Date.now()}`,
    data: {
      url: payload.documentId ? `/?doc=${payload.documentId}` : '/',
      documentId: payload.documentId
    },
    // Vibrate pattern: 100ms vibrate, 50ms pause, 100ms vibrate
    // @ts-ignore
    vibrate: [150, 80, 150]
  };

  // Sử dụng ServiceWorker Registration để hiển thị thông báo ổn định hơn trên Mobile
  if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification(title, options);
    }).catch(() => {
      new Notification(title, options);
    });
  } else {
    try {
      new Notification(title, options);
    } catch (e) {
      console.warn('[PWA] Fallback Notification failed:', e);
    }
  }
};

// 5. Kiểm tra xem người dùng đang mở dưới dạng App độc lập (PWA Standalone) hay qua Trình duyệt
export const isStandaloneApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-ignore
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
};

// 6. Nhận biết thiết bị di động / Tablet
export const isMobileOrTabletDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Boolean(
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 2)
  );
};

// 7. Cập nhật số thông báo trên Icon App ngoài màn hình chính (App Badging API) & Tiêu đề Tab
export const updateAppBadge = (count: number) => {
  if (typeof window === 'undefined') return;

  // 1. Cập nhật tiêu đề trang web / App Title
  try {
    const baseTitle = 'CMS Trung Hải - Quản Lý & Trình Ký Văn Bản';
    if (count > 0) {
      document.title = `(${count}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  } catch (e) {}

  // 2. Cập nhật Huy hiệu ngoài màn hình chính (App Badging API cho iOS 16.4+ và Android/Desktop PWA)
  try {
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        navigator.setAppBadge(count).catch((err) => {
          console.debug('[PWA] navigator.setAppBadge:', err);
        });
      } else {
        navigator.clearAppBadge().catch(() => {});
      }
    }
  } catch (e) {
    console.debug('[PWA] updateAppBadge error:', e);
  }

  // 3. Gửi thông điệp cập nhật badge cho Service Worker
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SET_BADGE',
        count: count
      });
    }
  } catch (e) {}
};
