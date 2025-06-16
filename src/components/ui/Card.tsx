import type { JSX } from 'preact';

export interface CardProps {
  title?: string | JSX.Element;
  subtitle?: string | JSX.Element;
  children: JSX.Element | JSX.Element[] | string;
  footer?: JSX.Element;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
}

export function Card({
  title,
  subtitle,
  children,
  footer,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
}: CardProps) {
  const hasHeader = title || subtitle;

  return (
    <div
      className={`w-full bg-white border border-gray-200 rounded-lg transition-all duration-200 dark:bg-gray-800 dark:border-gray-700 ${className}`}
    >
      {hasHeader && (
        <div
          className={`p-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 rounded-t-lg dark:from-gray-800 dark:to-gray-700 dark:border-gray-700 ${headerClassName}`}
        >
          {title &&
            (typeof title === 'string' ? (
              <h5 className="text-xl font-semibold text-gray-900 dark:text-white">
                {title}
              </h5>
            ) : (
              title
            ))}
          {subtitle &&
            (typeof subtitle === 'string' ? (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {subtitle}
              </p>
            ) : (
              subtitle
            ))}
        </div>
      )}
      <div
        className={`p-6 ${hasHeader ? '' : 'rounded-t-lg'} ${bodyClassName}`}
      >
        {children}
      </div>
      {footer && (
        <div
          className={`p-6 bg-gray-50 border-t border-gray-200 rounded-b-lg dark:bg-gray-700 dark:border-gray-600 ${footerClassName}`}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

export interface CardSectionProps {
  title?: string | JSX.Element;
  children: JSX.Element | JSX.Element[] | string;
  className?: string;
}

export function CardSection({
  title,
  children,
  className = '',
}: CardSectionProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {title &&
        (typeof title === 'string' ? (
          <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
            {title}
          </h3>
        ) : (
          <div className="mb-2">{title}</div>
        ))}
      <div>{children}</div>
    </div>
  );
}
