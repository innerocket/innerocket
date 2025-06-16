import type { ComponentChildren } from 'preact';

interface EmptyStateProps {
  icon: ComponentChildren;
  title: string;
  subtitle?: string;
  children?: ComponentChildren;
}

export function EmptyState({
  icon,
  title,
  subtitle,
  children,
}: EmptyStateProps) {
  return (
    <div className="p-6 text-center text-gray-600 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-400">
      <div className="flex flex-col items-center space-y-3">
        <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center dark:bg-gray-600">
          {icon}
        </div>
        <div>
          <p className="font-medium">{title}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
