import { useEffect, useState } from 'preact/hooks';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationProps {
  message: string;
  type: NotificationType;
  duration?: number;
  onClose: () => void;
}

export function Notification({
  message,
  type,
  duration = 5000,
  onClose,
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for animation to complete
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [duration, onClose]);

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'text-green-800 bg-green-50 border-green-300 dark:border-green-800 dark:bg-gray-800 dark:text-green-400';
      case 'error':
        return 'text-red-800 bg-red-50 border-red-300 dark:border-red-800 dark:bg-gray-800 dark:text-red-400';
      case 'warning':
        return 'text-yellow-800 bg-yellow-50 border-yellow-300 dark:border-yellow-800 dark:bg-gray-800 dark:text-yellow-300';
      case 'info':
      default:
        return 'text-blue-800 bg-blue-50 border-blue-300 dark:border-blue-800 dark:bg-gray-800 dark:text-blue-400';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <XCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'info':
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className={`flex items-center p-4 mb-4 border rounded-lg ${getStyles()}`}
        role="alert"
      >
        <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 mr-3">
          {getIcon()}
        </div>
        <div className="text-sm font-normal">{message}</div>
        <button
          type="button"
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="ml-auto -mx-1.5 -my-1.5 rounded-lg focus:ring-2 p-1.5 inline-flex items-center justify-center h-8 w-8 dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-gray-700"
          aria-label="Close"
        >
          <span className="sr-only">Close</span>
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export interface NotificationItem {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationContainerProps {
  notifications: NotificationItem[];
  onRemove: (id: string) => void;
}

export function NotificationContainer({
  notifications,
  onRemove,
}: NotificationContainerProps) {
  return (
    <>
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          onClose={() => onRemove(notification.id)}
        />
      ))}
    </>
  );
}
