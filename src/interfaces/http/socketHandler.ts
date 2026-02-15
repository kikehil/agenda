import { Server, Socket } from 'socket.io';
import { TimerService } from '../../application/TimerService';
import { Topic } from '../../domain/Agenda';
import { ISessionRepository } from '../../domain/SessionRepository';

const agenda: Topic[] = [
    { id: 1, tema: 'Bienvenida', tipo: 'charla', duracion: 5, expositor: 'Juan' },
    { id: 2, tema: 'Reporte de Ventas', tipo: 'charla', duracion: 10, expositor: 'Maria' },
    { id: 3, tema: 'Coffee Break', tipo: 'break', duracion: 15, expositor: 'Todos' }
];

export function setupSocketHandlers(io: Server, timerService: TimerService, repository: ISessionRepository) {
    io.on('connection', async (socket: Socket) => {
        console.log('Cliente conectado:', socket.id);

        const sync = async () => {
            const state = await repository.getState();
            const remainingSeconds = await timerService.calculateRemaining(agenda[state.currentTopicIndex], state);
            socket.emit('sync', { agenda, state, remainingSeconds });
        };

        await sync();

        socket.on('start-topic', async (index: number) => {
            await timerService.startTopic(index);
            io.emit('refresh'); // Indica a todos que pidan sync o broadcast global
        });

        socket.on('toggle-pause', async () => {
            await timerService.togglePause();
            io.emit('refresh');
        });

        // Broadcast de tiempo cada segundo
        const timerInterval = setInterval(async () => {
            const state = await repository.getState();
            const remainingSeconds = await timerService.calculateRemaining(agenda[state.currentTopicIndex], state);
            socket.emit('timer-update', { remainingSeconds, isPaused: state.isPaused });
        }, 1000);

        socket.on('disconnect', () => clearInterval(timerInterval));
    });
}
