const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// --- CONFIGURACIÓN DE LA AGENDA ---
const agenda = [
    { id: 1, tema: 'Bienvenida', tipo: 'charla', duracion: 5, expositor: 'Juan' }, // duracion en minutos
    { id: 2, tema: 'Reporte de Ventas', tipo: 'charla', duracion: 10, expositor: 'Maria' },
    { id: 3, tema: 'Coffee Break', tipo: 'break', duracion: 15, expositor: 'Todos' }
];

// --- ESTADO GLOBAL DEL SERVIDOR (Single Source of Truth) ---
let state = {
    currentIndex: 0,
    startTime: Date.now(),
    pausedAt: null,
    totalPausedDuration: 0,
    isPaused: false
};

// --- LÓGICA DE TIEMPO ---
function getRemainingTime() {
    const currentTopic = agenda[state.currentIndex];
    const durationMs = currentTopic.duracion * 60 * 1000;
    
    let elapsed;
    if (state.isPaused) {
        elapsed = state.pausedAt - state.startTime - state.totalPausedDuration;
    } else {
        elapsed = Date.now() - state.startTime - state.totalPausedDuration;
    }
    
    const remaining = Math.max(0, durationMs - elapsed);
    return Math.floor(remaining / 1000); // en segundos
}

function resetTopic(index) {
    state.currentIndex = index;
    state.startTime = Date.now();
    state.pausedAt = null;
    state.totalPausedDuration = 0;
    state.isPaused = false;
}

// --- COMUNICACIÓN REAL-TIME ---
io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    // Sincronización inicial
    socket.emit('sync', {
        agenda,
        state,
        remainingSeconds: getRemainingTime()
    });

    // Cambiar de tema
    socket.on('cambiar-tema', (index) => {
        if (index >= 0 && index < agenda.length) {
            resetTopic(index);
            io.emit('sync', {
                agenda,
                state,
                remainingSeconds: getRemainingTime()
            });
            console.log(`Cambiado a tema: ${agenda[index].tema}`);
        }
    });

    // Pausar / Reanudar
    socket.on('alternar-pausa', () => {
        if (state.isPaused) {
            // Reanudar
            state.totalPausedDuration += Date.now() - state.pausedAt;
            state.pausedAt = null;
            state.isPaused = false;
        } else {
            // Pausar
            state.pausedAt = Date.now();
            state.isPaused = true;
        }
        
        io.emit('sync', {
            agenda,
            state,
            remainingSeconds: getRemainingTime()
        });
    });
});

// Broadcast periódico de sincronización (cada segundo para asegurar precisión)
setInterval(() => {
    io.emit('timer-update', {
        remainingSeconds: getRemainingTime(),
        isPaused: state.isPaused
    });
}, 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor OXXO Agenda corriendo en http://localhost:${PORT}`);
});
