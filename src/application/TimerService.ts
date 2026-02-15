import { Topic, SessionState } from '../domain/Agenda';
import { ISessionRepository } from '../domain/SessionRepository';

export class TimerService {
    constructor(private repository: ISessionRepository) { }

    async calculateRemaining(topic: Topic, state: SessionState): Promise<number> {
        if (!state.startTime) return topic.duracion * 60;

        const durationMs = topic.duracion * 60 * 1000;
        let elapsed: number;

        if (state.isPaused && state.pausedAt) {
            elapsed = state.pausedAt - state.startTime - state.accumulatedPauseTime;
        } else {
            elapsed = Date.now() - state.startTime - state.accumulatedPauseTime;
        }

        const remaining = Math.max(0, durationMs - elapsed);
        return Math.floor(remaining / 1000);
    }

    async startTopic(index: number): Promise<SessionState> {
        const newState: SessionState = {
            currentTopicIndex: index,
            startTime: Date.now(),
            accumulatedPauseTime: 0,
            isPaused: false,
            pausedAt: null
        };
        await this.repository.saveState(newState);
        return newState;
    }

    async togglePause(): Promise<SessionState> {
        const state = await this.repository.getState();
        const now = Date.now();

        if (state.isPaused) {
            // Reanudar
            if (state.pausedAt) {
                state.accumulatedPauseTime += (now - state.pausedAt);
            }
            state.isPaused = false;
            state.pausedAt = null;
        } else {
            // Pausar
            state.isPaused = true;
            state.pausedAt = now;
        }

        await this.repository.saveState(state);
        return state;
    }
}
