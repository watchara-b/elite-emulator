export function SwissCommandCenter() {
  return (
    <svg viewBox="0 0 128 128">
      <rect x="24" y="40" width="80" height="60" fill="#1a3a5c" stroke="#88ccff" strokeWidth="3" />
      <rect x="34" y="30" width="60" height="16" fill="#e8f0ff" />
      <rect x="54" y="14" width="20" height="20" fill="#88ccff" />
      <line x1="64" y1="4" x2="64" y2="14" stroke="#00ddff" strokeWidth="3" />
      <rect x="30" y="50" width="14" height="14" fill="#00ddff" opacity="0.6" />
      <rect x="57" y="50" width="14" height="14" fill="#00ddff" opacity="0.6" />
      <rect x="84" y="50" width="14" height="14" fill="#00ddff" opacity="0.6" />
      <rect x="44" y="76" width="40" height="24" fill="#e8f0ff" stroke="#88ccff" strokeWidth="2" />
      <line x1="64" y1="76" x2="64" y2="100" stroke="#1a3a5c" strokeWidth="2" />
      <line x1="44" y1="88" x2="84" y2="88" stroke="#1a3a5c" strokeWidth="2" />
      <rect x="20" y="100" width="88" height="8" fill="#1a3a5c" />
    </svg>
  );
}

export function SwissCryoMiner() {
  return (
    <svg viewBox="0 0 128 128">
      <rect x="20" y="60" width="88" height="40" rx="6" fill="#1a3a5c" />
      <rect x="30" y="50" width="40" height="20" rx="4" fill="#e8f0ff" />
      <rect x="75" y="45" width="28" height="30" rx="4" fill="#88ccff" stroke="#00ddff" strokeWidth="2" />
      <circle cx="89" cy="60" r="8" fill="#00ddff" opacity="0.5" />
      <rect x="10" y="68" width="16" height="8" rx="2" fill="#e8f0ff" />
      <polygon points="10,60 2,76 18,76" fill="#88ccff" />
      <ellipse cx="64" cy="40" rx="40" ry="10" fill="#00ddff" opacity="0.15" />
      <ellipse cx="64" cy="40" rx="28" ry="6" fill="#00ddff" opacity="0.1" />
      <rect x="24" y="100" width="20" height="10" rx="3" fill="#e8f0ff" />
      <rect x="84" y="100" width="20" height="10" rx="3" fill="#e8f0ff" />
    </svg>
  );
}

export function SwissAlpsBehemoth() {
  return (
    <svg viewBox="0 0 128 128">
      <ellipse cx="64" cy="40" rx="50" ry="30" fill="#00ddff" opacity="0.12" />
      <ellipse cx="64" cy="40" rx="50" ry="30" fill="none" stroke="#00ddff" strokeWidth="1.5" strokeDasharray="4 3" />
      <rect x="30" y="55" width="68" height="35" rx="4" fill="#1a3a5c" />
      <rect x="40" y="48" width="48" height="14" rx="3" fill="#e8f0ff" />
      <rect x="56" y="38" width="16" height="14" fill="#88ccff" />
      <circle cx="64" cy="45" r="4" fill="#00ddff" />
      {[14,30,46,62,78,94,110,126].map((x, i) => (
        <circle key={i} cx={x - 10} cy="96" r="7" fill="#e8f0ff" stroke="#1a3a5c" strokeWidth="2" />
      ))}
      <rect x="10" y="90" width="108" height="6" rx="2" fill="#1a3a5c" />
    </svg>
  );
}

export function SwissCuckooDrone() {
  return (
    <svg viewBox="0 0 128 128">
      <ellipse cx="64" cy="56" rx="30" ry="14" fill="#1a3a5c" />
      <ellipse cx="64" cy="56" rx="20" ry="8" fill="#e8f0ff" />
      <circle cx="64" cy="56" r="5" fill="#00ddff" />
      <line x1="34" y1="56" x2="16" y2="48" stroke="#88ccff" strokeWidth="2" />
      <line x1="94" y1="56" x2="112" y2="48" stroke="#88ccff" strokeWidth="2" />
      <ellipse cx="16" cy="48" rx="8" ry="3" fill="#88ccff" opacity="0.5" />
      <ellipse cx="112" cy="48" rx="8" ry="3" fill="#88ccff" opacity="0.5" />
      <line x1="64" y1="70" x2="64" y2="110" stroke="#00ddff" strokeWidth="2" strokeDasharray="4 3" />
      <circle cx="64" cy="110" r="4" fill="#00ddff" opacity="0.6" />
      <polygon points="58,44 64,36 70,44" fill="#88ccff" />
    </svg>
  );
}

export function SwissZeroCollider() {
  return (
    <svg viewBox="0 0 128 128">
      <circle cx="64" cy="64" r="36" fill="none" stroke="#1a3a5c" strokeWidth="6" />
      <circle cx="64" cy="64" r="30" fill="none" stroke="#88ccff" strokeWidth="2" />
      <circle cx="64" cy="64" r="10" fill="#00ddff" opacity="0.6" />
      <circle cx="64" cy="28" r="5" fill="#e8f0ff" />
      <circle cx="95" cy="82" r="5" fill="#e8f0ff" />
      <circle cx="33" cy="82" r="5" fill="#e8f0ff" />
      <line x1="64" y1="10" x2="64" y2="0" stroke="#00ddff" strokeWidth="3" />
      <circle cx="64" cy="4" r="4" fill="#88ccff" />
      {[0,1,2,3,4,5,6,7].map(i => {
        const a = (i * 45) * Math.PI / 180;
        const x = 64 + Math.cos(a) * 46;
        const y = 64 + Math.sin(a) * 46;
        return <line key={i} x1={64 + Math.cos(a) * 38} y1={64 + Math.sin(a) * 38} x2={x} y2={y} stroke="#00ddff" strokeWidth="1" opacity="0.5" />;
      })}
    </svg>
  );
}

export function SwissCryoLockdown() {
  return (
    <svg viewBox="0 0 128 128">
      <rect x="30" y="50" width="68" height="50" fill="#1a3a5c" />
      <rect x="50" y="36" width="28" height="20" fill="#1a3a5c" />
      <rect x="56" y="30" width="16" height="10" fill="#e8f0ff" />
      <polygon points="30,50 64,30 98,50" fill="#e8f0ff" stroke="#1a3a5c" strokeWidth="1" />
      <rect x="52" y="70" width="24" height="30" fill="#e8f0ff" />
      <polygon points="20,105 30,50 98,50 108,105" fill="#88ccff" opacity="0.3" stroke="#00ddff" strokeWidth="2" />
      <line x1="20" y1="105" x2="108" y2="105" stroke="#00ddff" strokeWidth="2" />
      {[30,50,70,90].map((x, i) => (
        <line key={i} x1={x} y1="50" x2={x + (x < 64 ? -6 : 6)} y2="105" stroke="#00ddff" strokeWidth="1" opacity="0.4" />
      ))}
      <polygon points="64,10 60,20 68,20" fill="#00ddff" opacity="0.6" />
      <polygon points="64,10 58,16 70,16" fill="none" stroke="#88ccff" strokeWidth="1" />
    </svg>
  );
}

export function SwissAlpineDefense() {
  return (
    <svg viewBox="0 0 128 128">
      <rect x="0" y="0" width="128" height="128" fill="#e8f0ff" />
      <polygon points="0,128 30,50 60,128" fill="#88ccff" />
      <polygon points="40,128 75,30 110,128" fill="#1a3a5c" />
      <polygon points="80,128 110,60 128,128" fill="#88ccff" />
      <polygon points="30,50 35,42 40,50" fill="white" />
      <polygon points="75,30 80,20 85,30" fill="white" />
      <polygon points="110,60 114,54 118,60" fill="white" />
      <polygon points="20,110 30,100 40,110" fill="#1a3a5c" stroke="#88ccff" strokeWidth="2" />
      <polygon points="70,115 80,105 90,115" fill="#1a3a5c" stroke="#88ccff" strokeWidth="2" />
      <line x1="20" y1="110" x2="40" y2="110" stroke="#00ddff" strokeWidth="2" />
      <line x1="70" y1="115" x2="90" y2="115" stroke="#00ddff" strokeWidth="2" />
      <rect x="0" y="120" width="128" height="8" fill="white" opacity="0.5" />
    </svg>
  );
}
