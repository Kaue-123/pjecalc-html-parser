import { AppDataSource } from "./data-source";

export const queryDataFormat = async () => {
    const query = `
        SELECT
            d.calculo AS 'Código',
            d.reclamante AS 'Reclamante',
            d.reclamado AS 'Reclamada',
            d.processo AS 'Número do processo',
            d.id,
            d.periodoCalculo AS 'Período cálculo',
            DATE_FORMAT(d.dataAjuizamento, '%d/%m/%Y') AS 'Data do ajuizamento',
            DATE_FORMAT(d.dataLiquidacao, '%d/%m/%Y') AS 'Data da liquidação',
            FORMAT(SUM(r.valor), 2, 'de_DE') AS 'Valor corrigido',
            FORMAT(SUM(r.juros), 2, 'de_DE') AS 'Juros',
            FORMAT(SUM(r.total), 2, 'de_DE') AS 'Valor Total',
            s.createdAt
        FROM
            calculo.resumo_calculo r
        INNER JOIN
            calculo.dados_processo d
            ON r.dadosProcessoId = d.id
        INNER JOIN
            calculo.save_time_entity s
            ON s.dadosProcessoId = d.id
        GROUP BY
            d.calculo,
            d.reclamante,
            d.reclamado,
            d.processo,
            d.id,
            d.periodoCalculo,
            d.dataAjuizamento,
            d.dataLiquidacao,
            s.createdAt;
    `;

    const result = await AppDataSource.manager.query(query)
    return result
}