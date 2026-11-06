// Elige entre el Modo Cadete (7–12 años, por defecto) y el Modo Experto (juego completo).
import { lazy, Suspense, useEffect, useState } from 'react';
import CadetGame from './cadet/CadetGame.tsx';

// El Modo Experto (Three.js, mapas, etc.) se descarga solo si alguien lo abre:
// así el Modo Cadete carga rápido en computadoras escolares lentas.
const App = lazy(() => import('./App.tsx'));

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
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#060913] text-slate-300 flex items-center justify-center text-lg font-bold">
            🚀 Cargando Modo Experto…
          </div>
        }
      >
        <App />
      </Suspense>
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
