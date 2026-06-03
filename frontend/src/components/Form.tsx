import { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, forwardRef } from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon: Icon, iconPosition = 'left', className = '', ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-xs font-medium text-app-text">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && iconPosition === 'left' && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Icon className="h-4 w-4 text-app-muted" />
            </div>
          )}
          <input
            ref={ref}
            className={`
              block w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-sm text-app-text
              outline-none transition-all duration-200
              focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-app-base/90
              disabled:opacity-50 disabled:cursor-not-allowed
              ${Icon && iconPosition === 'left' ? 'pl-10' : ''}
              ${Icon && iconPosition === 'right' ? 'pr-10' : ''}
              ${error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : ''}
              ${className}
            `}
            {...props}
          />
          {Icon && iconPosition === 'right' && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <Icon className="h-4 w-4 text-app-muted" />
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-rose-400">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, icon: Icon, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-xs font-medium text-app-text">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute top-3 left-3">
              <Icon className="h-4 w-4 text-app-muted" />
            </div>
          )}
          <textarea
            ref={ref}
            className={`
              block w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-sm text-app-text
              outline-none transition-all duration-200 resize-vertical
              focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-app-base/90
              disabled:opacity-50 disabled:cursor-not-allowed
              ${Icon ? 'pl-10' : ''}
              ${error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-rose-400">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, icon: Icon, options, placeholder, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-xs font-medium text-app-text">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute top-1/2 left-3 -translate-y-1/2">
              <Icon className="h-4 w-4 text-app-muted" />
            </div>
          )}
          <select
            ref={ref}
            className={`
              block w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-sm text-app-text
              outline-none transition-all duration-200 appearance-none cursor-pointer
              focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-app-base/90
              disabled:opacity-50 disabled:cursor-not-allowed
              ${Icon ? 'pl-10' : ''}
              ${error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : ''}
              ${className}
            `}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="bg-app-base text-app-muted">
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} className="bg-app-base text-app-text">
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute top-1/2 right-3 -translate-y-1/2 pointer-events-none">
            <svg className="h-4 w-4 text-app-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && (
          <p className="text-xs text-rose-400">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    loading = false,
    icon: Icon,
    iconPosition = 'left',
    children,
    className = '',
    disabled,
    ...props
  }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-app-bg disabled:opacity-50 disabled:cursor-not-allowed';

    const variantClasses = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-lg shadow-blue-500/25',
      secondary: 'bg-app-base text-app-text border border-app-border hover:bg-app-accent-soft focus:ring-app-border',
      outline: 'border border-app-border bg-transparent text-app-text hover:bg-app-accent-soft focus:ring-app-border',
      ghost: 'bg-transparent text-app-muted hover:bg-app-accent-soft focus:ring-app-border',
      danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-lg shadow-rose-500/25',
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs rounded-lg',
      md: 'px-4 py-2 text-sm rounded-lg',
      lg: 'px-6 py-3 text-base rounded-xl',
    };

    const iconClasses = iconPosition === 'left' ? 'mr-2' : 'ml-2';

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg className={`animate-spin ${iconClasses}`} height={size === 'sm' ? 12 : size === 'md' ? 16 : 20} width={size === 'sm' ? 12 : size === 'md' ? 16 : 20} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {children}
          </>
        ) : (
          <>
            {Icon && iconPosition === 'left' && <Icon className={iconClasses} />}
            {children}
            {Icon && iconPosition === 'right' && <Icon className={iconClasses} />}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

interface FormGroupProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function FormGroup({ children, title, description, className = '' }: FormGroupProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {(title || description) && (
        <div>
          {title && <h3 className="text-sm font-semibold text-app-text">{title}</h3>}
          {description && <p className="text-xs text-app-muted mt-1">{description}</p>}
        </div>
      )}
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Alert({ type = 'info', title, children, className = '' }: AlertProps) {
  const typeClasses = {
    info: 'border-blue-500/40 bg-blue-500/10 text-blue-200',
    success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
    warning: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
    error: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
  };

  return (
    <div className={`rounded-lg border p-4 ${typeClasses[type]} ${className}`}>
      {title && <h4 className="font-semibold mb-1">{title}</h4>}
      <div className="text-xs">{children}</div>
    </div>
  );
}