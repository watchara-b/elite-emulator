import React from 'react';

export const FxExplosion = () => (
  <svg viewBox="0 0 64 64" className="w-full h-full">
    <circle cx="32" cy="32" r="24" fill="#fbbf24" opacity="0.3" />
    <circle cx="32" cy="32" r="16" fill="#f97316" opacity="0.5" />
    <circle cx="32" cy="32" r="8" fill="#fef3c7" opacity="0.8" />
    <path d="M32 8L36 22L48 12L38 24L56 26L38 32L52 44L36 36L40 56L32 38L24 56L28 36L12 44L26 32L8 26L26 24L16 12L28 22Z" fill="#ef4444" opacity="0.7" />
    <circle cx="20" cy="16" r="4" fill="#fbbf24" opacity="0.6" />
    <circle cx="48" cy="44" r="3" fill="#f97316" opacity="0.5" />
    <circle cx="14" cy="42" r="3" fill="#fbbf24" opacity="0.4" />
  </svg>
);

export const FxSmoke = () => (
  <svg viewBox="0 0 64 64" className="w-full h-full">
    <circle cx="32" cy="40" r="12" fill="#9ca3af" opacity="0.4" />
    <circle cx="24" cy="32" r="10" fill="#9ca3af" opacity="0.3" />
    <circle cx="40" cy="28" r="11" fill="#d1d5db" opacity="0.3" />
    <circle cx="32" cy="22" r="8" fill="#d1d5db" opacity="0.25" />
    <circle cx="26" cy="16" r="6" fill="#e5e7eb" opacity="0.2" />
    <circle cx="38" cy="14" r="5" fill="#e5e7eb" opacity="0.15" />
  </svg>
);

export const FxHeal = () => (
  <svg viewBox="0 0 64 64" className="w-full h-full">
    <circle cx="32" cy="32" r="24" fill="#22c55e" opacity="0.1" />
    <circle cx="32" cy="32" r="16" fill="#22c55e" opacity="0.15" />
    <rect x="28" y="16" width="8" height="32" fill="#22c55e" opacity="0.6" rx="2" />
    <rect x="16" y="28" width="32" height="8" fill="#22c55e" opacity="0.6" rx="2" />
    <circle cx="16" cy="16" r="2" fill="#86efac" opacity="0.5" />
    <circle cx="48" cy="18" r="1.5" fill="#86efac" opacity="0.4" />
    <circle cx="14" cy="46" r="1.5" fill="#86efac" opacity="0.4" />
    <circle cx="50" cy="48" r="2" fill="#86efac" opacity="0.3" />
    <circle cx="44" cy="12" r="1" fill="#86efac" opacity="0.5" />
  </svg>
);

export const FxMuzzleFlash = () => (
  <svg viewBox="0 0 64 64" className="w-full h-full">
    <circle cx="32" cy="32" r="12" fill="#fef3c7" opacity="0.6" />
    <circle cx="32" cy="32" r="6" fill="#fef9c3" opacity="0.9" />
    <path d="M32 10L34 26L32 28L30 26Z" fill="#fbbf24" opacity="0.7" />
    <path d="M32 54L34 38L32 36L30 38Z" fill="#fbbf24" opacity="0.7" />
    <path d="M10 32L26 30L28 32L26 34Z" fill="#fbbf24" opacity="0.7" />
    <path d="M54 32L38 30L36 32L38 34Z" fill="#fbbf24" opacity="0.7" />
    <path d="M16 16L26 28L24 30Z" fill="#fbbf24" opacity="0.4" />
    <path d="M48 16L38 28L40 30Z" fill="#fbbf24" opacity="0.4" />
    <path d="M16 48L26 36L24 34Z" fill="#fbbf24" opacity="0.4" />
    <path d="M48 48L38 36L40 34Z" fill="#fbbf24" opacity="0.4" />
  </svg>
);

export const UiCoin = () => (
  <svg viewBox="0 0 64 64" className="w-full h-full">
    <circle cx="32" cy="32" r="28" fill="#eab308" stroke="#ca8a04" strokeWidth="3" />
    <circle cx="32" cy="32" r="22" fill="#fbbf24" />
    <circle cx="32" cy="32" r="18" stroke="#ca8a04" strokeWidth="1.5" fill="none" />
    <text x="32" y="40" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#92400e">$</text>
  </svg>
);

export const UiHeart = () => (
  <svg viewBox="0 0 64 64" className="w-full h-full">
    <path d="M32 56L8 32Q0 20 12 12Q20 6 32 18Q44 6 52 12Q64 20 56 32Z" fill="#ef4444" stroke="#b91c1c" strokeWidth="2" />
    <path d="M32 48L14 30Q8 22 16 16Q22 12 32 22" fill="#f87171" opacity="0.5" />
  </svg>
);

export const UiSword = () => (
  <svg viewBox="0 0 64 64" className="w-full h-full">
    <rect x="30" y="4" width="4" height="36" fill="#9ca3af" rx="1" />
    <path d="M28 4L32 0L36 4Z" fill="#d1d5db" />
    <rect x="22" y="38" width="20" height="4" fill="#78350f" rx="2" />
    <rect x="28" y="42" width="8" height="12" fill="#92400e" rx="2" />
    <circle cx="32" cy="56" r="4" fill="#b45309" />
    <path d="M30 8L32 4L34 8L34 30L30 30Z" fill="#d1d5db" opacity="0.4" />
  </svg>
);

export const UiShield = () => (
  <svg viewBox="0 0 64 64" className="w-full h-full">
    <path d="M32 4L56 16V36Q56 52 32 60Q8 52 8 36V16Z" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2" />
    <path d="M32 10L50 20V34Q50 48 32 54Q14 48 14 34V20Z" fill="#60a5fa" />
    <path d="M32 18L32 46M22 32L42 32" stroke="#dbeafe" strokeWidth="4" strokeLinecap="round" />
  </svg>
);
