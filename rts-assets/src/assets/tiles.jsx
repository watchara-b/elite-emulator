import React from 'react';

export const TileGrass = () => (
  <svg viewBox="0 0 64 64" className="w-full h-full">
    <rect width="64" height="64" fill="#84cc16" />
    <path d="M10 20Q15 10 20 20" stroke="#65a30d" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M40 45Q45 35 50 45" stroke="#65a30d" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M25 50Q30 40 35 50" stroke="#65a30d" strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>
);

export const TileWater = () => (
  <svg viewBox="0 0 64 64" className="w-full h-full">
    <rect width="64" height="64" fill="#3b82f6" />
    <path d="M10 20Q18 15 26 20T42 20T58 20" stroke="#60a5fa" strokeWidth="2" fill="none" />
    <path d="M6 40Q14 35 22 40T38 40T54 40" stroke="#60a5fa" strokeWidth="2" fill="none" />
  </svg>
);

export const TileDirt = () => (
  <svg viewBox="0 0 64 64" className="w-full h-full">
    <rect width="64" height="64" fill="#d97706" />
    <circle cx="15" cy="15" r="2" fill="#b45309" />
    <circle cx="45" cy="25" r="3" fill="#b45309" />
    <circle cx="25" cy="50" r="2" fill="#b45309" />
    <circle cx="50" cy="45" r="1.5" fill="#b45309" />
  </svg>
);

export const TileSand = () => (
  <svg viewBox="0 0 64 64" className="w-full h-full">
    <rect width="64" height="64" fill="#fbbf24" />
    <circle cx="12" cy="18" r="1" fill="#f59e0b" />
    <circle cx="40" cy="30" r="1.5" fill="#f59e0b" />
    <circle cx="28" cy="52" r="1" fill="#f59e0b" />
    <path d="M5 58Q20 52 35 58T64 55V64H0Z" fill="#f59e0b" opacity="0.4" />
  </svg>
);

export const TileRoad = () => (
  <svg viewBox="0 0 64 64" className="w-full h-full">
    <rect width="64" height="64" fill="#6b7280" />
    <rect x="30" y="4" width="4" height="12" fill="#fbbf24" rx="1" />
    <rect x="30" y="26" width="4" height="12" fill="#fbbf24" rx="1" />
    <rect x="30" y="48" width="4" height="12" fill="#fbbf24" rx="1" />
    <rect x="0" y="0" width="64" height="3" fill="#4b5563" />
    <rect x="0" y="61" width="64" height="3" fill="#4b5563" />
  </svg>
);
