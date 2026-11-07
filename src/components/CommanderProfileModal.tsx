import React, { useState } from 'react';
import { CommanderProfile } from '../types/game';
import { 
  User, 
  X, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Award,
  TreePine
} from 'lucide-react';
import { soundFx } from '../utils/audio';
import { spaceVoice } from '../utils/speech';
import confetti from 'canvas-confetti';

interface CommanderProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: CommanderProfile;
  onSaveProfile: (profile: CommanderProfile) => void;
  lang: 'es' | 'en';
}

const AVAILABLE_PATCHES = [
  { id: 'troncos', name: '🌲 Troncos Intergalácticos (Oficial)', icon: '🌲', color: 'from-emerald-600 to-teal-800' },
  { id: 'artemis', name: '🚀 Artemis Moon Explorer', icon: '🚀', color: 'from-blue-600 to-indigo-800' },
  { id: 'ares', name: '🔴 Ares Mars Pioneer', icon: '🔴', color: 'from-rose-600 to-amber-800' },
  { id: 'voyager', name: '🌌 Voyager Deep Frontier', icon: '🌌', color: 'from-purple-600 to-cyan-800' },
  { id: 'orion', name: '⚡ Orion First Contact', icon: '⚡', color: 'from-amber-600 to-orange-800' },
];

export const CommanderProfileModal: React.FC<CommanderProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
  lang,
}) => {
  const [name, setName] = useState(profile.name);
  const [callsign, setCallsign] = useState(profile.callsign);
  const [patch, setPatch] = useState(profile.patch);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playVictory();
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

    const updated: CommanderProfile = {
      name: name.trim() || 'Comandante en Jefe',
      callsign: callsign.trim() || 'Halcón Estelar',
      patch: patch || '🌲 Troncos Intergalácticos (Oficial)',
    };

    onSaveProfile(updated);
    spaceVoice.speak(`Credenciales registradas. Saludos, Comandante ${updated.name}. La base espacial está a su mando.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-cyan-500/80 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-[0_0_60px_rgba(6,182,212,0.35)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-600/30 text-cyan-300 border border-cyan-500/40">
              <User className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-100 flex items-center gap-2">
                <span>{lang === 'es' ? 'Credencial de Comandante de Misión' : 'Mission Commander Credential'}</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {lang === 'es' 
                  ? 'Personaliza tu identidad oficial para el audio de Capcom NOVA y el Certificado NASA.' 
                  : 'Customize your official identity for Capcom NOVA and the NASA Certificate.'}
              </p>
            </div>
          </div>

          <button aria-label={lang === 'en' ? 'Close' : 'Cerrar'}
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live ID Preview Card */}
        <div className="my-4 p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/60 border border-cyan-500/40 shadow-xl relative overflow-hidden">
          <div className="absolute top-2 right-3 text-[9px] font-mono uppercase tracking-widest text-emerald-400 font-black flex items-center gap-1">
            <TreePine className="w-3 h-3" />
            TRONCOS INTERGALÁCTICOS
          </div>

          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-cyan-900/60 border-2 border-cyan-400 flex items-center justify-center text-3xl shadow-lg shadow-cyan-500/30">
              🧑‍🚀
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 block">
                {lang === 'es' ? 'RANGO: COMANDANTE SUPREMO' : 'RANK: SUPREME COMMANDER'}
              </span>
              <h4 className="text-base font-black text-white truncate drop-shadow">
                {name || (lang === 'es' ? 'Comandante en Jefe' : 'Commander')}
              </h4>
              <span className="text-[11px] text-amber-300 font-mono block">
                Indicativo: «{callsign || 'Halcón'}»
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                Insignia: {patch}
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              {lang === 'es' ? 'Nombre del Comandante (Tú):' : 'Commander Name:'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Checo Valdés / Crist"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-cyan-300 focus:outline-none focus:border-cyan-400 font-bold"
              maxLength={35}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              {lang === 'es' ? 'Indicativo de Radio (Callsign):' : 'Radio Callsign:'}
            </label>
            <input
              type="text"
              value={callsign}
              onChange={(e) => setCallsign(e.target.value)}
              placeholder="Ej: Halcón Estelar / Apolo Alfa"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-amber-300 focus:outline-none focus:border-amber-400 font-bold"
              maxLength={25}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              {lang === 'es' ? 'Insignia / Parche de Misión:' : 'Mission Patch / Insignia:'}
            </label>
            <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
              {AVAILABLE_PATCHES.map(p => {
                const isSelected = patch === p.name;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      setPatch(p.name);
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs font-bold text-left transition-all border ${
                      isSelected 
                        ? 'bg-cyan-950/80 border-cyan-400 text-white shadow-md' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{p.icon}</span>
                      <span>{p.name}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
            >
              {lang === 'es' ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-cyan-950/50 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{lang === 'es' ? 'Guardar Credencial' : 'Save Credential'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
