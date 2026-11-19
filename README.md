# pjecalc-html-parser

API em Node.js + TypeScript que lê os relatórios de cálculo exportados pelo
**PJe-Calc** (Sistema de Cálculos Trabalhistas) em HTML, extrai os dados de cada
processo e grava tudo num banco MySQL. Do banco sai uma planilha `.xlsx`
consolidada com todos os cálculos processados.

Também consolida em lote planilhas `.xlsx` de atualização de cálculo (aba
`At. STF`) num único arquivo.

## Como funciona

```
relatório .html do PJe-Calc
        │  (upload pela API ou arquivo colocado na pasta monitorada)
        ▼
Puppeteer abre o HTML e lê o texto da tabela
        │
        ▼
parsers extraem três blocos do texto
  ├─ cabeçalho  → processo, cálculo, reclamante, reclamado, datas
  ├─ resumo     → verbas com valor corrigido, juros e total
  └─ provimento → créditos e débitos, separados por reclamante / reclamada
        │
        ▼
MySQL (TypeORM)  ──►  GET /api/export-xlsx  ──►  planilha consolidada
```

- Um processo que já está no banco é substituído quando o relatório dele é lido
  de novo, sem duplicar.
- Os valores vêm no formato brasileiro (`1.234,56`, negativos entre parênteses) e
  são convertidos para número.
- A pasta de entrada é monitorada: arquivos novos são processados sozinhos alguns
  segundos depois de chegarem.

## Stack

- Node.js 20 + TypeScript
- Fastify (`@fastify/multipart` para upload)
- Puppeteer (leitura do HTML num Chrome headless)
- TypeORM + MySQL
- `xlsx` e `exceljs` para gerar e ler planilhas

## Requisitos

- Node.js 20 (versão em `.tool-versions`)
- MySQL com um banco chamado **`calculo`**: as consultas de exportação usam esse
  nome direto
- Google Chrome ou Chromium instalado

## Configuração

```bash
npm install
cp .env.example .env
```

Preencha o `.env`:

| Variável | Uso |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` | conexão com o MySQL |
| `DB_NAME` | nome do banco, `calculo` |
| `EXECUTABLE_PATH` | caminho do Chrome/Chromium usado pelo Puppeteer |

As tabelas são criadas pelo TypeORM na primeira execução (`synchronize: true`).

Crie as pastas de trabalho antes de subir a API:

```bash
mkdir -p src/files src/shared/files src/exports
```

| Pasta | Papel |
|---|---|
| `src/files` | relatórios lidos uma vez, quando a API sobe |
| `src/shared/files` | destino dos uploads; monitorada durante a execução |
| `src/exports` | onde a planilha consolidada é gravada |

## Executando

```bash
npm run dev
```

A API sobe na porta **145**. No Linux, portas abaixo de 1024 exigem permissão
extra; se for o caso, troque a porta em `src/index.ts`.

## Endpoints

| Método | Rota | O que faz |
|---|---|---|
| `POST` | `/api/processar-arquivos` | recebe um relatório `.html` (multipart) e o coloca na pasta monitorada |
| `GET` | `/api/export-xlsx` | gera a planilha com todos os processos do banco; responde com o caminho e o arquivo em base64 |
| `POST` | `/api/lote-manual` | recebe várias planilhas `.xlsx` (multipart), lê a aba `At. STF` de cada uma e devolve um único `.xlsx` consolidado |

Exemplo:

```bash
curl -F "file=@relatorio.html" http://localhost:145/api/processar-arquivos
curl -F "files=@calc1.xlsx" -F "files=@calc2.xlsx" \
     http://localhost:145/api/lote-manual -o lote.xlsx
```

## Banco de dados

| Tabela | Conteúdo |
|---|---|
| `dados_processo` | cabeçalho do cálculo (processo, partes, datas) |
| `resumo_calculo` | verbas do resumo: valor corrigido, juros e total |
| `provimento_geral` | créditos e débitos, com o tipo (`reclamante`, `reclamada`, `verbas_nao_principal`) |
| `save_time_entity` | quando cada processo foi importado |

## Estrutura

```
src/
├── index.ts                       # sobe o Fastify e processa src/files
├── db/                            # conexão TypeORM e consulta da exportação
├── domain/service/                # parsers: cabeçalho, resumo, provimento
├── modules/calculo/entities/      # entidades do banco
├── modules/loteManual/            # consolidação das planilhas .xlsx
├── interfaces/controllers/        # controllers das rotas
├── infraestructure/routes/        # registro das rotas
└── shared/utils/                  # arquivos, datas, conversão de valores
```

## Versão em PHP

A branch `refactor/ts-to-php` tem uma versão do mesmo parser em PHP 8.2
(Workerman, Doctrine DBAL e PhpSpreadsheet).

## Dados

Os relatórios do PJe-Calc trazem nomes, números de processo e valores. Por isso
as pastas de entrada e de exportação estão no `.gitignore`. Não versione
relatórios reais.
