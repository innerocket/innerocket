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
      className={`bg-white shadow-md rounded-lg overflow-hidden ${className}`}
    >
      {hasHeader && (
        <div className={`px-6 py-4 ${headerClassName}`}>
          {title &&
            (typeof title === 'string' ? (
              <h2 className="text-xl font-bold text-gray-800 mb-1">{title}</h2>
            ) : (
              title
            ))}
          {subtitle &&
            (typeof subtitle === 'string' ? (
              <p className="text-gray-500 text-sm">{subtitle}</p>
            ) : (
              subtitle
            ))}
        </div>
      )}
      <div className={`px-6 py-4 ${hasHeader ? '' : 'pt-6'} ${bodyClassName}`}>
        {children}
      </div>
      {footer && (
        <div
          className={`px-6 py-4 bg-gray-50 border-t border-gray-100 ${footerClassName}`}
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
          <h3 className="text-lg font-medium text-gray-700 mb-2">{title}</h3>
        ) : (
          <div className="mb-2">{title}</div>
        ))}
      <div>{children}</div>
    </div>
  );
}
