import { FastifyReply, FastifyRequest } from 'fastify';
import { criarLoteManual } from '../../modules/loteManual/loteManualService';
import { formattedDate } from '../../shared/utils/dateString';

/**
 * POST /api/lote-manual/consolidar
 *
 * Recebe múltiplos arquivos .xlsx via multipart/form-data,
 * extrai os dados da aba "At. STF" de cada um e retorna
 * um único arquivo Excel consolidado ("Lote Manual").
 *
 * Campos do form: qualquer quantidade de arquivos com o campo "files".
 */
export async function loteManualController(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        if (!request.isMultipart()) {
            return reply.status(400).send({ message: 'Tipo de mídia não suportado' });
        }

        const arquivos: Array<{ buffer: Buffer; nome: string }> = [];

        for await (const part of request.files()) {
            if (!part.filename.endsWith('.xlsx')) {
                continue;
            }

            const chunks: Uint8Array[] = [];
            for await (const chunk of part.file) {
                chunks.push(chunk);
            }
            arquivos.push({ buffer: Buffer.concat(chunks), nome: part.filename });
        }

        if (arquivos.length === 0) {
            return reply
                .status(400)
                .send({ message: 'Nenhum arquivo .xlsx válido enviado.' });
        }

        const loteBuffer = await criarLoteManual(arquivos);

        const dataAtual  = new Date();
        const dataStr    = formattedDate(dataAtual).replace(/\//g, '-');
        const nomeArquivo = `Lote_EATON_${dataStr}.xlsx`;

        reply
            .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            .header('Content-Disposition', `attachment; filename="${nomeArquivo}"`)
            .send(loteBuffer);
    } catch (error) {
        console.error('[loteManualController] Erro:', error);
        reply.status(500).send({ message: 'Erro ao gerar o lote manual.', error });
    }
}
