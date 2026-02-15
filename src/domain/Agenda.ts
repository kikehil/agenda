export interface Topic {
    id: number;
    tema: string;
    tipo: 'charla' | 'break';
    duracion: number; // en minutos
    expositor: string;
}

export interface SessionState {
    currentTopicIndex: number;
    startTime: number | null; // Timestamp
    accumulatedPauseTime: number; // ms
    isPaused: boolean;
    pausedAt: number | null; // Timestamp
}

export const initialState: SessionState = {
    currentTopicIndex: 0,
    startTime: null,
    accumulatedPauseTime: 0,
    isPaused: false,
    pausedAt: null
};
