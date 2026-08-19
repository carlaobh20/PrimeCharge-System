/* eslint-disable no-console */
// Auditoria determinística da Fase 3: risco contratual (engine transparente), checklist
// pré-contrato agrupado/parametrizável, parser de pendências [VALIDAR COM ADVOGADO] e dossiê.
// Rodar: npx tsx --tsconfig tsconfig.app.json scripts/audit-juridico-fase3.ts
import fs from 'node:fs';
import path from 'node:path';
import { calcularRiscoContratual, type InsumosRisco } from '../src/features/contracts/juridico/risco';
import { montarChecklistPreContrato, type InsumosFase3 } from '../src/features/contracts/juridico/checklist';
import { extrairPendenciasJuridicas } from '../src/features/contracts/juridico/pendenciasMinuta';
import { extrairCorpoDaMinuta } from '../src/features/contracts/juridico/minutaLib';
import { montarArquivosDossie, montarCapaDossie, PASTAS_DOSSIE, type DadosDossie } from '../src/features/contracts/juridico/dossie';

let passes = 0;
let fails = 0;
function check(caso: string, cond: boolean, msg: string) {
  if (cond) passes++;
  else fails++;
  console.log(`${cond ? 'PASS' : 'FALHOU'} [${caso}] ${msg}`);
}

const SEM_RISCO: InsumosRisco = {
  semVersaoDocumento: false, cnhVencida: false, cnhSemValidade: false, documentoMotoristaFaltante: false,
  seguroAusente: false, seguroVencido: false, seguroVencendo30d: false, apoliceNaoAnexada: false,
  assinaturaPendente: false, assinaturaRecusada: false, assinaturaExpirando: false,
  camposObrigatoriosFaltantes: 0, aditivoPendente: false, contratoVencendo30d: false, contratoVencido: false,
  templateSemRevisaoJuridica: false, rescisaoEmAndamento: false, inconsistenciaCadastral: false,
};

// ===== A. Risco =====
const baixo = calcularRiscoContratual(SEM_RISCO);
check('A', baixo.nivel === 'baixo' && baixo.pontos === 0 && baixo.motivos.length === 0, 'sem pendências => BAIXO com 0 pontos e 0 motivos');

const moderado = calcularRiscoContratual({ ...SEM_RISCO, aditivoPendente: true });
check('A', moderado.nivel === 'moderado' && moderado.pontos === 1, 'aditivo pendente (peso 1) => MODERADO');

const alto = calcularRiscoContratual({ ...SEM_RISCO, cnhVencida: true });
check('A', alto.nivel === 'alto' && alto.pontos === 4, 'CNH vencida (peso 4) => ALTO');
check('A', alto.motivos[0].rotulo.includes('CNH'), 'motivo explica o porquê (transparência)');

const critico = calcularRiscoContratual({ ...SEM_RISCO, cnhVencida: true, seguroVencido: true });
check('A', critico.nivel === 'critico' && critico.pontos === 8, 'CNH vencida + seguro vencido => CRÍTICO (8)');

const teto = calcularRiscoContratual({ ...SEM_RISCO, camposObrigatoriosFaltantes: 10 });
check('A', teto.pontos === 6, `teto de campos faltantes limita a 6 pontos (deu ${teto.pontos})`);
check('A', critico.motivos.every((m) => m.peso > 0) && critico.regua.critico === 8, 'régua declarada e pesos expostos (nada oculto)');

// ===== B. Checklist pré-contrato =====
const MOT = { id: 'm1', nome_completo: 'João', cpf: '12345678901', status: 'ativo', cnh_numero: '99', cnh_categoria: 'B', cnh_validade: '2030-01-01', endereco: 'Rua A' };
const VEI = { id: 'v1', placa: 'ABC1D23', renavam: 'R1', chassi: 'C1', ano_fabricacao: 2024, ano_modelo: 2025, status: 'disponivel', quilometragem: 10, marca: { nome: 'BYD' }, modelo: { nome: 'Dolphin' } };
const COND = { valor_periodico: 1400, periodicidade: 'semanal', dia_vencimento: 5, valor_caucao: 3000, data_inicio: '2026-09-01', data_fim_prevista: '2027-09-01', km_incluso: 'livre', regras_especificas: null };
const F3_OK: InsumosFase3 = {
  vistoriaEntregaOk: true, seguroCadastrado: true, seguroVigente: true, apoliceAnexada: true,
  templateComRevisaoAprovada: true, contatoMotoristaOk: true, documentacaoMotoristaOk: true, anexosObrigatoriosFaltantes: [],
};
const TPL = 'Contrato {{motorista.nome}} {{veiculo.placa}}';
const SNAP = { motorista: { nome: 'João' }, veiculo: { placa: 'ABC1D23' } };

const cl = montarChecklistPreContrato({ motorista: MOT, veiculo: VEI, condicoes: COND, templateCorpo: TPL, snapshot: SNAP, veiculoTemContratoAtivo: false, fase3: F3_OK, hoje: '2026-08-18' });
check('B', cl.podeGerar && cl.bloqueios.length === 0, 'cenário completo => pode gerar');
check('B', cl.porGrupo.motorista.length >= 5 && cl.porGrupo.veiculo.length >= 5 && cl.porGrupo.comercial.length >= 5 && cl.porGrupo.juridico.length >= 3, 'itens agrupados em 4 grupos');

const clSemSeguro = montarChecklistPreContrato({ motorista: MOT, veiculo: VEI, condicoes: COND, templateCorpo: TPL, snapshot: SNAP, fase3: { ...F3_OK, seguroCadastrado: false }, hoje: '2026-08-18' });
check('B', clSemSeguro.podeGerar, 'seguro ausente NÃO bloqueia por padrão (não é obrigatório base)');
const itemSeguro = clSemSeguro.itens.find((i) => i.chave === 'veiculo.seguro');
check('B', itemSeguro !== undefined && !itemSeguro.ok, 'mas o item aparece como não-ok no checklist');

const clPolitica = montarChecklistPreContrato({ motorista: MOT, veiculo: VEI, condicoes: COND, templateCorpo: TPL, snapshot: SNAP, fase3: { ...F3_OK, seguroCadastrado: false }, obrigatoriosDaPolitica: ['veiculo.seguro'], hoje: '2026-08-18' });
check('B', !clPolitica.podeGerar && clPolitica.bloqueios.some((b) => b.chave === 'veiculo.seguro'), 'política marca seguro como obrigatório => BLOQUEIA (parametrização real)');

const clCnh = montarChecklistPreContrato({ motorista: { ...MOT, cnh_numero: null }, veiculo: VEI, condicoes: COND, templateCorpo: TPL, snapshot: SNAP, fase3: F3_OK, hoje: '2026-08-18' });
check('B', !clCnh.podeGerar && clCnh.bloqueios.some((b) => b.chave === 'motorista.cnh'), 'sem CNH => bloqueio base (reuso da validação fase 2)');

const clAnexo = montarChecklistPreContrato({ motorista: MOT, veiculo: VEI, condicoes: COND, templateCorpo: TPL, snapshot: SNAP, fase3: { ...F3_OK, anexosObrigatoriosFaltantes: ['apolice_seguro'] }, hoje: '2026-08-18' });
check('B', !clAnexo.podeGerar && clAnexo.bloqueios.some((b) => b.chave === 'juridico.anexos'), 'anexo obrigatório da política faltando => bloqueia');

// ===== C. Pendências da minuta =====
const minutaMd = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), '../docs/juridico/contrato-master-minuta.md'), 'utf8');
const corpo = extrairCorpoDaMinuta(minutaMd);
const pendencias = extrairPendenciasJuridicas(corpo);
check('C', pendencias.length >= 10, `minuta tem >=10 marcações [VALIDAR COM ADVOGADO] no corpo (achou ${pendencias.length})`);
check('C', pendencias.every((p) => p.secao.length > 0), 'toda pendência tem a seção/cláusula de origem');
check('C', pendencias.some((p) => p.secao.includes('FORO')), 'pendência de FORO detectada na cláusula certa');
const semMarcacao = extrairPendenciasJuridicas('# T\n\nSem nada aqui.');
check('C', semMarcacao.length === 0, 'documento sem marcações => zero pendências');

// ===== D. Dossiê =====
const DADOS: DadosDossie = {
  contratoId: 'c1', numeroContrato: 'C-000123', motoristaNome: 'João', motoristaCpf: '123', veiculoPlaca: 'ABC1D23',
  empresaNome: 'PrimeCharge', statusContrato: 'ativo', dataInicio: '2026-09-01', dataFim: '2027-09-01',
  valorPeriodico: 'R$ 1.400,00', geradoEm: '2026-08-18T12:00:00Z',
  versoes: [{ rotulo: 'v1.0', status: 'vigente', hash: 'abc', criadoEm: '2026-08-18', corpo: 'CORPO V1' }],
  aditivos: [{ tipo: 'valor', status: 'vigente', descricao: 'Reajuste', criadoEm: '2026-08-18' }],
  assinaturas: [{ versaoRotulo: 'v1.0', parte: 'motorista', status: 'assinado', assinadoEm: '2026-08-18', motivoRecusa: null }],
  vistorias: [{ titulo: 'Entrega', tipo: 'entrega', status: 'concluido', criadoEm: '2026-08-18' }],
  seguros: [{ seguradora: 'Seg X', apolice: 'AP-1', vigenciaFim: '2027-01-01' }],
  sinistros: [], multas: [], documentosMotorista: [{ nome: 'cnh.pdf', categoria: 'cnh', criadoEm: '2026-08-01' }],
  timeline: [{ data: '2026-08-18', tipo: 'contrato_versao', descricao: 'Versão v1.0 criada' }],
  auditoria: [], versaoAtualRotulo: 'v1.0', hashVersaoAtual: 'abc',
  anexos: [{ pasta: '01_Contrato', nome: 'contrato-v1.pdf', bytes: new Uint8Array([37, 80, 68, 70]) }],
};
const arquivos = montarArquivosDossie(DADOS);
const pastas = new Set(arquivos.map((a) => a.pasta));
check('D', PASTAS_DOSSIE.every((p) => pastas.has(p)), `todas as ${PASTAS_DOSSIE.length} pastas do dossiê executivo presentes`);
const capa = montarCapaDossie(DADOS);
check('D', capa.includes('C-000123') && capa.includes('João') && capa.includes('não constitui parecer jurídico'), 'capa identifica o contrato e nega juízo jurídico');
const versaoArq = arquivos.find((a) => a.pasta === '02_Versoes');
check('D', versaoArq !== undefined && String(versaoArq.conteudo).includes('CORPO V1') && String(versaoArq.conteudo).includes('abc'), 'versão no dossiê carrega corpo + hash');
const anexo = arquivos.find((a) => a.nome === 'contrato-v1.pdf');
check('D', anexo !== undefined && anexo.conteudo instanceof Uint8Array, 'anexo binário preservado na pasta certa');
check('D', arquivos.every((a) => a.nome.length > 0 && !a.nome.includes('/')), 'nomes de arquivo sem path traversal');

console.log(`\n${passes} PASS, ${fails} FALHOU`);
if (fails > 0) process.exit(1);
