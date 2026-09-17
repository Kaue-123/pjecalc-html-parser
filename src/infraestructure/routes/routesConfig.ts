import { fileRoutes, generateXlsxRoute } from "./fileRoutes";
import { loteManualRoutes } from "./loteManualRoutes";
import { FastifyInstance } from  "fastify";


export const routes = async (fastify: FastifyInstance ) => { 
    fastify.register(fileRoutes, { prefix: '/api'})
    fastify.register(generateXlsxRoute, { prefix: '/api'})
    fastify.register(loteManualRoutes, { prefix: '/api'})
}