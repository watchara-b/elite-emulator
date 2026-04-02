import React from 'react';

export const ResTree = () => (
  <svg viewBox="0 0 64 64" className="w-full h-full filter drop-shadow-md">
    <rect x="26" y="36" width="12" height="24" fill="#78350f" rx="2" />
    <circle cx="32" cy="26" r="20" fill="#15803d" />
    <circle cx="24" cy="20" r="12" fill="#16a34a" />
    <circle cx="40" cy="22" r="14" fill="#16a34a" />
    <circle cx="32" cy="12" r="10" fill="#22c55e" />
  </svg>
);

export const ResRock = () => (
  <svg viewBox="0 0 64 64" className="w-full h-full filter drop-shadow-md">
    <path d="M10 50L20 20L40 15L55 35L50 55Z" fill="#6b7280" />
    <path d="M15 45L25 25L35 20L45 35L40 50Z" fill="#9ca3af" />
    <path d="M20 40L28 30L32 30L35 40Z" fill="#d1d5db" />
  </svg>
);

export const ResGold = () => (
  <svg viewBox="0 0 64 64" className="w-full h-full filter drop-shadow-md">
    <path d="M12 52L22 22L42 17L57 37L52 57Z" fill="#4b5563" />
    <circle cx="25" cy="35" r="5" fill="#fbbf24" />
    <circle cx="35" cy="25" r="4" fill="#f59e0b" />
    <circle cx="45" cy="40" r="6" fill="#fbbf24" />
    <circle cx="30" cy="45" r="3" fill="#fcd34d" />
  </svg>
);

export const ResOil = () => (
  <svg viewBox="0 0 64 64" className="w-full h-full filter drop-shadow-md">
    <ellipse cx="32" cy="52" rx="18" ry="6" fill="#1e293b" />
    <rect x="28" y="10" width="8" height="36" fill="#374151" />
    <rect x="22" y="8" width="20" height="6" fill="#4b5563" rx="2" />
    <rect x="18" y="20" width="28" height="4" fill="#6b7280" />
    <circle cx="32" cy="48" r="8" fill="#1e293b" />
    <circle cx="32" cy="48" r="5" fill="#334155" />
    <path d="M30 46Q32 40 34 46" fill="#6366f1" opacity="0.6" />
  </svg>
);

export const ResCrystal = () => (
  <svg viewBox="0 0 64 64" className="w-full h-full filter drop-shadow-md">
    <path d="M32 8L40 30L36 56L28 56L24 30Z" fill="#8b5cf6" />
    <path d="M32 8L40 30L32 26Z" fill="#a78bfa" />
    <path d="M20 22L28 38L22 52L14 40Z" fill="#7c3aed" />
    <path d="M20 22L28 38L24 30Z" fill="#a78bfa" />
    <path d="M44 20L50 40L46 52L40 34Z" fill="#6d28d9" />
    <circle cx="30" cy="18" r="2" fill="#e0e7ff" opacity="0.8" />
    <circle cx="46" cy="28" r="1.5" fill="#e0e7ff" opacity="0.6" />
  </svg>
);
