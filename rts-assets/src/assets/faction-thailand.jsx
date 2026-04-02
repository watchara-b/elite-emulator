// Siam Syndicate faction assets
// Colors: gold=#d4af37, rust=#8a5a2b, pink=#ff69b4, dark=#1a1a2e

export function ThaiCommandCenter() {
  return (
    <svg viewBox="0 0 128 128">
      <rect x="0" y="0" width="128" height="128" fill="#1a1a2e" />
      {/* Base platform */}
      <rect x="20" y="80" width="88" height="28" fill="#8a5a2b" rx="2" />
      {/* Temple body */}
      <rect x="30" y="50" width="68" height="30" fill="#d4af37" />
      {/* Tiered roof */}
      <polygon points="24,50 104,50 94,38 34,38" fill="#8a5a2b" />
      <polygon points="34,38 94,38 84,26 44,26" fill="#d4af37" />
      <polygon points="44,26 84,26 64,10" fill="#8a5a2b" />
      {/* Spire */}
      <rect x="62" y="4" width="4" height="8" fill="#d4af37" />
      {/* Pink neon glow */}
      <rect x="40" y="56" width="12" height="18" fill="#ff69b4" opacity="0.8" />
      <rect x="58" y="56" width="12" height="18" fill="#ff69b4" opacity="0.8" />
      <rect x="76" y="56" width="12" height="18" fill="#ff69b4" opacity="0.8" />
      {/* Scrap details */}
      <rect x="22" y="84" width="8" height="8" fill="#d4af37" opacity="0.5" />
      <rect x="98" y="84" width="8" height="8" fill="#d4af37" opacity="0.5" />
      {/* Energy aura */}
      <circle cx="64" cy="50" r="20" fill="#ff69b4" opacity="0.15" />
    </svg>
  );
}

export function ThaiScrapMiner() {
  return (
    <svg viewBox="0 0 128 128">
      <rect x="0" y="0" width="128" height="128" fill="#1a1a2e" />
      {/* Truck body */}
      <rect x="20" y="60" width="70" height="30" fill="#8a5a2b" rx="3" />
      {/* Cab */}
      <rect x="70" y="48" width="24" height="42" fill="#d4af37" rx="2" />
      <rect x="74" y="52" width="16" height="10" fill="#1a1a2e" />
      {/* Drill arm */}
      <rect x="8" y="54" width="20" height="6" fill="#d4af37" />
      <polygon points="8,54 8,60 2,57" fill="#8a5a2b" />
      {/* Pink storage tanks */}
      <circle cx="36" cy="56" r="8" fill="#ff69b4" opacity="0.8" />
      <circle cx="56" cy="56" r="8" fill="#ff69b4" opacity="0.8" />
      {/* Wheels */}
      <circle cx="34" cy="94" r="8" fill="#1a1a2e" stroke="#d4af37" strokeWidth="3" />
      <circle cx="76" cy="94" r="8" fill="#1a1a2e" stroke="#d4af37" strokeWidth="3" />
      {/* Exhaust */}
      <rect x="92" y="44" width="4" height="14" fill="#8a5a2b" />
      <circle cx="94" cy="40" r="4" fill="#ff69b4" opacity="0.3" />
    </svg>
  );
}

export function ThaiTukTukRocket() {
  return (
    <svg viewBox="0 0 128 128">
      <rect x="0" y="0" width="128" height="128" fill="#1a1a2e" />
      {/* Tuk-tuk body */}
      <rect x="30" y="55" width="55" height="30" fill="#d4af37" rx="4" />
      {/* Canopy */}
      <polygon points="35,55 80,55 75,38 40,38" fill="#8a5a2b" />
      {/* Armor plates */}
      <rect x="28" y="60" width="4" height="20" fill="#8a5a2b" />
      <rect x="83" y="60" width="4" height="20" fill="#8a5a2b" />
      {/* Rocket launchers */}
      <rect x="86" y="42" width="24" height="6" fill="#8a5a2b" rx="2" />
      <rect x="86" y="52" width="24" height="6" fill="#8a5a2b" rx="2" />
      <circle cx="112" cy="45" r="3" fill="#ff69b4" />
      <circle cx="112" cy="55" r="3" fill="#ff69b4" />
      {/* Wheels */}
      <circle cx="44" cy="90" r="7" fill="#1a1a2e" stroke="#d4af37" strokeWidth="3" />
      <circle cx="72" cy="90" r="7" fill="#1a1a2e" stroke="#d4af37" strokeWidth="3" />
      {/* Smoke trail */}
      <circle cx="18" cy="70" r="6" fill="#8a5a2b" opacity="0.3" />
      <circle cx="10" cy="65" r="4" fill="#8a5a2b" opacity="0.2" />
    </svg>
  );
}

export function ThaiNagaSub() {
  return (
    <svg viewBox="0 0 128 128">
      <rect x="0" y="0" width="128" height="128" fill="#1a1a2e" />
      {/* Serpent body */}
      <path d="M20,80 Q40,50 60,65 Q80,80 100,55 Q110,45 115,50" fill="none" stroke="#d4af37" strokeWidth="10" strokeLinecap="round" />
      {/* Mecha segments */}
      <circle cx="40" cy="62" r="6" fill="#8a5a2b" />
      <circle cx="60" cy="65" r="6" fill="#8a5a2b" />
      <circle cx="80" cy="68" r="6" fill="#8a5a2b" />
      {/* Head */}
      <polygon points="115,50 125,42 125,58" fill="#d4af37" />
      <circle cx="122" cy="47" r="2" fill="#ff69b4" />
      {/* Pink accents */}
      <circle cx="40" cy="62" r="3" fill="#ff69b4" opacity="0.7" />
      <circle cx="80" cy="68" r="3" fill="#ff69b4" opacity="0.7" />
      {/* Green accents */}
      <circle cx="60" cy="65" r="3" fill="#4ade80" opacity="0.7" />
      {/* Hood/crest */}
      <path d="M110,40 Q115,30 120,40" fill="#d4af37" />
      {/* Water ripple */}
      <ellipse cx="64" cy="100" rx="40" ry="4" fill="#ff69b4" opacity="0.15" />
    </svg>
  );
}

export function ThaiGoldenResonator() {
  return (
    <svg viewBox="0 0 128 128">
      <rect x="0" y="0" width="128" height="128" fill="#1a1a2e" />
      {/* Energy waves */}
      <circle cx="64" cy="64" r="50" fill="none" stroke="#ff69b4" strokeWidth="2" opacity="0.3" />
      <circle cx="64" cy="64" r="38" fill="none" stroke="#d4af37" strokeWidth="2" opacity="0.4" />
      {/* Pagoda base */}
      <rect x="40" y="85" width="48" height="20" fill="#8a5a2b" rx="2" />
      {/* Pagoda tiers */}
      <rect x="44" y="70" width="40" height="15" fill="#d4af37" />
      <rect x="48" y="55" width="32" height="15" fill="#d4af37" />
      <rect x="52" y="42" width="24" height="13" fill="#d4af37" />
      {/* Spire */}
      <polygon points="56,42 72,42 64,20" fill="#d4af37" />
      <circle cx="64" cy="18" r="3" fill="#ff69b4" />
      {/* Tier edges */}
      <line x1="44" y1="70" x2="84" y2="70" stroke="#8a5a2b" strokeWidth="2" />
      <line x1="48" y1="55" x2="80" y2="55" stroke="#8a5a2b" strokeWidth="2" />
      <line x1="52" y1="42" x2="76" y2="42" stroke="#8a5a2b" strokeWidth="2" />
      {/* Pink glow at top */}
      <circle cx="64" cy="30" r="12" fill="#ff69b4" opacity="0.2" />
    </svg>
  );
}

export function ThaiLotusToxin() {
  return (
    <svg viewBox="0 0 128 128">
      <rect x="0" y="0" width="128" height="128" fill="#1a1a2e" />
      {/* Toxic gas cloud */}
      <circle cx="64" cy="30" r="18" fill="#ff69b4" opacity="0.2" />
      <circle cx="48" cy="36" r="12" fill="#ff69b4" opacity="0.15" />
      <circle cx="80" cy="36" r="12" fill="#ff69b4" opacity="0.15" />
      {/* Lotus petals */}
      <ellipse cx="64" cy="72" rx="8" ry="18" fill="#ff69b4" />
      <ellipse cx="64" cy="72" rx="8" ry="18" fill="#ff69b4" transform="rotate(36,64,72)" />
      <ellipse cx="64" cy="72" rx="8" ry="18" fill="#ff69b4" transform="rotate(72,64,72)" />
      <ellipse cx="64" cy="72" rx="8" ry="18" fill="#ff69b4" transform="rotate(108,64,72)" />
      <ellipse cx="64" cy="72" rx="8" ry="18" fill="#ff69b4" transform="rotate(144,64,72)" />
      {/* Center */}
      <circle cx="64" cy="72" r="6" fill="#d4af37" />
      {/* Stem */}
      <rect x="62" y="86" width="4" height="24" fill="#4ade80" />
      {/* Dripping toxin */}
      <circle cx="52" cy="84" r="2" fill="#ff69b4" opacity="0.6" />
      <circle cx="76" cy="82" r="2" fill="#ff69b4" opacity="0.6" />
    </svg>
  );
}

export function ThaiScrapOutpost() {
  return (
    <svg viewBox="0 0 128 128">
      <rect x="0" y="0" width="128" height="128" fill="#1a1a2e" />
      {/* Ground */}
      <rect x="0" y="90" width="128" height="38" fill="#8a5a2b" opacity="0.5" />
      {/* Pink puddles */}
      <ellipse cx="30" cy="105" rx="16" ry="4" fill="#ff69b4" opacity="0.4" />
      <ellipse cx="95" cy="110" rx="12" ry="3" fill="#ff69b4" opacity="0.3" />
      {/* Scrap pile 1 */}
      <polygon points="10,90 30,90 25,72 15,75" fill="#8a5a2b" />
      <rect x="14" y="76" width="8" height="4" fill="#d4af37" transform="rotate(-15,18,78)" />
      {/* Scrap pile 2 */}
      <polygon points="85,90 110,90 105,68 90,74" fill="#8a5a2b" />
      <rect x="92" y="72" width="10" height="3" fill="#d4af37" transform="rotate(10,97,73)" />
      {/* Outpost shack */}
      <rect x="45" y="60" width="35" height="30" fill="#8a5a2b" />
      <polygon points="42,60 83,60 62,44" fill="#d4af37" />
      <rect x="55" y="72" width="10" height="18" fill="#ff69b4" opacity="0.5" />
      {/* Antenna */}
      <rect x="60" y="30" width="2" height="14" fill="#d4af37" />
      <circle cx="61" cy="28" r="3" fill="#ff69b4" opacity="0.5" />
    </svg>
  );
}
