import { GameEngine } from './GameEngine';

export class PersonaController {
    activeBark: { text: string; duration: number; elapsed: number } | null = null;
    overrideMood: { mood: string; duration: number; elapsed: number } | null = null;
    
    idleTimer: number = 0;

    update(dt: number, engine: GameEngine) {
        // Update bark timer
        if (this.activeBark) {
            this.activeBark.elapsed += dt;
            if (this.activeBark.elapsed >= this.activeBark.duration) {
                this.activeBark = null;
            }
        }

        // Update override mood timer
        if (this.overrideMood) {
            this.overrideMood.elapsed += dt;
            if (this.overrideMood.elapsed >= this.overrideMood.duration) {
                this.overrideMood = null;
            }
        }

        // Idle detection
        if (!engine.state.zyx.jumping && engine.state.status === 'playing') {
            this.idleTimer += dt;
            if (this.idleTimer > 5.0 && !this.activeBark) {
                this.triggerIdleBark();
                this.idleTimer = 0; // reset to prevent spam
            }
        } else {
            this.idleTimer = 0;
        }
    }

    triggerBark(text: string, duration: number = 2.0, moodOverride?: string) {
        this.activeBark = { text, duration, elapsed: 0 };
        if (moodOverride) {
            this.overrideMood = { mood: moodOverride, duration, elapsed: 0 };
        }
    }

    onJump(timeLeft: number) {
        this.idleTimer = 0; // reset idle
        // Near miss detection (e.g., jumped with less than 2 seconds left)
        if (timeLeft < 2.0 && timeLeft > 0) {
            const barks = ["Phew!", "That was close!", "Yikes!", "Too hot!"];
            this.triggerBark(barks[Math.floor(Math.random() * barks.length)], 1.5, 'shocked');
        }
    }

    onLand(isCorrect: boolean, isPerfect: boolean, combo: number) {
        if (!isCorrect) return; // Mortician takes over on fail
        
        if (combo % 5 === 0 && combo > 0) {
            const barks = ["Unstoppable!", `${combo} IN A ROW!`, "Math genius!", "I am speed!"];
            this.triggerBark(barks[Math.floor(Math.random() * barks.length)], 2.0, 'thrilled');
        } else if (combo === 3) {
            this.triggerBark("Heating up!", 1.5, 'thrilled');
        } else if (isPerfect && Math.random() < 0.2) {
            // Randomly bark on a perfect fast jump
            const barks = ["Nice!", "Got it!", "Easy!", "Next!"];
            this.triggerBark(barks[Math.floor(Math.random() * barks.length)], 1.0, 'content');
        }
    }

    triggerIdleBark() {
        const barks = [
            "Is it getting hot in here?",
            "Hello? Math to do!",
            "Don't leave me hanging!",
            "My jelly is boiling...",
            "Tick tock..."
        ];
        this.triggerBark(barks[Math.floor(Math.random() * barks.length)], 2.5, 'bored');
    }

    reset() {
        this.activeBark = null;
        this.overrideMood = null;
        this.idleTimer = 0;
    }
}
