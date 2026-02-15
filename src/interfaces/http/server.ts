import fastify, { FastifyInstance } from 'fastify';
import fastifySocketIO from 'fastify-socket.io';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { Server } from 'socket.io';
import { RedisSessionRepository } from '../../infrastructure/redis/RedisSessionRepository';
import { TimerService } from '../../application/TimerService';
import { setupSocketHandlers } from './socketHandler';

declare module 'fastify' {
    interface FastifyInstance {
        io: Server;
    }
}

const server = fastify({ logger: true });

// --- INYECCIÓN DE DEPENDENCIAS ---
const repository = new RedisSessionRepository();
const timerService = new TimerService(repository);

// --- PLUGINS ---
server.register(fastifyStatic, {
    root: path.join(__dirname, '../../../public'),
});

server.register(fastifySocketIO, {
    cors: { origin: '*' }
});

// --- BOOTSTRAP ---
server.ready((err: Error | null) => {
    if (err) throw err;

    setupSocketHandlers(server.io, timerService, repository);
});

const start = async () => {
    try {
        const PORT = Number(process.env.PORT) || 3000;
        await server.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`🚀 Fastify OXXO Agenda running on http://localhost:${PORT}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
