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
      className={`w-full bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700 ${className}`}
    >
      {hasHeader && (
        <div
          className={`p-4 bg-white border-b border-gray-200 rounded-t-lg dark:bg-gray-800 dark:border-gray-700 ${headerClassName}`}
        >
          {title &&
            (typeof title === 'string' ? (
              <h5 className="text-xl font-medium text-gray-900 dark:text-white">
                {title}
              </h5>
            ) : (
              title
            ))}
          {subtitle &&
            (typeof subtitle === 'string' ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {subtitle}
              </p>
            ) : (
              subtitle
            ))}
        </div>
      )}
      <div
        className={`p-4 ${hasHeader ? '' : 'rounded-t-lg'} ${bodyClassName}`}
      >
        {children}
      </div>
      {footer && (
        <div
          className={`p-4 bg-gray-50 border-t border-gray-200 rounded-b-lg dark:bg-gray-700 dark:border-gray-600 ${footerClassName}`}
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
