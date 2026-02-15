import { TimerService } from '../src/application/TimerService';
import { ISessionRepository } from '../src/domain/SessionRepository';
import { SessionState, Topic } from '../src/domain/Agenda';

describe('TimerService', () => {
    let timerService: TimerService;
    let mockRepository: ISessionRepository;
    let state: SessionState;

    beforeEach(() => {
        const now = 2000000000000; // Fixed timestamp
        jest.spyOn(Date, 'now').mockReturnValue(now);

        state = {
            currentTopicIndex: 0,
            startTime: now - 10000, // 10s elapsed
            accumulatedPauseTime: 0,
            isPaused: false,
            pausedAt: null
        };

        mockRepository = {
            saveState: jest.fn(),
            getState: jest.fn().mockResolvedValue(state)
        };

        timerService = new TimerService(mockRepository);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('debe calcular el tiempo restante correctamente', async () => {
        const topic: Topic = { id: 1, tema: 'Test', tipo: 'charla', duracion: 1, expositor: 'Juan' };
        const remaining = await timerService.calculateRemaining(topic, state);

        // 60s total - 10s elapsed = 50s
        expect(remaining).toBe(50);
    });

    it('debe aumentar el tiempo acumulado de pausa al reanudar', async () => {
        state.isPaused = true;
        state.pausedAt = Date.now() - 5000; // pausado hace 5s

        await timerService.togglePause();

        expect(mockRepository.saveState).toHaveBeenCalledWith(expect.objectContaining({
            isPaused: false,
            accumulatedPauseTime: 5000
        }));
    });
});
