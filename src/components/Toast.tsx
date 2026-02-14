import { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

type ToastType = 'info' | 'error';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  exiting: boolean;
}

/**
 * 轻量 Toast hook — 匹配 Ink & Paper 设计体系
 * 
 * 用法:
 *   const { showToast, ToastPortal } = useToast();
 *   showToast('已复制');
 *   showToast('操作失败', 'error');
 *   // 在 JSX 末尾放置: <ToastPortal />
 */
export function useToast(duration = 2500) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type, exiting: false }]);

    // 开始退出动画
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    }, duration);

    // 移除
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration + 300);
  }, [duration]);

  const ToastPortal = useCallback(() => {
    if (toasts.length === 0) return null;

    return createPortal(
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[300] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={[
              'px-5 py-2.5 text-sm font-serif shadow-lg pointer-events-auto',
              'transition-all duration-300',
              toast.exiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0',
              toast.type === 'error'
                ? 'bg-ink text-paper border-l-2 border-accent'
                : 'bg-ink text-paper',
            ].join(' ')}
            style={{
              animation: toast.exiting ? undefined : 'toastIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>,
      document.body
    );
  }, [toasts]);

  return { showToast, ToastPortal };
}
