interface RangeLogoProps {
  size?: number;
  variant?: 'default' | 'function' | 'minimal' | 'mark';
  light?: boolean;
  className?: string;
}

export function RangeLogo({ size = 48, variant = 'default', light = false, className = '' }: RangeLogoProps) {
  const primary = light ? '#ffffff' : '#1e3a2f'; // forest
  const accent = light ? '#ffffff' : '#4a7c67';  // sage

  if (variant === 'function') {
    // f(x) style - domain to range mapping
    return (
      <svg width={size} height={size * 0.6} viewBox="0 0 48 28" fill="none" className={className}>
        <circle cx="8" cy="14" r="5" stroke={primary} strokeWidth="2" fill="none" />
        <path d="M15 14H29" stroke={primary} strokeWidth="2" strokeLinecap="round" />
        <path d="M25 10L30 14L25 18" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="38" cy="14" r="5" fill={accent} />
      </svg>
    );
  }

  if (variant === 'minimal') {
    return (
      <svg width={size} height={size * 0.5} viewBox="0 0 48 24" fill="none" className={className}>
        <path d="M4 12H36" stroke={primary} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M30 6L38 12L30 18" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="42" cy="12" r="4" fill={accent} />
      </svg>
    );
  }

  if (variant === 'mark') {
    // Square icon mark
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
        <path d="M14 14V34M14 14H19M14 34H19" stroke={primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22 24H32" stroke={primary} strokeWidth="2" strokeLinecap="round" />
        <path d="M29 20L34 24L29 28" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="38" cy="24" r="4" fill={accent} />
      </svg>
    );
  }

  // Default - bracket with transformation arrow
  return (
    <svg width={size} height={size * 0.55} viewBox="0 0 48 26" fill="none" className={className}>
      {/* Input bracket */}
      <path d="M8 4V22M8 4H13M8 22H13" stroke={primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Arrow */}
      <path d="M17 13H31" stroke={primary} strokeWidth="2" strokeLinecap="round" />
      <path d="M27 8L33 13L27 18" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Output */}
      <circle cx="40" cy="13" r="4.5" fill={accent} />
    </svg>
  );
}
