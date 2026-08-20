/* eslint-disable no-console */
// Auditoria determinística da Fase 8 — GOVERNANÇA CONTRATUAL:
// A) divergências snapshot × cadastro (completa e em lote, com normalização honesta);
// B) conformidade operacional (bloqueado/atenção/ok + integridade documental + indicador);
// C) agenda contratual (janelas 1/7/15/30/60/90); D) checklist de renovação;
// E) reconciliação + relatório; F) distribuição de versões + relatório de governança;
// G) próxima ação (divergência/doc rejeitado no motor existente) + dossiê executivo 22 pastas;
// H) honestidade (vocabulário proibido ausente), lazy/performance e ZERO migration.
// SQL correspondente: supabase/tests/65_juridico_fase8.sql (retroatividade repetida,
// concorrência, órfãos, RLS A/B/inativos). Rodar: npx tsx --tsconfig tsconfig.app.json scripts/audit-juridico-fase8.ts
import fs from 'node:fs';
import path from 'node:path';
import {
  avaliarChecklistRenovacao,
  avaliarConformidade,
  compararSnapshotComCadastro,
  distribuirVersoesUsadas,
  divergenciasLote,
  montarAgendaContratual,
  montarRelatorioGovernanca,
  montarRelatorioReconciliacao,
  reconciliarContrato,
  type ConformidadeOperacional,
} from '../src/features/contracts/juridico/governanca';
import { montarResumoExecutivo } from '../src/features/contracts/juridico/resumoExecutivo';
import { PASTAS_DOSSIE, montarArquivosDossie, type DadosDossie } from '../src/features/contracts/juridico/dossie';

let passes = 0;
let fails = 0;
function check(caso: string, cond: boolean, msg: string) {
  if (cond) passes++;
  else fails++;
  console.log(`${cond ? 'PASS' : 'FALHOU'} [${caso}] ${msg}`);
}
const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), '..');

// ===== A. Divergências =====
const SNAP = { motorista: { nome: 'João da Silva', cpf: '123.456.789-01' }, veiculo: { placa: 'ABC1D23', chassi: '9BW111' }, contrato: { valor_periodico: 'R$ 1.400,00', periodicidade: 'semanal', dia_vencimento: '5', valor_caucao: 'R$ 3.000,00' }, empresa: { razao_social: 'PrimeCharge LTDA' } };
const igual = compararSnapshotComCadastro(SNAP, SNAP);
check('A', igual.length === 0, 'snapshot idêntico → SEM ALTERAÇÃO');
const mudou = compararSnapshotComCadastro(SNAP, { ...SNAP, contrato: { ...SNAP.contrato, periodicidade: 'diária' }, veiculo: { placa: 'XYZ9Z99', chassi: '9BW111' } });
check('A', mudou.some((d) => d.caminho === 'contrato.periodicidade' && d.valorContrato === 'semanal' && d.valorAtual === 'diária'), 'periodicidade semanal→diária detectada (exemplo da missão)');
check('A', mudou.find((d) => d.caminho === 'veiculo.placa')?.prioridade === 'critico' && mudou[0].caminho === 'veiculo.placa', 'troca de placa é CRÍTICA e ordena primeiro');
const semCampo = compararSnapshotComCadastro({ contrato: { valor_periodico: 'R$ 1,00' } }, { contrato: {} });
check('A', semCampo.length === 0, 'campo ausente de um lado NÃO é divergência (Módulo 29 — nunca inventar dado)');
const lote = divergenciasLote(SNAP, { motoristaNome: 'João da Silva', motoristaCpf: '12345678901', veiculoPlaca: 'abc-1d23', valorPeriodico: 1400, periodicidade: 'Semanal', diaVencimento: 5, valorCaucao: 3000 });
check('A', lote.length === 0, 'lote: normalização (CPF sem máscara, placa minúscula, BRL→número) evita falsos positivos');
const loteDiff = divergenciasLote(SNAP, { motoristaNome: 'João da Silva', motoristaCpf: '12345678901', veiculoPlaca: 'ABC1D23', valorPeriodico: 1500, periodicidade: 'semanal', diaVencimento: 5, valorCaucao: 3000 });
check('A', loteDiff.length === 1 && loteDiff[0].caminho === 'contrato.valor_periodico', 'lote: valor semanal mudou no cadastro → divergência detectada');

// ===== B. Conformidade =====
const BASE = {
  contratoStatus: 'ativo', diasParaFim: 100, temVersaoVigenteOuAssinada: true, versaoCongelada: true, hashConfere: true as boolean | null,
  assinaturasFaltantes: [] as string[], assinaturaRecusada: false, assinaturaExpirada: false,
  seguro: { cadastrado: true, venceEmDias: 200, coberturaInformada: true, franquiaInformada: true },
  documentosObrigatoriosFaltantes: [] as string[], documentosRejeitados: [] as string[],
  cnhVencida: false, cnhVenceEmDias: 300, divergencias: 0, rescisaoEmAndamento: false, obrigacoesVencidas: 0,
};
const ok = avaliarConformidade(BASE);
check('B', ok.status === 'ok' && ok.indicadorOperacional === 'normal' && ok.integridadeDocumental === 'ok', 'contrato completo → OK/NORMAL/OK');
const segVencido = avaliarConformidade({ ...BASE, seguro: { ...BASE.seguro, venceEmDias: -3 } });
check('B', segVencido.status === 'bloqueado' && segVencido.bloqueios[0].motivo.includes('VENCIDO'), 'seguro vencido + contrato vigente → BLOQUEADO com motivo (exemplo da missão)');
check('B', segVencido.indicadorOperacional === 'critico', 'indicador operacional acompanha: CRÍTICO');
const seg7 = avaliarConformidade({ ...BASE, seguro: { ...BASE.seguro, venceEmDias: 7 } });
check('B', seg7.status === 'atencao' && seg7.alertas.some((a) => a.motivo.includes('7 dia')), 'seguro vence em 7 dias → ATENÇÃO');
const docRej = avaliarConformidade({ ...BASE, documentosRejeitados: ['cnh'] });
check('B', docRej.status === 'bloqueado' && docRej.bloqueios[0].motivo.includes('REJEITADO'), 'documento obrigatório rejeitado → BLOQUEADO (exemplo da missão)');
const assPend = avaliarConformidade({ ...BASE, assinaturasFaltantes: ['motorista'] });
check('B', assPend.status === 'atencao' && assPend.integridadeDocumental === 'atencao', 'assinatura pendente → ATENÇÃO (conformidade e integridade)');
const assExp = avaliarConformidade({ ...BASE, assinaturaExpirada: true, assinaturasFaltantes: ['motorista'] });
check('B', assExp.alertas.some((a) => a.motivo.includes('EXPIRADA') && a.motivo.includes('não é invalidado')), 'assinatura expirada NÃO invalida contrato — mensagem de ação necessária (Módulo 9)');
const hashRuim = avaliarConformidade({ ...BASE, hashConfere: false });
check('B', hashRuim.integridadeDocumental === 'critico' && hashRuim.bloqueios.some((b) => b.origem === 'integridade'), 'hash divergente → integridade CRÍTICA (nunca corrigido em silêncio)');
const bloq = avaliarConformidade({ ...BASE, seguro: { ...BASE.seguro, venceEmDias: -1 }, assinaturasFaltantes: ['motorista'], documentosRejeitados: ['cnh'] });
check('B', bloq.status === 'bloqueado' && bloq.bloqueios.length >= 2 && bloq.alertas.length >= 1, 'exemplo da missão: BLOQUEADO com lista de motivos (seguro vencido + doc rejeitado + assinatura)');
const semSeguroInfo = avaliarConformidade({ ...BASE, seguro: { cadastrado: true, venceEmDias: 200, coberturaInformada: false, franquiaInformada: false } });
check('B', semSeguroInfo.pendencias.some((p) => p.motivo.includes('NÃO INFORMADAS')) && semSeguroInfo.pendencias.some((p) => p.motivo.includes('Franquia')), 'cobertura/franquia não informadas → sinalizadas como dado ausente (Módulo 11, nunca presumidas)');

// ===== C. Agenda =====
const agenda = montarAgendaContratual([
  { tipo: 'fim_contrato', descricao: 'a', contratoId: 'c1', diasRestantes: -2 },
  { tipo: 'seguro_vence', descricao: 'b', contratoId: 'c1', diasRestantes: 5 },
  { tipo: 'cnh_vence', descricao: 'c', contratoId: null, diasRestantes: 12 },
  { tipo: 'renovacao', descricao: 'd', contratoId: 'c2', diasRestantes: 25 },
  { tipo: 'obrigacao', descricao: 'e', contratoId: null, diasRestantes: 45 },
  { tipo: 'documento_vence', descricao: 'f', contratoId: null, diasRestantes: 80 },
  { tipo: 'vistoria', descricao: 'fora', contratoId: null, diasRestantes: 120 },
]);
check('C', agenda.length === 6 && agenda.map((b) => b.horizonteDias).join() === '1,7,15,30,60,90', 'agenda distribui nas 6 janelas (1/7/15/30/60/90) e descarta >90');
check('C', agenda[0].eventos[0].diasRestantes === -2, 'atrasado entra no bucket "Hoje/atrasados" ordenado primeiro');

// ===== D. Checklist de renovação =====
const confOk: ConformidadeOperacional = ok;
const chk = avaliarChecklistRenovacao({ conformidade: confOk, motoristaAtivo: true, cnhValida: true, veiculoDisponivelOuAlugado: true, seguroVigente: true, vistoriaRegistrada: true, financeiroSemSaldoDevedor: true, documentosOk: true, aditivosRascunho: 0, rescisaoEmAndamento: false, templateComRevisaoAprovada: true });
check('D', chk.length === 11 && chk.every((c) => c.resultado === 'passou'), 'checklist de renovação: 11 itens, tudo PASSOU no cenário limpo');
const chkBloq = avaliarChecklistRenovacao({ conformidade: segVencido, motoristaAtivo: true, cnhValida: null, veiculoDisponivelOuAlugado: true, seguroVigente: false, vistoriaRegistrada: false, financeiroSemSaldoDevedor: null, documentosOk: true, aditivosRascunho: 1, rescisaoEmAndamento: true, templateComRevisaoAprovada: false });
check('D', chkBloq.some((c) => c.item === 'Seguro' && c.resultado === 'bloqueado') && chkBloq.some((c) => c.item === 'Rescisão' && c.resultado === 'bloqueado'), 'seguro ausente e rescisão em andamento BLOQUEIAM a renovação');
check('D', chkBloq.find((c) => c.item === 'CNH')?.resultado === 'pendente' && chkBloq.find((c) => c.item === 'CNH')!.detalhe.includes('NÃO INFORMADA'), 'CNH sem validade → PENDENTE com "NÃO INFORMADA" (nunca data fictícia)');
check('D', chkBloq.find((c) => c.item === 'Revisão jurídica do modelo')!.detalhe.includes('MINUTA'), 'sem revisão aprovada → avisa que o documento sai como MINUTA (regra parametrizável)');

// ===== E. Reconciliação =====
const rec = reconciliarContrato({ hashRecalculadoConfere: true, versaoCongelada: true, divergenciasSnapshot: 0, versaoTemOrigemTemplate: true, assinaturasDaVersaoCongelada: 2, assinaturasConcluidas: 2, arquivosDoContrato: 3, eventosTimeline: 5, aditivosSemDocumento: 0 });
check('E', rec.every((r) => r.resultado === 'ok'), 'reconciliação limpa → tudo OK');
const recRuim = reconciliarContrato({ hashRecalculadoConfere: false, versaoCongelada: true, divergenciasSnapshot: 2, versaoTemOrigemTemplate: false, assinaturasDaVersaoCongelada: 2, assinaturasConcluidas: 1, arquivosDoContrato: 0, eventosTimeline: 0, aditivosSemDocumento: 1 });
check('E', recRuim.find((r) => r.item === 'Hash do documento')?.resultado === 'divergencia', 'hash não confere → DIVERGÊNCIA');
check('E', recRuim.find((r) => r.item === 'Origem do documento (template)')?.resultado === 'incompleto' && recRuim.find((r) => r.item === 'Origem do documento (template)')!.detalhe.includes('órfão'), 'versão sem template → registro órfão sinalizado (nunca apagado)');
const recMd = montarRelatorioReconciliacao('Contrato TESTE', recRuim, '18/08/2026');
check('E', recMd.includes('DIVERGÊNCIA') && recMd.includes('Nada é corrigido automaticamente'), 'relatório de reconciliação exportável com aviso de não-correção');

// ===== F. Distribuição + relatório de governança =====
const dist = distribuirVersoesUsadas([1, 1, 1, 2, 2, 3, null]);
check('F', dist.find((d) => d.versao === 1)?.contratos === 3 && dist.find((d) => d.versao === null)?.contratos === 1, 'distribuição de versões (Módulo 21): 3 usam v1, 1 sem versão informada');
const rel = montarRelatorioGovernanca({
  geradoEm: '18/08/2026', totais: { contratos: 10, vigentes: 7, vencendo30: 2, vencidos: 1 }, assinaturasPendentes: 3,
  segurosVencendo: 2, segurosVencidos: 1, divergencias: [{ contrato: 'PC-0001', divergencias: mudou }], pendenciasFila: [{ rotulo: 'Seguro vencido', detalhe: 'x' }],
  rescisoesEmAndamento: 1, renovacoesProximas: 2, aditivosTotal: 5,
  masters: [{ nome: 'Master', versaoAtual: 4, status: 'publicado', distribuicao: dist, revisaoAprovada: false }], orfaos: [{ tipo: 'Versão sem template', quantidade: 1 }],
});
for (const secao of ['Resumo', 'Divergências contratuais', 'Governança do Master', 'órfãos', 'revisão jurídica PENDENTE', 'não é\nparecer jurídico']) {
  check('F', rel.includes(secao), `relatório de governança contém "${secao.replace('\n', ' ')}"`);
}

// ===== G. Próxima ação + dossiê executivo =====
const resumoDiv = montarResumoExecutivo({ statusContrato: 'ativo', diasParaFim: 100, statusVersaoAtual: 'vigente', assinaturaMotorista: 'assinado', assinaturaPrimecharge: 'assinado', assinaturaExpiraEmDias: null, seguroCadastrado: true, seguroVenceEmDias: 200, pendencias: 0, rescisaoStatus: null, ultimaAtividade: null, divergencias: 2 });
check('G', resumoDiv.proximaAcao.includes('divergência'), 'próxima ação prioriza divergência (motor EXISTENTE estendido, não duplicado)');
const resumoRej = montarResumoExecutivo({ statusContrato: 'ativo', diasParaFim: -3, statusVersaoAtual: 'vigente', assinaturaMotorista: 'assinado', assinaturaPrimecharge: 'assinado', assinaturaExpiraEmDias: null, seguroCadastrado: true, seguroVenceEmDias: 200, pendencias: 0, rescisaoStatus: null, ultimaAtividade: null, documentoObrigatorioRejeitado: true });
check('G', resumoRej.proximaAcao.includes('REJEITADO'), 'documento rejeitado tem prioridade máxima na próxima ação');

check('G', PASTAS_DOSSIE.length === 22 && PASTAS_DOSSIE[3] === '03_Master' && PASTAS_DOSSIE[21] === '21_Arquivos_Originais', 'dossiê executivo: 22 pastas (00_Capa … 21_Arquivos_Originais)');
const DADOS: DadosDossie = {
  contratoId: 'x', numeroContrato: 'PC-1', motoristaNome: 'João', veiculoPlaca: 'ABC1D23', empresaNome: 'PrimeCharge', statusContrato: 'ativo', dataInicio: '2026-01-01', valorPeriodico: 'R$ 1.400,00', geradoEm: '2026-08-18',
  versoes: [], aditivos: [], assinaturas: [], vistorias: [], seguros: [], sinistros: [], multas: [], documentosMotorista: [], timeline: [], auditoria: [], anexos: [],
  master: { nome: 'Master', versaoUsada: 2, versaoAtualTemplate: 4 }, financeiro: { receitasConfirmadas: 100, receitasPendentes: 50, receitasVencidas: 0 },
  tarefas: [{ titulo: 'Renovar seguro', status: 'pendente', prazo: '2026-09-01' }], decisoesJuridicas: [{ chave: 'minuta_pendencia_1', resumo: 'resolvida' }],
  historicoTemplate: [{ data: '2026-08-10', origem: 'retorno_advogado', responsavel: 'Dra. X', hash: 'abc' }], divergencias: [{ rotulo: 'Valor', valorContrato: 'R$ 1.400,00', valorAtual: 'R$ 1.500,00' }],
};
const arqs = montarArquivosDossie(DADOS);
const pastasGeradas = new Set(arqs.map((a) => a.pasta));
check('G', PASTAS_DOSSIE.filter((p) => p !== '02_Versoes').every((p) => pastasGeradas.has(p)) , 'dossiê gera conteúdo para todas as pastas executivas (02_Versoes vazio quando não há versão — nada inventado)');
check('G', String(arqs.find((a) => a.pasta === '03_Master')!.conteudo).includes('NUNCA altera este contrato'), '03_Master registra que republicar não altera o contrato');
const semExtras = montarArquivosDossie({ ...DADOS, master: null, financeiro: null, tarefas: [], decisoesJuridicas: [], historicoTemplate: [], divergencias: [] });
check('G', String(semExtras.find((a) => a.pasta === '12_Financeiro')!.conteudo).includes('não incluído'), 'dado ausente no dossiê = "não incluído nesta exportação" (nunca 0/R$ 0 falso)');

// ===== H. Honestidade + performance + zero migration =====
const fontes = ['src/features/contracts/juridico/governanca.ts', 'src/features/contracts/juridico/components/GovernancaContratoPanel.tsx', 'src/features/contracts/juridico/components/GovernancaDashboardSections.tsx', 'docs/juridico/GOVERNANCA-CONTRATUAL.md'];
// A frase proibida só pode aparecer NEGADA (ex.: 'nunca "juridicamente seguro"') — afirmação é falha.
const linhaNega = (l: string) => /nunca|não usa|proibid|jamais|NÃO/i.test(l);
for (const proibido of ['juridicamente seguro', 'contrato perfeito', 'proteção jurídica garantida', '100% protegido', 'aprovado pelo sistema']) {
  const afirmacoes = fontes.flatMap((f) =>
    fs
      .readFileSync(path.join(RAIZ, f), 'utf8')
      .split('\n')
      .filter((l) => l.toLowerCase().includes(proibido.toLowerCase()) && !linhaNega(l)),
  );
  check('H', afirmacoes.length === 0, `vocabulário proibido nunca AFIRMADO: "${proibido}"`);
}
const routerSrc = fs.readFileSync(path.join(RAIZ, 'src/app/router/router.tsx'), 'utf8');
check('H', /JuridicoDashboardPage = named\(\(\) => import/.test(routerSrc) && /JuridicoContratoDetailPage = named\(\(\) => import/.test(routerSrc), 'páginas jurídicas continuam LAZY (motorista não paga o custo — Módulo 28)');
const motoristaApp = fs.readdirSync(path.join(RAIZ, 'src/features/motorista-app'), { recursive: true }) as string[];
const importaGov = motoristaApp.filter((f) => String(f).endsWith('.ts') || String(f).endsWith('.tsx')).some((f) => fs.readFileSync(path.join(RAIZ, 'src/features/motorista-app', String(f)), 'utf8').match(/from '.*juridico\/(governanca|comparador|dossie|qa)/));
check('H', !importaGov, 'App do Motorista NÃO importa motores de governança/comparador/dossiê (Módulo 28)');
// A Fase 8 não criou migration. Migrations >46 posteriores (ex.: 0047 da Minha Meta do
// motorista) são de OUTRAS features — o assert vira: nenhuma delas toca o schema jurídico.
const migrations = fs.readdirSync(path.join(RAIZ, 'supabase/migrations')).filter((f) => Number(f.slice(0, 4)) > 46);
const tocaJuridico = migrations.some((f) =>
  /contrato_template|contrato_versoes|contrato_assinaturas|juridico_/.test(fs.readFileSync(path.join(RAIZ, 'supabase/migrations', f), 'utf8')));
check('H', !tocaJuridico, 'ZERO migration da Fase 8 (schema jurídico congelado na 0046; posteriores não tocam jurídico — Módulo 31)');

console.log(`\n${passes} PASS, ${fails} FALHOU`);
if (fails > 0) process.exit(1);
