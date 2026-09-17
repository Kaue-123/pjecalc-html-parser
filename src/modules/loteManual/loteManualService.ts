import * as ExcelJS from 'exceljs';
// ─── Mapeamento de células do cabeçalho (aba "At. STF") ──────────────────────
const CEL_NUM_CALCULO    = 'J2';
const CEL_ORIGEM         = 'D2';
const CEL_PROCESSO       = 'D3';
const CEL_DATA_ATUALIZACAO = 'J3';
const CEL_RECLAMADA      = 'D4';
const CEL_RECLAMANTE     = 'D5';
const CEL_INDICE         = 'I5';

// Colunas de verbas (1-based, como openpyxl)
const LINHA_INICIO_VERBAS = 19;
const MARCADOR_FIM        = 'TOTAL LIQUIDO RECLAMANTE ATÉ';
const COL_VERBA           = 2;  // B
const COL_VALOR_CORRIGIDO = 5;  // E
const COL_CORRECAO        = 6;  // F
const COL_JUROS           = 7;  // G
const COL_ATUALIZACAO     = 8;  // H
const COL_VALOR_JUROS     = 10; // J
// ─────────────────────────────────────────────────────────────────────────────

interface Verba {
    verba:           string;
    valor_corrigido: number;
    correcao:        number;
    juros:           number;
    atualizacao:     number;
    valor_com_juros: number;
}

interface DadosProcesso {
    num_calculo:      any;
    indice:           any;
    origem:           any;
    reclamada:        any;
    processo:         any;
    data_atualizacao: any;
    reclamante:       any;
    verbas:           Verba[];
}

/** Resolve o valor real de uma célula, inclusive fórmulas com resultado cacheado. */
function resolverValor(cellValue: ExcelJS.CellValue): any {
    if (cellValue === null || cellValue === undefined) return null;
    if (typeof cellValue === 'object' && 'result' in (cellValue as any)) {
        return (cellValue as ExcelJS.CellFormulaValue).result ?? null;
    }
    return cellValue;
}

/** Extrai o valor de uma célula e retorna null em caso de erro (#VALOR!, etc.). */
function extrairValor(ws: ExcelJS.Worksheet, cel: string): any {
    const v = resolverValor(ws.getCell(cel).value);
    if (typeof v === 'string' && v.startsWith('#')) return null;
    return v;
}

/** Garante retorno numérico; células com erro ou vazias viram 0. */
function limpar(cellValue: ExcelJS.CellValue): number {
    const v = resolverValor(cellValue);
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && v.startsWith('#')) return 0;
    return 0;
}

/**
 * Percorre as linhas de verbas a partir de LINHA_INICIO_VERBAS,
 * ignorando linhas ocultas, até encontrar o marcador de fim.
 */
function extrairVerbas(ws: ExcelJS.Worksheet): Verba[] {
    const verbas: Verba[] = [];

    for (let rowNum = LINHA_INICIO_VERBAS; rowNum <= ws.rowCount; rowNum++) {
        const row = ws.getRow(rowNum);

        if (row.hidden) continue;

        const nomeRaw = resolverValor(row.getCell(COL_VERBA).value);
        if (nomeRaw === null || nomeRaw === undefined) continue;

        const nomeStr = String(nomeRaw);
        if (nomeStr.includes(MARCADOR_FIM)) break;
        if (typeof nomeRaw !== 'string') continue;

        verbas.push({
            verba:           nomeStr.trim(),
            valor_corrigido: limpar(row.getCell(COL_VALOR_CORRIGIDO).value),
            correcao:        limpar(row.getCell(COL_CORRECAO).value),
            juros:           limpar(row.getCell(COL_JUROS).value),
            atualizacao:     limpar(row.getCell(COL_ATUALIZACAO).value),
            valor_com_juros: limpar(row.getCell(COL_VALOR_JUROS).value),
        });
    }

    return verbas;
}

/**
 * Abre um arquivo individual (via Buffer) e retorna os dados extraídos.
 * Retorna null se a aba "At. STF" não existir.
 */
async function processarArquivo(
    buffer: Buffer,
    nomeArquivo: string,
): Promise<DadosProcesso | null> {
    const wb = new ExcelJS.Workbook();
    try {
        // .slice() sobre ArrayBufferLike sempre retorna ArrayBuffer (garantia da spec),
        // mas o TypeScript infere ArrayBufferLike — o cast pontual abaixo é seguro.
        const arrayBuffer = buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength,
        ) as ArrayBuffer;
        await wb.xlsx.load(arrayBuffer);
    } catch (e) {
        console.warn(`[ERRO] Não foi possível abrir '${nomeArquivo}': ${e}`);
        return null;
    }

    const ws = wb.getWorksheet('At. STF');
    if (!ws) {
        console.warn(`[AVISO] Aba 'At. STF' não encontrada em '${nomeArquivo}' — ignorado.`);
        return null;
    }

    return {
        num_calculo:      extrairValor(ws, CEL_NUM_CALCULO),
        indice:           extrairValor(ws, CEL_INDICE),
        origem:           extrairValor(ws, CEL_ORIGEM),
        reclamada:        extrairValor(ws, CEL_RECLAMADA),
        processo:         extrairValor(ws, CEL_PROCESSO),
        data_atualizacao: extrairValor(ws, CEL_DATA_ATUALIZACAO),
        reclamante:       extrairValor(ws, CEL_RECLAMANTE),
        verbas:           extrairVerbas(ws),
    };
}

// ─── Estilos reutilizáveis para o workbook de saída ──────────────────────────
const FONT_CABECALHO: Partial<ExcelJS.Font> = {
    bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10,
};
const FILL_CABECALHO: ExcelJS.Fill = {
    type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' },
};
const ALIGN_CABECALHO: Partial<ExcelJS.Alignment> = {
    horizontal: 'center', vertical: 'middle', wrapText: true,
};
const BORDA_FINA: Partial<ExcelJS.Borders> = {
    top:    { style: 'thin' }, bottom: { style: 'thin' },
    left:   { style: 'thin' }, right:  { style: 'thin' },
};
const FILLS_ALT: ExcelJS.Fill[] = [
    { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } },
    { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } },
];
const FONT_DADOS: Partial<ExcelJS.Font> = { name: 'Arial', size: 10 };
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recebe os buffers dos arquivos xlsx, processa cada um e retorna
 * o Buffer do Excel consolidado ("Lote Manual").
 */
export async function criarLoteManual(
    arquivos: Array<{ buffer: Buffer; nome: string }>,
): Promise<ArrayBuffer> {
    const wbOut  = new ExcelJS.Workbook();
    const wsOut  = wbOut.addWorksheet('Lote Manual');

    // ── Cabeçalhos ────────────────────────────────────────────────────────────
    const cabecalhos = [
        'Seq', 'Código', 'Nº Cálculo: ', 'Índice Correção:',
        'Origem: ', 'Reclamada', 'Processo N°', 'Atualização:',
        'Reclamante:', 'Reclamada:', 'Valor Corrigido',
        'Correção', 'Juros', 'Atualização', 'Valor com Juros',
    ];

    wsOut.columns = cabecalhos.map((header, i) => {
        const larguras = [5, 7, 11, 40, 42, 25, 30, 13, 30, 35, 16, 14, 14, 16, 16];
        return { header, width: larguras[i] ?? 14 };
    });

    wsOut.getRow(1).height = 30;
    wsOut.getRow(1).eachCell(cell => {
        cell.font      = FONT_CABECALHO;
        cell.fill      = FILL_CABECALHO;
        cell.alignment = ALIGN_CABECALHO;
        cell.border    = BORDA_FINA;
    });

    // ── Processar cada arquivo ─────────────────────────────────────────────────
    let seqGlobal   = 0;
    let codProcesso = 0;

    for (const arq of arquivos) {
        const dados = await processarArquivo(arq.buffer, arq.nome);
        if (!dados) continue;

        codProcesso++;
        const fillLinha = FILLS_ALT[codProcesso % 2];

        for (const verba of dados.verbas) {
            seqGlobal++;

            const row = wsOut.addRow([
                seqGlobal,
                codProcesso,
                dados.num_calculo,
                dados.indice,
                dados.origem,
                dados.reclamada,
                dados.processo,
                dados.data_atualizacao,
                dados.reclamante,
                verba.verba,
                verba.valor_corrigido,
                verba.correcao,
                verba.juros,
                verba.atualizacao,
                verba.valor_com_juros,
            ]);

            row.eachCell({ includeEmpty: true }, (cell, colIdx) => {
                cell.font   = FONT_DADOS;
                cell.border = BORDA_FINA;
                cell.fill   = fillLinha;

                // Colunas numéricas: K=11, L=12, M=13, N=14 (1-based)
                if (colIdx >= 11 && colIdx <= 14) {
                    cell.numFmt    = '#,##0.00';
                    cell.alignment = { horizontal: 'right' };
                } else if (colIdx === 8) {
                    // Coluna de data: H=8
                    cell.numFmt    = 'DD/MM/YYYY';
                    cell.alignment = { horizontal: 'center' };
                } else {
                    cell.alignment = { horizontal: 'left', vertical: 'middle' };
                }
            });
        }

        console.log(
            `  → ${codProcesso}. ${dados.reclamante} — ${dados.verbas.length} verba(s)`,
        );
    }

    // ── Linha de totais ────────────────────────────────────────────────────────
    if (seqGlobal > 0) {
        const ultima = wsOut.rowCount;
        const rowTotal = wsOut.addRow([
            '', '', '', '', '', '', '', '', '', 'TOTAL',
            { formula: `SUM(K2:K${ultima})` },
            { formula: `SUM(L2:L${ultima})` },
            { formula: `SUM(M2:M${ultima})` },
            { formula: `SUM(N2:N${ultima})` },
            '',
        ]);

        const fontTotal: Partial<ExcelJS.Font> = { bold: true, name: 'Arial', size: 10 };
        const fillTotal: ExcelJS.Fill = {
            type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' },
        };

        rowTotal.eachCell({ includeEmpty: true }, (cell, colIdx) => {
            cell.font   = fontTotal;
            cell.fill   = fillTotal;
            cell.border = BORDA_FINA;
            if (colIdx >= 11 && colIdx <= 14) {
                cell.numFmt    = '#,##0.00';
                cell.alignment = { horizontal: 'right' };
            }
        });
    }

    // Congela a primeira linha (equivalente ao freeze_panes = "A2")
    wsOut.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

    console.log(`\n✓ Lote gerado: ${codProcesso} processo(s), ${seqGlobal} verba(s).`);

    return wbOut.xlsx.writeBuffer();
}
