import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'gradient' | 'bordered' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  style?: React.CSSProperties;
}

export default function Card({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  hover = false,
  style,
}: CardProps) {
  const variantStyle: React.CSSProperties = {
    default:  { background: 'var(--card-bg)', border: '1px solid var(--card-border)' },
    gradient: { background: 'var(--card-bg)', border: '1px solid var(--card-border)' },
    bordered: { background: 'var(--card-bg)', border: '2px solid var(--border-strong)' },
    elevated: { background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-md)' },
  }[variant];

  const paddingClass = {
    none: '',
    sm:   'p-3',
    md:   'p-4',
    lg:   'p-5',
  }[padding];

  return (
    <div
      className={`rounded-xl transition-all duration-200 ${paddingClass} ${hover ? 'hover:scale-[1.015] hover:shadow-card-hover' : ''} ${className}`}
      style={{ ...variantStyle, ...style }}
    >
      {children}
    </div>
  );
}

/* ── CardHeader ─────────────────────────────────── */
interface CardHeaderProps {
  children?: ReactNode;
  className?: string;
  icon?: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}

export function CardHeader({ children, className = '', icon, title, subtitle, action }: CardHeaderProps) {
  if (title || subtitle || icon) {
    return (
      <div className={`mb-4 flex items-start justify-between gap-3 ${className}`}>
        <div className="flex items-start gap-3">
          {icon && (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
              style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}
            >
              {icon}
            </div>
          )}
          <div>
            {title && (
              <h3 className="text-[13px] font-700 leading-snug" style={{ color: 'var(--app-text)' }}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--app-text-muted)' }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {(action || children) && (
          <div className="shrink-0">{action || children}</div>
        )}
      </div>
    );
  }
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

/* ── CardContent ────────────────────────────────── */
interface CardContentProps {
  children?: ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={className}>{children}</div>;
}

/* ── CardFooter ─────────────────────────────────── */
interface CardFooterProps {
  children?: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div
      className={`mt-4 pt-4 ${className}`}
      style={{ borderTop: '1px solid var(--card-border)' }}
    >
      {children}
    </div>
  );
}

/* ── StatCard ───────────────────────────────────── */
interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: { value: string; isPositive: boolean } | null;
  className?: string;
  color?: 'blue' | 'green' | 'purple' | 'amber' | 'rose';
}

const colorMap = {
  blue:   { bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.2)',  icon: 'rgba(59,130,246,0.15)', text: '#60a5fa' },
  green:  { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.2)',  icon: 'rgba(16,185,129,0.15)', text: '#34d399' },
  purple: { bg: 'rgba(139,92,246,0.1)',  border: 'rgba(139,92,246,0.2)',  icon: 'rgba(139,92,246,0.15)', text: '#a78bfa' },
  amber:  { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)',  icon: 'rgba(245,158,11,0.15)', text: '#fbbf24' },
  rose:   { bg: 'rgba(244,63,94,0.1)',   border: 'rgba(244,63,94,0.2)',   icon: 'rgba(244,63,94,0.15)',  text: '#fb7185' },
};

export function StatCard({ title, value, icon, trend, className = '', color = 'blue' }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div
      className={`rounded-xl p-4 transition-all duration-200 hover:scale-[1.02] ${className}`}
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-700 uppercase tracking-wider" style={{ color: c.text }}>
            {title}
          </div>
          <div className="mt-2 text-2xl font-800 stat-number" style={{ color: 'var(--app-text)' }}>
            {typeof value === 'number' ? value.toLocaleString('tr-TR') : value}
          </div>
          {trend && (
            <div className={`mt-1 text-[11px] font-500 ${trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </div>
          )}
        </div>
        {icon && (
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: c.icon, color: c.text }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
