import React, { useState, useRef, useEffect } from 'react';
import { FlightLogEntry, BaseLocation } from '../types/game';
import { 
  FileText, 
  X, 
  Copy, 
  Check, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Zap, 
  Radio,
  TreePine
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface FlightLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: FlightLogEntry[];
  currentLocation: BaseLocation;
  lang: 'es' | 'en';
}

export const FlightLogModal: React.FC<FlightLogModalProps> = ({
  isOpen,
  onClose,
  entries,
  currentLocation,
  lang,
}) => {
  const [copied, setCopied] = useState(false);
  const [filterLocation, setFilterLocation] = useState<'all' | BaseLocation>('all');
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = entries.filter(e => filterLocation === 'all' || e.location === filterLocation);

  const handleCopy = () => {
    soundFx.playClick();
    const text = filtered.map(e => 
      `[${(e.location || 'moon').toUpperCase()} - DÍA ${e.day} (${e.timestamp})] ${lang === 'es' ? e.messageEs : e.messageEn}`
    ).join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false);
        copyTimeoutRef.current = null;
      }, 2000);
    }).catch(() => {});
  };

  const getTypeIcon = (type: FlightLogEntry['type']) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
      case 'warning':
        return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case 'success':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'event':
        return <Radio className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <Info className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  const getTypeStyle = (type: FlightLogEntry['type']) => {
    switch (type) {
      case 'alert':
        return 'border-rose-500/40 bg-rose-950/30 text-rose-200';
      case 'warning':
        return 'border-amber-500/40 bg-amber-950/30 text-amber-200';
      case 'success':
        return 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200';
      case 'event':
        return 'border-cyan-500/40 bg-cyan-950/30 text-cyan-200';
      default:
        return 'border-slate-800 bg-slate-950/80 text-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-indigo-500/80 rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-[0_0_60px_rgba(99,102,241,0.35)] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/40">
              <FileText className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-100 flex items-center gap-2">
                <span>{lang === 'es' ? 'Bitácora de Vuelo & Telemetría Histórica' : 'Flight Log & Historical Telemetry'}</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full font-bold">
                  {filtered.length} {lang === 'es' ? 'Registros' : 'Entries'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {lang === 'es' 
                  ? 'Registro continuo de eventos transmitido a la Red de Espacio Profundo (DSN).' 
                  : 'Continuous telemetry stream archived with NASA Deep Space Network.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters and Actions */}
        <div className="my-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <button
              onClick={() => {
                soundFx.playClick();
                setFilterLocation('all');
              }}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                filterLocation === 'all'
                  ? 'bg-indigo-950 border-indigo-500 text-indigo-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {lang === 'es' ? 'Todo' : 'All'}
            </button>
            <button
              onClick={() => {
                soundFx.playClick();
                setFilterLocation('moon');
              }}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                filterLocation === 'moon'
                  ? 'bg-blue-950 border-blue-500 text-blue-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              🌕 {lang === 'es' ? 'Luna' : 'Moon'}
            </button>
            <button
              onClick={() => {
                soundFx.playClick();
                setFilterLocation('mars');
              }}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                filterLocation === 'mars'
                  ? 'bg-rose-950 border-rose-500 text-rose-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              🔴 {lang === 'es' ? 'Marte' : 'Mars'}
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-indigo-300" />}
            <span>{copied ? (lang === 'es' ? '¡Copiado!' : 'Copied!') : (lang === 'es' ? 'Copiar Bitácora' : 'Copy Log')}</span>
          </button>
        </div>

        {/* Entries List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-thin">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs italic">
              {lang === 'es' ? 'No hay registros en esta categoría.' : 'No log entries recorded yet.'}
            </div>
          ) : (
            filtered.map((entry) => (
              <div 
                key={entry.id}
                className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${getTypeStyle(entry.type)}`}
              >
                <div className="p-1 rounded-lg bg-slate-900/80 flex-shrink-0 mt-0.5">
                  {getTypeIcon(entry.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-0.5">
                    <span className="font-bold text-slate-300">
                      {entry.location === 'moon' ? '🌕 LUNA' : '🔴 MARTE'} • {entry.location === 'mars' ? 'SOL' : 'DÍA'} {entry.day}
                    </span>
                    <span>{entry.timestamp}</span>
                  </div>
                  <p className="font-semibold leading-relaxed">
                    {lang === 'es' ? entry.messageEs : entry.messageEn}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <TreePine className="w-4 h-4 text-emerald-300" />
            <span>Troncos Intergalácticos • Archivo de Telemetría</span>
          </div>
          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all"
          >
            {lang === 'es' ? 'Cerrar' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
