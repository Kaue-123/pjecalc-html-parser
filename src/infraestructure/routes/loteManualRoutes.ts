import { FastifyInstance } from 'fastify';
import { loteManualController } from '../../interfaces/controllers/loteManual.controller';

export async function loteManualRoutes(fastify: FastifyInstance) {
    fastify.post('/lote-manual', loteManualController);
}
