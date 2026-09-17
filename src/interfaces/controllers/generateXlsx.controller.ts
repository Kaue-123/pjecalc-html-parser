import { queryDataFormat } from "../../db/queryDataBase";
import * as XLSX from 'xlsx';
import { FastifyReply, FastifyRequest } from 'fastify';
import { join } from "path";
import { formattedDate } from "../../shared/utils/dateString";

export const generateXlsx = async (request: FastifyRequest, reply: FastifyReply) => { 
    try {
        const data = await queryDataFormat();

        if (!data || data.length === 0) {
            return reply.status(404).send({ message: 'No data found to export.' });
        }

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();

        const currentDate = new Date();
        const localeDate = formattedDate(currentDate);

        const safeFileName = localeDate.replace(/\//g, '-');

        XLSX.utils.book_append_sheet(workbook, worksheet, `EATON - PJE HTML`);

        const filePath = join(__dirname, `../../exports/EATON - ${safeFileName}.xlsx`);
        XLSX.writeFile(workbook, filePath);
        
        const buffer = await XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        reply.send({ message: "Arquivo gerado com sucesso.", filePath, buffer: buffer.toString('base64') });
    } catch (error) {
        reply.status(500).send({ message: 'Error generating Excel file.', error });
    }
}