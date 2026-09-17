import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { fileController } from "../../interfaces/controllers/fileController";
import { generateXlsx } from "../../interfaces/controllers/generateXlsx.controller";

export async function fileRoutes(fastify: FastifyInstance) {
    fastify.register(async (fileRoutes) => {
        fileRoutes.post('/processar-arquivos', fileController);
    }); 
}

export async function generateXlsxRoute(fastify: FastifyInstance) {
     fastify.get("/export-xlsx", generateXlsx);
}