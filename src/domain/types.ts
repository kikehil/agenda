export interface SessionMetadata {
    tituloDia: string;
    zona: string;
    fecha: string;
    lugar: string;
    monitor: string;
    anotador: string;
}

export interface AgendaItem {
    id: string;
    plannedStart: string; // "08:30"
    plannedEnd: string;   // "09:00"
    durationString: string; // "00:30" (Tiempo)
    topic: string;
    speaker: string;
    type: 'talk' | 'break' | 'meal';
    alertMinutes?: number; // Minutos antes de terminar para sonar la alarma
}

export interface SessionState {
    metadata: SessionMetadata;
    agenda: AgendaItem[];
    currentTopicIndex: number;
    startTime: number | null;
    pausedAt: number | null;
    accumulatedPauseTime: number;
    isPaused: boolean;
}
