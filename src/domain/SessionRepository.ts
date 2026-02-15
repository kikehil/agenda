import { SessionState } from './Agenda';

export interface ISessionRepository {
    saveState(state: SessionState): Promise<void>;
    getState(): Promise<SessionState>;
}
