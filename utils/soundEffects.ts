// Sound Effects Utility for MediaHive ERP using pure Web Audio API
// No external audio files or dependencies required - 100% offline and instant

class SoundEffectsManager {
    private ctx: AudioContext | null = null;
    private enabled: boolean = true;
    private volume: number = 0.3; // pleasant background volume

    constructor() {
        try {
            const savedEnabled = localStorage.getItem('erp_sound_enabled');
            this.enabled = savedEnabled !== null ? savedEnabled === 'true' : true;

            const savedVolume = localStorage.getItem('erp_sound_volume');
            if (savedVolume !== null) {
                this.volume = parseFloat(savedVolume) || 0.3;
            }
        } catch {
            this.enabled = true;
        }
    }

    private getContext(): AudioContext | null {
        if (!this.ctx || this.ctx.state === 'closed') {
            const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtxClass) {
                this.ctx = new AudioCtxClass();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        return this.ctx;
    }

    public isEnabled(): boolean {
        return this.enabled;
    }

    public setEnabled(val: boolean): void {
        this.enabled = val;
        try {
            localStorage.setItem('erp_sound_enabled', String(val));
        } catch {}
    }

    public getVolume(): number {
        return this.volume;
    }

    public setVolume(val: number): void {
        this.volume = Math.max(0, Math.min(1, val));
        try {
            localStorage.setItem('erp_sound_volume', String(this.volume));
        } catch {}
    }

    /**
     * Pleasant success chime: two soft bells (D5 -> A5)
     */
    public playSuccess(): void {
        if (!this.enabled) return;
        const ctx = this.getContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const notes = [
            { freq: 587.33, time: 0, dur: 0.18 }, // D5
            { freq: 880.00, time: 0.12, dur: 0.35 } // A5
        ];

        notes.forEach(({ freq, time, dur }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + time);

            gain.gain.setValueAtTime(0, now + time);
            gain.gain.linearRampToValueAtTime(this.volume * 0.7, now + time + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + time);
            osc.stop(now + time + dur);
        });
    }

    /**
     * Cash register chime: rapid bright metallic double-ping
     */
    public playCash(): void {
        if (!this.enabled) return;
        const ctx = this.getContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const notes = [
            { freq: 987.77, time: 0, dur: 0.15 },  // B5
            { freq: 1318.51, time: 0.09, dur: 0.4 } // E6
        ];

        notes.forEach(({ freq, time, dur }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + time);

            gain.gain.setValueAtTime(0, now + time);
            gain.gain.linearRampToValueAtTime(this.volume * 0.8, now + time + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + time);
            osc.stop(now + time + dur);
        });
    }

    /**
     * Warning chime: gentle dual pulse (440Hz -> 392Hz)
     */
    public playWarning(): void {
        if (!this.enabled) return;
        const ctx = this.getContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const notes = [
            { freq: 440.00, time: 0, dur: 0.16 }, // A4
            { freq: 392.00, time: 0.14, dur: 0.28 } // G4
        ];

        notes.forEach(({ freq, time, dur }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + time);

            gain.gain.setValueAtTime(0, now + time);
            gain.gain.linearRampToValueAtTime(this.volume * 0.6, now + time + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + time);
            osc.stop(now + time + dur);
        });
    }

    /**
     * Soft notification ding (A5 single ping)
     */
    public playDing(): void {
        if (!this.enabled) return;
        const ctx = this.getContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(this.volume * 0.5, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
    }
}

export const soundEffects = new SoundEffectsManager();
export default soundEffects;
