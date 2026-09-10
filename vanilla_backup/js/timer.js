/**
 * Timer.js
 * Logic for the countdown timer. 
 * Manages states (Running, Paused, Stopped) and triggers UI/Audio events.
 */
class Timer {
    constructor(durationMinutes, onTick, onComplete) {
        // All internal logic uses seconds for precision
        this.defaultDuration = durationMinutes * 60;
        this.duration = this.defaultDuration;
        this.timeLeft = this.duration;
        this.timerId = null;
        this.onTick = onTick;
        this.onComplete = onComplete;
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.timerId = setInterval(() => {
            this.timeLeft--;
            this.onTick(this.timeLeft, this.duration);
            if (this.timeLeft <= 0) {
                this.stop();
                this.onComplete();
            }
        }, 1000);
    }

    pause() {
        this.isRunning = false;
        clearInterval(this.timerId);
    }

    stop() {
        this.pause();
        this.timeLeft = this.duration;
    }

    reset() {
        this.duration = this.defaultDuration;
        this.stop();
        this.onTick(this.timeLeft, this.duration);
    }

    setDefault(newDurationMinutes) {
        if (newDurationMinutes) {
            this.defaultDuration = newDurationMinutes * 60;
        }
        this.reset();
    }

    adjustDuration(deltaMinutes) {
        if (this.isRunning) return;
        const newMinutes = (this.duration / 60) + deltaMinutes;
        if (newMinutes >= 1 && newMinutes <= 120) {
            this.duration = newMinutes * 60;
            this.timeLeft = this.duration;
            this.onTick(this.timeLeft, this.duration);
        }
    }

    getFormattedTime() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    getProgress() {
        return (this.duration - this.timeLeft) / this.duration;
    }
}

// Global timer instance will be managed in app.js