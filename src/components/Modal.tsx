import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  variant?: 'default' | 'danger';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, variant = 'default' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className={`bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 ${
        variant === 'danger' ? 'border-t-4 border-red-500' : 'border-t-4 border-blue-500'
      }`}>
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h3 className={`text-lg font-bold ${variant === 'danger' ? 'text-red-600' : 'text-gray-800'}`}>
            {variant === 'danger' && <AlertTriangle className="inline mr-2 h-5 w-5" />}
            {title}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};