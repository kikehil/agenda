import fastify from 'fastify';
import fastifySocketIO from 'fastify-socket.io';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { Server, Socket } from 'socket.io';
import { AgendaItem } from './domain/types';

// --- STATE MANAGEMENT ---
let state: any = {
    agenda: [
        { id: '1', plannedStart: '08:00', plannedEnd: '08:10', durationString: '00:10', topic: 'Bienvenida', speaker: 'Coordinador', type: 'talk' },
        { id: '2', plannedStart: '08:10', plannedEnd: '08:40', durationString: '00:30', topic: 'Sesión Técnica', speaker: 'Ing. Perez', type: 'talk' },
        { id: '3', plannedStart: '08:40', plannedEnd: '08:50', durationString: '00:10', topic: 'Receso', speaker: 'Todos', type: 'break' }
    ],
    currentTopicIndex: 0,
    startTime: null,
    pausedAt: null,
    accumulatedPauseTime: 0,
    isPaused: true,
    metadata: { tituloDia: 'Sesión OxxoTime', zona: 'Nacional', monitor: 'Moderador' }
};

// --- HELPERS ---
const durationToSeconds = (durationStr: string): number => {
    if (!durationStr) return 0;
    const [hrs, mins] = durationStr.split(':').map(Number);
    return (hrs * 3600) + (mins * 60);
};

const calculateRemaining = () => {
    if (state.agenda.length === 0) return 0;
    const current = state.agenda[state.currentTopicIndex];
    if (!state.startTime) return durationToSeconds(current.durationString);

    const durationMs = durationToSeconds(current.durationString) * 1000;
    let elapsed = 0;

    if (state.isPaused && state.pausedAt) {
        elapsed = state.pausedAt - state.startTime - state.accumulatedPauseTime;
    } else {
        elapsed = Date.now() - state.startTime - state.accumulatedPauseTime;
    }

    const remaining = Math.max(0, durationMs - elapsed);
    return Math.floor(remaining / 1000);
};

// --- WEB SERVER SETUP ---
const app = fastify({ logger: false });

app.register(fastifyStatic, {
    root: path.join(__dirname, '../public'),
});

app.register(fastifySocketIO, {
    cors: { origin: '*' }
});

const ADMIN_PASSWORD = "OXXO";

app.ready((err) => {
    if (err) throw err;

    const io = app.io;

    io.on('connection', (socket: Socket) => {
        let isAdmin = false;

        // Sync inicial
        socket.emit('sync', {
            ...state,
            remainingSeconds: calculateRemaining()
        });

        socket.on('admin-login', (pass: string) => {
            if (pass === ADMIN_PASSWORD) {
                isAdmin = true;
                socket.emit('admin-auth-success');
                socket.emit('sync', { ...state, remainingSeconds: calculateRemaining() });
            } else {
                socket.emit('admin-auth-fail', 'Contraseña incorrecta');
            }
        });

        socket.on('update-agenda', (newAgenda: AgendaItem[]) => {
            if (!isAdmin) return;
            state.agenda = newAgenda;
            if (state.currentTopicIndex >= state.agenda.length) {
                state.currentTopicIndex = Math.max(0, state.agenda.length - 1);
            }
            io.emit('sync', { ...state, remainingSeconds: calculateRemaining() });
        });

        socket.on('admin-action', (action: string) => {
            if (!isAdmin) return;
            const now = Date.now();
            switch (action) {
                case 'start':
                    if (state.isPaused) {
                        if (!state.startTime) state.startTime = now;
                        else if (state.pausedAt) state.accumulatedPauseTime += (now - state.pausedAt);
                        state.isPaused = false;
                        state.pausedAt = null;
                    }
                    break;
                case 'pause':
                    if (!state.isPaused) {
                        state.isPaused = true;
                        state.pausedAt = now;
                    }
                    break;
                case 'next':
                    if (state.currentTopicIndex < state.agenda.length - 1) {
                        state.currentTopicIndex++;
                        state.startTime = now;
                        state.pausedAt = null;
                        state.accumulatedPauseTime = 0;
                        state.isPaused = false;
                    }
                    break;
                case 'prev':
                    if (state.currentTopicIndex > 0) {
                        state.currentTopicIndex--;
                        state.startTime = now;
                        state.pausedAt = null;
                        state.accumulatedPauseTime = 0;
                        state.isPaused = false;
                    }
                    break;
                case 'reset':
                    state.startTime = null;
                    state.pausedAt = null;
                    state.accumulatedPauseTime = 0;
                    state.isPaused = true;
                    break;
            }
            io.emit('sync', { ...state, remainingSeconds: calculateRemaining() });
        });
    });

    // Broadcast global cada segundo
    setInterval(() => {
        io.emit('timer-tick', {
            remainingSeconds: calculateRemaining(),
            isPaused: state.isPaused,
            currentTopicIndex: state.currentTopicIndex
        });
    }, 1000);
});

const start = async () => {
    try {
        await app.listen({ port: 3000, host: '0.0.0.0' });
        console.log(`\n🔴 OxxoTime Backend Sincronizado Ready!`);
    } catch (err) {
        process.exit(1);
    }
};

start();
