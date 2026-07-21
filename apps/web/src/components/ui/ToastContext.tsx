/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/explicit-function-return-type */
'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import styles from './Toast.module.css';

const MotionDiv = motion.div as any;

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const shouldReduceMotion = useReducedMotion();

  const addToast = useCallback((type: ToastType, message: string, duration = 3000): void => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, duration }]);
  }, []);

  const success = useCallback(
    (message: string, duration?: number) => addToast('success', message, duration),
    [addToast],
  );
  const error = useCallback(
    (message: string, duration?: number) => addToast('error', message, duration),
    [addToast],
  );
  const info = useCallback(
    (message: string, duration?: number) => addToast('info', message, duration),
    [addToast],
  );

  const removeToast = useCallback((id: string): void => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info }}>
      {children}
      <div className={styles.toastContainer}>
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onClose={() => removeToast(toast.id)}
              shouldReduceMotion={!!shouldReduceMotion}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onClose,
  shouldReduceMotion,
}: {
  toast: ToastMessage;
  onClose: () => void;
  shouldReduceMotion: boolean;
}): React.ReactElement {
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, toast.duration);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [toast, onClose]);

  const variants = {
    initial: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 50, scale: 0.9 },
    animate: shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 },
    exit: shouldReduceMotion
      ? { opacity: 0 }
      : { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
  };

  return (
    <MotionDiv
      className={styles.toast}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout={!shouldReduceMotion}
    >
      {toast.type === 'success' && <CheckCircle className={styles.successIcon} size={18} />}
      {toast.type === 'error' && <XCircle className={styles.errorIcon} size={18} />}
      {toast.type === 'info' && <Info className={styles.infoIcon} size={18} />}
      <span>{toast.message}</span>
      <button className={styles.closeButton} onClick={onClose} aria-label="Close toast">
        <X size={14} />
      </button>
    </MotionDiv>
  );
}
