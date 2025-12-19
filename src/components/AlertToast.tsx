import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface AlertMessage {
  id: string;
  type: AlertType;
  title: string;
  message?: string;
  duration?: number;
}

interface AlertToastProps {
  alerts: AlertMessage[];
  onRemove: (id: string) => void;
}

const getAlertConfig = (type: AlertType) => {
  const configs = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: <CheckCircle className="text-green-600" size={20} />,
      titleColor: 'text-green-800',
      messageColor: 'text-green-700',
      progressBg: 'bg-green-500',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: <AlertTriangle className="text-red-600" size={20} />,
      titleColor: 'text-red-800',
      messageColor: 'text-red-700',
      progressBg: 'bg-red-500',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: <AlertCircle className="text-yellow-600" size={20} />,
      titleColor: 'text-yellow-800',
      messageColor: 'text-yellow-700',
      progressBg: 'bg-yellow-500',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: <Info className="text-blue-600" size={20} />,
      titleColor: 'text-blue-800',
      messageColor: 'text-blue-700',
      progressBg: 'bg-blue-500',
    },
  };
  return configs[type];
};

const AlertItem: React.FC<{
  alert: AlertMessage;
  onRemove: (id: string) => void;
}> = ({ alert, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);
  const config = getAlertConfig(alert.type);

  useEffect(() => {
    if (!alert.duration) return;

    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(alert.id), 300);
    }, alert.duration);

    return () => clearTimeout(timer);
  }, [alert.id, alert.duration, onRemove]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(alert.id), 300);
  };

  return (
    <div
      className={`
        transform transition-all duration-300 ease-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}
    >
      <div
        className={`
          ${config.bg} ${config.border}
          border rounded-xl shadow-lg p-4 mb-3 max-w-sm
          animate-in fade-in slide-in-from-right-10 duration-300
        `}
      >
        <div className="flex gap-3">
          <div className="flex-shrink-0 pt-0.5">{config.icon}</div>
          <div className="flex-1">
            <h3 className={`font-bold text-sm ${config.titleColor}`}>
              {alert.title}
            </h3>
            {alert.message && (
              <p className={`text-xs mt-1 ${config.messageColor}`}>
                {alert.message}
              </p>
            )}
            {alert.duration && (
              <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`${config.progressBg} h-full`}
                  style={{
                    animation: `shrink ${alert.duration}ms linear forwards`,
                  }}
                />
              </div>
            )}
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export const AlertToast: React.FC<AlertToastProps> = ({ alerts, onRemove }) => {
  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {alerts.map((alert) => (
        <AlertItem
          key={alert.id}
          alert={alert}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

export const useAlert = () => {
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);

  const addAlert = (
    type: AlertType,
    title: string,
    message?: string,
    duration: number = 4000
  ) => {
    const id = Date.now().toString();
    setAlerts((prev) => [
      ...prev,
      { id, type, title, message, duration },
    ]);
  };

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  const success = (title: string, message?: string) =>
    addAlert('success', title, message, 3000);
  const error = (title: string, message?: string) =>
    addAlert('error', title, message, 5000);
  const warning = (title: string, message?: string) =>
    addAlert('warning', title, message, 4000);
  const info = (title: string, message?: string) =>
    addAlert('info', title, message, 4000);

  return {
    alerts,
    removeAlert,
    success,
    error,
    warning,
    info,
  };
};
