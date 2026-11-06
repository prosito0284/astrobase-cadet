// Elige entre el Modo Cadete (7–12 años, por defecto) y el Modo Experto (juego completo).
import { useEffect, useState } from 'react';
import App from './App.tsx';
import CadetGame from './cadet/CadetGame.tsx';

type Mode = 'cadet' | 'expert';
const MODE_KEY = 'astrobase_mode';

function readMode(): Mode {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('modo');
    if (fromUrl === 'experto' || fromUrl === 'expert') return 'expert';
    if (fromUrl === 'cadete' || fromUrl === 'cadet') return 'cadet';
    return localStorage.getItem(MODE_KEY) === 'expert' ? 'expert' : 'cadet';
  } catch {
    return 'cadet';
  }
}

export default function Root() {
  const [mode, setMode] = useState<Mode>(readMode);

  useEffect(() => {
    try { localStorage.setItem(MODE_KEY, mode); } catch { /* ignorar */ }
    window.scrollTo({ top: 0 });
  }, [mode]);

  if (mode === 'cadet') return <CadetGame onExpert={() => setMode('expert')} />;

  return (
    <>
      <App />
      <button
        type="button"
        onClick={() => setMode('cadet')}
        className="fixed bottom-3 left-3 z-[150] px-3 py-2 rounded-2xl text-xs font-black bg-emerald-500 text-slate-950 shadow-lg shadow-black/50 hover:brightness-110"
      >
        🧑‍🚀 Modo Cadete
      </button>
    </>
  );
}
