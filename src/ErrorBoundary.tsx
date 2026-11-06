// Si algo falla al dibujar el juego, en vez de una pantalla en blanco se muestra
// un mensaje amable con un botón para empezar de nuevo (borra solo la partida guardada).
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

const SAVE_KEYS = ['astrobase_cadet_game_v1'];

interface State { failed: boolean }

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ASTROBASE error', error, info.componentStack);
  }

  private restart = () => {
    try {
      for (const k of SAVE_KEYS) localStorage.removeItem(k);
      // Volver al Modo Cadete: si el error vino del Modo Experto (p. ej. sin internet
      // la primera vez), no se queda atrapado en él.
      localStorage.setItem('astrobase_mode', 'cadet');
    } catch { /* ignorar */ }
    window.location.assign(window.location.pathname); // sin ?modo=experto
  };

  render() {
    if (!this.state.failed) return this.props.children;
    const es = !navigator.language?.startsWith('en');
    return (
      <div className="min-h-screen bg-[#060913] text-slate-100 flex items-center justify-center p-6">
        <div role="alert" className="max-w-md w-full rounded-3xl border border-slate-700 bg-slate-900 p-6 text-center space-y-4">
          <div className="text-5xl" aria-hidden>🛰️</div>
          <h1 className="text-2xl font-black">{es ? '¡Uy! Perdimos la señal' : 'Oops! We lost the signal'}</h1>
          <p className="text-slate-300">
            {es
              ? 'Algo salió mal en la base. Tus récords e insignias siguen guardados.'
              : 'Something went wrong at the base. Your records and badges are still saved.'}
          </p>
          <button
            type="button"
            onClick={this.restart}
            className="w-full py-3.5 rounded-2xl text-lg font-black bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 hover:brightness-110"
          >
            🔁 {es ? 'Empezar de nuevo' : 'Start again'}
          </button>
        </div>
      </div>
    );
  }
}
