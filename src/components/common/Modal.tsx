import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  closeOnBackdropClick?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  children,
  size = 'md',
  closeOnBackdropClick = true
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;

      // Lock scrolling on both html and body
      const htmlElement = document.documentElement;

      // Save original styles
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = htmlElement.style.overflow;
      const originalBodyHeight = document.body.style.height;
      const originalHtmlHeight = htmlElement.style.height;

      // Apply locks
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
      htmlElement.style.overflow = 'hidden';
      htmlElement.style.height = '100vh';

      return () => {
        // Restore original styles
        document.body.style.overflow = originalBodyOverflow;
        document.body.style.height = originalBodyHeight;
        htmlElement.style.overflow = originalHtmlOverflow;
        htmlElement.style.height = originalHtmlHeight;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={handleBackdropClick}
    >
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        onClick={handleBackdropClick}
      />
      <div
        className={`${sizeClasses[size]} w-full relative z-10 max-h-[90vh] overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
