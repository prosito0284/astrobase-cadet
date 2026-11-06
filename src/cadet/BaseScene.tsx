// Dibujo de la base que cambia con las barras: cúpula = escudo, invernadero = aire,
// paneles = energía, caras = salud. En días de tormenta aparece el Sol con rayos.
import type { Lang, Site } from './data';

interface Props {
  site: Site;
  air: number;
  energy: number;
  shield: number;
  health: number;
  storm: boolean;
  lang: Lang;
}

const face = (h: number) => (h >= 70 ? '😀' : h >= 40 ? '🙂' : h >= 20 ? '😟' : '🤒');

export default function BaseScene({ site, air, energy, shield, health, storm, lang }: Props) {
  const moon = site === 'moon';
  const sky = moon ? '#020617' : '#3b1d12';
  const ground = moon ? '#64748b' : '#9a3412';
  const groundDark = moon ? '#475569' : '#7c2d12';
  const domeOpacity = 0.12 + (shield / 100) * 0.55;
  const glow = 0.15 + (air / 100) * 0.85;
  const panel = energy / 100;
  const label = lang === 'es'
    ? `Tu base en ${moon ? 'la Luna' : 'Marte'}: escudo ${shield}, aire ${air}, energía ${energy}, salud ${health}${storm ? '. ¡Hoy llega una tormenta solar!' : ''}`
    : `Your base on ${moon ? 'the Moon' : 'Mars'}: shield ${shield}, air ${air}, energy ${energy}, health ${health}${storm ? '. A solar storm arrives today!' : ''}`;

  return (
    <svg viewBox="0 0 320 110" className="block w-full h-auto max-h-44 mx-auto rounded-2xl border border-slate-700/70" role="img" aria-label={label} preserveAspectRatio="xMidYMid slice">
      <rect width="320" height="110" fill={sky} />
      {/* estrellas o polvo */}
      {moon
        ? [[20, 14], [60, 30], [110, 10], [150, 24], [205, 12], [250, 34], [295, 18], [35, 48]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={0.9} fill="#e2e8f0" />)
        : <rect width="320" height="70" fill="#f59e0b" opacity={0.08} />}
      {/* la Tierra vista desde la Luna */}
      {moon && <circle cx="265" cy="26" r="9" fill="#2563eb"><title>Tierra</title></circle>}
      {moon && <path d="M259 23 q4 -4 8 0 q3 4 7 1" stroke="#22c55e" strokeWidth="2.5" fill="none" />}
      {/* Sol y tormenta */}
      <g className={storm ? 'animate-pulse' : undefined}>
        <circle cx="34" cy="24" r={storm ? 13 : 9} fill="#fbbf24" />
        {storm && [0, 1, 2, 3, 4].map(i => (
          <line key={i} x1={48 + i * 6} y1={22 + i * 7} x2={120 + i * 18} y2={52 + i * 5} stroke="#fde047" strokeWidth="1.5" strokeDasharray="4 5" opacity="0.85" />
        ))}
      </g>
      {/* suelo */}
      <path d="M0 82 Q60 74 120 80 T240 78 T320 80 V110 H0Z" fill={ground} />
      <ellipse cx="60" cy="96" rx="14" ry="3" fill={groundDark} />
      <ellipse cx="270" cy="100" rx="18" ry="3.5" fill={groundDark} />
      {/* paneles solares */}
      <g>
        {[0, 1].map(i => (
          <g key={i} transform={`translate(${220 + i * 34} 62)`}>
            <line x1="12" y1="12" x2="12" y2="22" stroke="#94a3b8" strokeWidth="2" />
            <rect width="26" height="12" rx="1.5" fill="#1e3a8a" stroke="#93c5fd" strokeWidth="1" />
            <rect width="26" height="12" rx="1.5" fill="#60a5fa" opacity={panel * 0.8} />
          </g>
        ))}
      </g>
      {/* invernadero */}
      <g transform="translate(150 62)">
        <rect width="46" height="20" rx="4" fill="#064e3b" stroke="#34d399" strokeWidth="1" />
        <rect width="46" height="20" rx="4" fill="#4ade80" opacity={glow * 0.6} />
        <text x="23" y="15" textAnchor="middle" fontSize="11">🥬</text>
      </g>
      {/* módulo con la tripulación */}
      <g transform="translate(70 54)">
        <rect width="64" height="28" rx="8" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
        <text x="32" y="19" textAnchor="middle" fontSize="12" letterSpacing="1">{face(health).repeat(4)}</text>
      </g>
      {/* cúpula del escudo */}
      <path d="M58 82 Q102 18 146 82" fill="#a78bfa" opacity={domeOpacity} stroke="#c4b5fd" strokeWidth={1 + shield / 40} />
      {/* antena */}
      <line x1="128" y1="54" x2="128" y2="40" stroke="#94a3b8" strokeWidth="1.5" />
      <path d="M121 40 q7 -7 14 0" stroke="#94a3b8" strokeWidth="1.5" fill="none" />
    </svg>
  );
}
