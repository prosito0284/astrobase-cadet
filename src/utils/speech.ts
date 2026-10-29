// Capcom NOVA Natural Space Voice Engine
import { soundFx } from './audio';

class SpaceSpeechEngine {
  private isEnabled: boolean = true;
  private voice: SpeechSynthesisVoice | null = null;
  private isSpeaking: boolean = false;
  private availableVoices: SpeechSynthesisVoice[] = [];
  private rate: number = 0.96; // Slightly slower, warm conversational cadence
  private pitch: number = 0.98; // Slightly deeper, natural human resonance

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.initVoice();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.initVoice();
      }
    }
  }

  public initVoice() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    this.availableVoices = voices;

    // Filter for Spanish voices and prioritize Natural / Neural / Google human voices over robotic ones
    const spanishVoices = voices.filter(v => v.lang.startsWith('es') || v.lang.includes('es'));
    
    // Priority order for high-definition natural human voices:
    const naturalVoice = 
      spanishVoices.find(v => v.name.includes('Natural') || v.name.includes('Online')) || // Edge Natural neural voices (Jorge, Dalia, Alvaro)
      spanishVoices.find(v => v.name.includes('Google')) || // Chrome Google high-res voices
      spanishVoices.find(v => v.name.includes('Paulina') || v.name.includes('Monica') || v.name.includes('Sofia')) ||
      spanishVoices[0] ||
      voices[0];

    if (naturalVoice) {
      this.voice = naturalVoice;
    }
  }

  public getVoices(): SpeechSynthesisVoice[] {
    return this.availableVoices.filter(v => v.lang.startsWith('es') || v.lang.includes('es'));
  }

  public setVoice(voiceName: string) {
    const found = this.availableVoices.find(v => v.name === voiceName);
    if (found) {
      this.voice = found;
    }
  }

  public getCurrentVoiceName(): string {
    return this.voice ? this.voice.name : 'Voz del Sistema';
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public speak(text: string, onEndCallback?: () => void) {
    if (!this.isEnabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();
      soundFx.playRadioBeep();

      // Clean text of emojis and symbols that make speech synthesis stutter
      const cleanText = text
        .replace(/[🚀🛰️🔬🚨☀️🌪️🥬⚠️🌱🧪❄️🕳️💧🏆💡🎯🏅❤️😊⚡💨🥗☢️]/g, '')
        .replace(/O₂/g, 'oxígeno')
        .replace(/CO₂/g, 'dióxido de carbono')
        .replace(/H₂O/g, 'agua')
        .replace(/mSv/g, 'milisieverts')
        .replace(/kW/g, 'kilovatios')
        .replace(/kWh/g, 'kilovatios hora')
        .replace(/km\/s/g, 'kilómetros por segundo')
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      if (this.voice) {
        utterance.voice = this.voice;
      }
      utterance.rate = this.rate;
      utterance.pitch = this.pitch;
      utterance.lang = this.voice ? this.voice.lang : 'es-MX';

      utterance.onstart = () => {
        this.isSpeaking = true;
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        soundFx.playRadioBeep();
        if (onEndCallback) onEndCallback();
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      // Graceful degradation
    }
  }

  public stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
    }
  }
}

export const spaceVoice = new SpaceSpeechEngine();
