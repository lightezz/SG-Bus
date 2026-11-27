import type { BusType } from '../types/bus';

interface BusDeckIconProps {
  type: BusType;
  className?: string;
}

export function BusDeckIcon({ type, className = 'w-5 h-3.5' }: BusDeckIconProps) {
  if (type === 'DD') {
    return (
      <svg
        viewBox="0 0 28 20"
        fill="none"
        className={className}
        aria-hidden="true"
      >
        <rect x="2" y="2" width="24" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
        <line x1="2.5" y1="8.5" x2="25.5" y2="8.5" stroke="currentColor" strokeWidth="1.3" />
        <line x1="8" y1="2.5" x2="8" y2="8.5" stroke="currentColor" strokeWidth="1.2" />
        <line x1="14" y1="2.5" x2="14" y2="8.5" stroke="currentColor" strokeWidth="1.2" />
        <line x1="20" y1="2.5" x2="20" y2="8.5" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="7.5" cy="16.5" r="2" fill="currentColor" />
        <circle cx="20.5" cy="16.5" r="2" fill="currentColor" />
      </svg>
    );
  }

  if (type === 'BD') {
    return (
      <svg
        viewBox="0 0 34 18"
        fill="none"
        className={className}
        aria-hidden="true"
      >
        <rect x="1.5" y="4" width="13.5" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="18" y="4" width="14.5" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M15 6H18M15 11H18" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="6.5" cy="14.5" r="1.8" fill="currentColor" />
        <circle cx="19" cy="14.5" r="1.8" fill="currentColor" />
        <circle cx="28" cy="14.5" r="1.8" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 28 18"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="4" width="24" height="9.5" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
      <line x1="9" y1="4.5" x2="9" y2="9.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="16" y1="4.5" x2="16" y2="9.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="2.5" y1="9.5" x2="25.5" y2="9.5" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="7.5" cy="15" r="1.9" fill="currentColor" />
      <circle cx="20.5" cy="15" r="1.9" fill="currentColor" />
    </svg>
  );
}
