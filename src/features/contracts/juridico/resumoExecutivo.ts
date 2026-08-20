// RESUMO EXECUTIVO do contrato (Fase C) — motor PURO que consolida o status operacional e a
// PRÓXIMA AÇÃO objetiva. Regra explícita da missão: isto é status OPERACIONAL — nunca chamar de
// "segurança jurídica". A próxima ação segue prioridade objetiva (Fase F), sem juízo subjetivo.
import type { ContratoVersaoStatus, ContratoAssinaturaStatus } from './types';

export type InsumosResumo = {
  statusContrato: string;
  diasParaFim: number | null; // negativo = vencido; null = indeterminado
  statusVersaoAtual: ContratoVersaoStatus | null; // null = sem documento
  assinaturaMotorista: ContratoAssinaturaStatus | null;
  assinaturaPrimecharge: ContratoAssinaturaStatus | null;
  assinaturaExpiraEmDias: number | null;
  seguroCadastrado: boolean;
  seguroVenceEmDias: number | null; // negativo = vencido
  pendencias: number; // contagem objetiva (fila/risco)
  rescisaoStatus: string | null; // status da rescisão ativa, se houver
  ultimaAtividade: string | null; // ISO do evento mais recente
  /** Fase 8 (Módulo 14) — insumos opcionais de governança */
  divergencias?: number; // snapshot × cadastro
  documentoObrigatorioRejeitado?: boolean;
};

export type ResumoExecutivo = {
  situacaoAssinatura: 'concluida' | 'pendente' | 'recusada' | 'expirando' | 'nao_iniciada';
  situacaoSeguro: 'vigente' | 'vencendo' | 'vencido' | 'ausente';
  proximaAcao: string;
  prazoTexto: string;
};

const ASSINADO: ContratoAssinaturaStatus[] = ['assinado', 'aceito'];

export function montarResumoExecutivo(i: InsumosResumo): ResumoExecutivo {
  // Assinatura consolidada (as duas partes)
  let situacaoAssinatura: ResumoExecutivo['situacaoAssinatura'] = 'nao_iniciada';
  if (i.assinaturaMotorista || i.assinaturaPrimecharge) {
    const motoristaOk = i.assinaturaMotorista != null && ASSINADO.includes(i.assinaturaMotorista);
    const primechargeOk = i.assinaturaPrimecharge != null && ASSINADO.includes(i.assinaturaPrimecharge);
    if (motoristaOk && primechargeOk) situacaoAssinatura = 'concluida';
    else if (i.assinaturaMotorista === 'recusado') situacaoAssinatura = 'recusada';
    else if (i.assinaturaExpiraEmDias != null && i.assinaturaExpiraEmDias <= 7) situacaoAssinatura = 'expirando';
    else situacaoAssinatura = 'pendente';
  }

  // Seguro
  let situacaoSeguro: ResumoExecutivo['situacaoSeguro'] = 'ausente';
  if (i.seguroCadastrado) {
    if (i.seguroVenceEmDias == null) situacaoSeguro = 'vigente'; // sem data — trata como cadastrado
    else if (i.seguroVenceEmDias < 0) situacaoSeguro = 'vencido';
    else if (i.seguroVenceEmDias <= 30) situacaoSeguro = 'vencendo';
    else situacaoSeguro = 'vigente';
  }

  // Próxima ação — ordem OBJETIVA (Fase F): vencido > rescisão em curso > assinatura recusada >
  // assinatura expirando > seguro vencido > documento parado no fluxo > seguro vencendo >
  // renovação próxima > nada.
  let proximaAcao = 'Nenhuma ação imediata — acompanhar.';
  if (i.documentoObrigatorioRejeitado) {
    proximaAcao = 'Documento obrigatório REJEITADO: solicitar novo envio ao motorista.';
  } else if (i.diasParaFim != null && i.diasParaFim < 0 && i.statusContrato === 'ativo') {
    proximaAcao = `Contrato vencido há ${Math.abs(i.diasParaFim)} dia(s): renovar, aditar ou iniciar rescisão.`;
  } else if (i.rescisaoStatus && !['encerrada', 'cancelada'].includes(i.rescisaoStatus)) {
    proximaAcao = `Rescisão em andamento (${i.rescisaoStatus}): avançar o workflow.`;
  } else if (situacaoAssinatura === 'recusada') {
    proximaAcao = 'Assinatura recusada: revisar o motivo e gerar nova versão ou cancelar.';
  } else if (situacaoAssinatura === 'expirando') {
    proximaAcao = `Convite de assinatura expira em ${i.assinaturaExpiraEmDias} dia(s): reenviar ou cobrar o motorista.`;
  } else if (situacaoSeguro === 'vencido') {
    proximaAcao = 'Seguro vencido: renovar a apólice e atualizar o cadastro.';
  } else if (i.statusVersaoAtual === 'rascunho') {
    proximaAcao = 'Documento em rascunho: enviar para revisão.';
  } else if (i.statusVersaoAtual === 'em_revisao') {
    proximaAcao = 'Documento em revisão: aprovar ou devolver.';
  } else if (i.statusVersaoAtual === 'aprovada') {
    proximaAcao = 'Documento aprovado: enviar para assinatura (congela a versão).';
  } else if (i.statusVersaoAtual === 'aguardando_assinatura' && situacaoAssinatura === 'nao_iniciada') {
    proximaAcao = 'Preparar e enviar as assinaturas (motorista + PrimeCharge).';
  } else if (i.statusVersaoAtual === 'aguardando_assinatura' && situacaoAssinatura === 'pendente') {
    proximaAcao = 'Aguardando assinatura: acompanhar o motorista.';
  } else if (i.statusVersaoAtual === 'assinada') {
    proximaAcao = 'Documento assinado: tornar vigente.';
  } else if (i.statusVersaoAtual === null) {
    proximaAcao = 'Sem documento: gerar a primeira versão.';
  } else if (situacaoSeguro === 'vencendo') {
    proximaAcao = `Seguro vence em ${i.seguroVenceEmDias} dia(s): programar renovação da apólice.`;
  } else if (situacaoSeguro === 'ausente' && i.statusContrato === 'ativo') {
    proximaAcao = 'Cadastrar o seguro do contrato.';
  } else if ((i.divergencias ?? 0) > 0) {
    proximaAcao = `${i.divergencias} divergência(s) entre contrato e cadastro: revisar (nova versão, aditivo ou ignorar com justificativa).`;
  } else if (i.diasParaFim != null && i.diasParaFim <= 30 && i.statusContrato === 'ativo') {
    proximaAcao = `Renovação em ${i.diasParaFim} dia(s): decidir renovar, aditar ou encerrar.`;
  }

  const prazoTexto =
    i.diasParaFim == null
      ? 'Prazo indeterminado'
      : i.diasParaFim < 0
        ? `Vencido há ${Math.abs(i.diasParaFim)} dia(s)`
        : `${i.diasParaFim} dia(s) restantes`;

  return { situacaoAssinatura, situacaoSeguro, proximaAcao, prazoTexto };
}
