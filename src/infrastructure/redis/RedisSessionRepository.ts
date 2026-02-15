import Redis from 'ioredis';
import { ISessionRepository } from '../../domain/SessionRepository';
import { SessionState, initialState } from '../../domain/Agenda';

export class RedisSessionRepository implements ISessionRepository {
    private redis: Redis | null = null;
    private fallbackState: SessionState = { ...initialState };

    constructor() {
        try {
            this.redis = new Redis({
                host: process.env.REDIS_HOST || '127.0.0.1',
                port: Number(process.env.REDIS_PORT) || 6379,
                maxRetriesPerRequest: 1,
                retryStrategy: () => null // Desactivar reintentos para no saturar logs
            });
            this.redis.on('error', (err) => {
                if (this.redis) {
                    console.warn('Redis offline: Using memory fallback.');
                    this.redis.disconnect();
                    this.redis = null;
                }
            });
        } catch (e) {
            console.warn('Redis client initialization failed.');
        }
    }

    async saveState(state: SessionState): Promise<void> {
        if (this.redis) {
            await this.redis.set('agenda:session', JSON.stringify(state));
        } else {
            this.fallbackState = state;
        }
    }

    async getState(): Promise<SessionState> {
        if (this.redis) {
            const data = await this.redis.get('agenda:session');
            return data ? JSON.parse(data) : initialState;
        }
        return this.fallbackState;
    }
}
