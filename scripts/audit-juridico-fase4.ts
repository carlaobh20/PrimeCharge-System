/* eslint-disable no-console */
// Auditoria determinística da Fase 4: resumo executivo (próxima ação objetiva) e dossiê com
// 11_Auditoria. Rodar: npx tsx --tsconfig tsconfig.app.json scripts/audit-juridico-fase4.ts
import { montarResumoExecutivo, type InsumosResumo } from '../src/features/contracts/juridico/resumoExecutivo';
import { montarArquivosDossie, montarCapaDossie, PASTAS_DOSSIE, type DadosDossie } from '../src/features/contracts/juridico/dossie';

let passes = 0;
let fails = 0;
function check(caso: string, cond: boolean, msg: string) {
  if (cond) passes++;
  else fails++;
  console.log(`${cond ? 'PASS' : 'FALHOU'} [${caso}] ${msg}`);
}

const BASE: InsumosResumo = {
  statusContrato: 'ativo', diasParaFim: 142, statusVersaoAtual: 'vigente',
  assinaturaMotorista: 'assinado', assinaturaPrimecharge: 'assinado', assinaturaExpiraEmDias: null,
  seguroCadastrado: true, seguroVenceEmDias: 200, pendencias: 0, rescisaoStatus: null, ultimaAtividade: null,
};

// A — resumo executivo: estados consolidados
const ok = montarResumoExecutivo(BASE);
check('A', ok.situacaoAssinatura === 'concluida' && ok.situacaoSeguro === 'vigente', 'contrato saudável: assinatura concluída + seguro vigente');
check('A', ok.prazoTexto === '142 dia(s) restantes', `prazo "${ok.prazoTexto}"`);
check('A', ok.proximaAcao.includes('acompanhar') || ok.proximaAcao.includes('Nenhuma'), 'sem pendência => nenhuma ação imediata');

// B — prioridade objetiva da próxima ação (ordem da Fase F)
const vencido = montarResumoExecutivo({ ...BASE, diasParaFim: -3 });
check('B', vencido.proximaAcao.includes('vencido'), '1º: contrato vencido domina a próxima ação');
const rescisao = montarResumoExecutivo({ ...BASE, rescisaoStatus: 'em_analise' });
check('B', rescisao.proximaAcao.includes('Rescisão'), '2º: rescisão em andamento');
const recusada = montarResumoExecutivo({ ...BASE, statusVersaoAtual: 'aguardando_assinatura', assinaturaMotorista: 'recusado', assinaturaPrimecharge: 'nao_enviado' });
check('B', recusada.situacaoAssinatura === 'recusada' && recusada.proximaAcao.includes('recusada'), '3º: assinatura recusada');
const expirando = montarResumoExecutivo({ ...BASE, statusVersaoAtual: 'aguardando_assinatura', assinaturaMotorista: 'enviado', assinaturaPrimecharge: 'nao_enviado', assinaturaExpiraEmDias: 2 });
check('B', expirando.situacaoAssinatura === 'expirando' && expirando.proximaAcao.includes('expira'), '4º: convite expirando');
const seguroVencido = montarResumoExecutivo({ ...BASE, seguroVenceEmDias: -1 });
check('B', seguroVencido.situacaoSeguro === 'vencido' && seguroVencido.proximaAcao.includes('Seguro vencido'), '5º: seguro vencido');
const rascunho = montarResumoExecutivo({ ...BASE, statusVersaoAtual: 'rascunho', assinaturaMotorista: null, assinaturaPrimecharge: null });
check('B', rascunho.proximaAcao.includes('revisão'), 'fluxo do documento: rascunho => enviar p/ revisão');
const aprovada = montarResumoExecutivo({ ...BASE, statusVersaoAtual: 'aprovada', assinaturaMotorista: null, assinaturaPrimecharge: null });
check('B', aprovada.proximaAcao.includes('congela'), 'fluxo: aprovada => enviar p/ assinatura (congela)');
const semDoc = montarResumoExecutivo({ ...BASE, statusVersaoAtual: null, assinaturaMotorista: null, assinaturaPrimecharge: null });
check('B', semDoc.proximaAcao.includes('primeira versão'), 'sem documento => gerar primeira versão');
const renovacao = montarResumoExecutivo({ ...BASE, diasParaFim: 20 });
check('B', renovacao.proximaAcao.includes('Renovação'), 'vencendo em 20d => decidir renovação');
const indeterminado = montarResumoExecutivo({ ...BASE, diasParaFim: null });
check('B', indeterminado.prazoTexto === 'Prazo indeterminado', 'sem data fim => prazo indeterminado');

// C — dossiê: 12 pastas com auditoria + capa com hash/versão
const DADOS: DadosDossie = {
  contratoId: 'c1', numeroContrato: 'C-TESTE', motoristaNome: 'D', motoristaCpf: null, veiculoPlaca: 'AAA0A00',
  empresaNome: 'PrimeCharge', statusContrato: 'ativo', dataInicio: '01/01/2026', dataFim: null, valorPeriodico: 'R$ 1,00',
  geradoEm: '2026-08-18', versoes: [], aditivos: [], assinaturas: [], vistorias: [], seguros: [], sinistros: [],
  multas: [], documentosMotorista: [], timeline: [],
  auditoria: [{ data: '18/08/2026', usuario: 'u1', acao: 'UPDATE', tabela: 'contrato_versoes' }],
  versaoAtualRotulo: 'v2.0', hashVersaoAtual: 'abc123', anexos: [],
};
const arquivos = montarArquivosDossie(DADOS);
check('C', PASTAS_DOSSIE.length === 12 && PASTAS_DOSSIE[11] === '11_Auditoria', 'PASTAS_DOSSIE tem 12 pastas com 11_Auditoria');
const auditArq = arquivos.find((a) => a.pasta === '11_Auditoria');
check('C', auditArq !== undefined && String(auditArq.conteudo).includes('UPDATE em contrato_versoes'), '11_Auditoria lista os registros visíveis');
const capa = montarCapaDossie(DADOS);
check('C', capa.includes('v2.0') && capa.includes('abc123'), 'capa contém versão atual e hash SHA-256');
const vazio = montarArquivosDossie({ ...DADOS, auditoria: [] });
check('C', String(vazio.find((a) => a.pasta === '11_Auditoria')!.conteudo).includes('restrita a administradores'),
  'sem permissão de auditoria => dossiê explica em vez de fingir vazio');

console.log(`\n${passes} PASS, ${fails} FALHOU`);
if (fails > 0) process.exit(1);
