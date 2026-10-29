// Capcom NOVA Synthetic Space Voice (Web Speech API)
import { soundFx } from './audio';

class SpaceSpeechEngine {
  private isEnabled: boolean = true;
  private voice: SpeechSynthesisVoice | null = null;
  private isSpeaking: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.initVoice();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.initVoice();
      }
    }
  }

  private initVoice() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    // Prefer Spanish voices (es-ES, es-MX, es-US, or any es-)
    const esVoice = voices.find(v => v.lang.startsWith('es')) || 
                    voices.find(v => v.lang.includes('es')) || 
                    voices[0];
    if (esVoice) {
      this.voice = esVoice;
    }
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
      window.speechSynthesis.cancel(); // Stop any pending speech
      soundFx.playRadioBeep();

      const utterance = new SpeechSynthesisUtterance(text);
      if (this.voice) {
        utterance.voice = this.voice;
      }
      utterance.rate = 1.05; // Slightly authoritative flight-director cadence
      utterance.pitch = 1.0;
      utterance.lang = 'es-ES';

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
      // Graceful degradation if blocked by browser autoplay policy
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
