import { useMemo } from 'react';
import { useMotoristas } from '@/features/motoristas/hooks/useMotoristas';
import { useContratos } from '@/features/contracts/hooks/useContratos';
import { useVeiculos } from '@/features/frota/hooks/useVeiculos';
import { usePagamentosPendentesPorEmpresa } from '@/features/financeiro/hooks/usePagamentos';
import { useLancamentosPorEmpresa } from '@/features/financeiro/hooks/useLancamentos';
import { useArquivosComValidadePorEntidadeTipo } from '@/shared/capabilities/hooks/useArquivos';
import { useChecklistsAbertosPorEmpresa } from '@/features/operacoes/hooks/useChecklists';
import { useManutencoesAgendadasPorEmpresa } from '@/features/operacoes/hooks/useManutencoes';
import { useMultasPorEmpresa } from '@/features/operacoes/hooks/useMultas';
import { gerarAcoesCnhVencendo } from '@/features/operacoes/intelligence/geradores/motoristaGeradores';
import { gerarAcoesContratoVencendo } from '@/features/operacoes/intelligence/geradores/contratoGeradores';
import { gerarAcoesPagamentoAtrasado, gerarAcoesParcelaAVencer } from '@/features/operacoes/intelligence/geradores/financeiroGeradores';
import { gerarAcoesManutencaoAgendadaVencendo } from '@/features/operacoes/intelligence/geradores/manutencaoGeradores';
import { gerarAcoesDocumentoVencendo } from '@/features/operacoes/intelligence/geradores/documentoGeradores';
import { gerarAcoesMultaVencendo } from '@/features/operacoes/intelligence/geradores/multaGeradores';
import type { AcaoCandidata, Checklist } from '@/features/operacoes/types';
import { diasAte, diasDesde } from '@/shared/lib/format';

export type PrioridadeFila = 'critica' | 'alta' | 'media' | null;

export type FilaDeTrabalho = {
  chave: string;
  titulo: string;
  quantidade: number;
  prioridade: PrioridadeFila;
  /** Dias do item mais atrasado/mais parado da fila — negativo nunca aparece aqui (já é `Math.min`/`Math.max` só do que importa exibir). null = sem dado de dia aplicável. */
  diasPior: number | null;
  /** Impacto em R$, só quando a fila tem uma entidade com `valor` real por trás (Multas, Cobranças, Financeiro) — nunca estimado/inventado (ver DEC de recusa a inventar fórmula de Inadimplência, mesmo raciocínio). */
  impactoFinanceiro: number | null;
  href: string;
};

// Achado da auditoria do Épico 1 (Operação Perfeita): as 12 filas do Centro de Operações NÃO
// leem a tabela `acoes_operacionais` — leem os MESMOS geradores puros que a alimentam
// (montarCandidatas/sincronizarAcoes.ts), só que direto sobre o dado ao vivo. Motivo: a
// tabela só é atualizada quando alguém clica "Atualizar ações" em /operacoes/acoes (sem
// pg_cron, por decisão — DEC-055) — usá-la aqui faria a "tela que um operador olha o dia
// inteiro" mostrar contagem desatualizada até alguém lembrar de sincronizar manualmente. Os
// geradores já são funções puras reutilizáveis (motoristaGeradores.ts, contratoGeradores.ts
// etc.) — chamar eles direto aqui não duplica lógica nenhuma, só troca a fonte (client-side,
// sempre fresca) por outra (tabela, precisa de sync manual). `acoes_operacionais` continua
// existindo e sendo útil pra outra coisa: atribuir responsável e rastrear status de
// atendimento por item — isso este hook não faz, e não deveria.
function diasMaisUrgente(candidatas: AcaoCandidata[]): number | null {
  const dias = candidatas.map((c) => diasAte(c.prazo)).filter((d): d is number => d !== null);
  return dias.length === 0 ? null : Math.min(...dias);
}

function prioridadeDeCandidatas(candidatas: AcaoCandidata[]): PrioridadeFila {
  if (candidatas.length === 0) return null;
  if (candidatas.some((c) => c.prioridade === 'critica')) return 'critica';
  if (candidatas.some((c) => c.prioridade === 'alta')) return 'alta';
  return 'media';
}

// Checklist não tem prazo (ver checklistGeradores.ts) — sinal de urgência é "há quantos dias
// está aberto", mesmos limiares (3/7/10 dias) do gerador `checklist_pendente`, aplicados aqui
// a TODOS os checklists abertos do balde (não só aos que já passaram de 3 dias, que é o que
// vira Ação) — a fila do Centro de Operações é "o que está aberto", a Ação é "o que já
// deveria ter alguém preocupado".
function diasAbertoPior(checklists: Checklist[]): number | null {
  const dias = checklists.map((c) => diasDesde(c.criado_em)).filter((d): d is number => d !== null);
  return dias.length === 0 ? null : Math.max(...dias);
}

function prioridadeDeChecklists(checklists: Checklist[]): PrioridadeFila {
  if (checklists.length === 0) return null;
  const pior = diasAbertoPior(checklists) ?? 0;
  if (pior >= 10) return 'critica';
  if (pior >= 7) return 'alta';
  return 'media';
}

// Mesma janela de dias que os respectivos geradores usam (multaGeradores.ts JANELA_DIAS=15,
// financeiroGeradores.ts JANELA_DIAS_A_VENCER=5) — duplicada aqui como constante porque
// AcaoCandidata não carrega `valor` (Multa.valor/Pagamento.valor), então o impacto financeiro
// não dá pra somar em cima do resultado do gerador, só em cima do dado de origem com o mesmo
// filtro de janela. É duplicação de um número, não de regra de negócio.
const JANELA_MULTA_DIAS = 15;
const JANELA_COBRANCA_A_VENCER_DIAS = 5;

export function useFilasDeTrabalho() {
  const { data: motoristas } = useMotoristas();
  const { data: contratos } = useContratos();
  const { data: veiculos } = useVeiculos();
  const { data: pagamentosPendentes } = usePagamentosPendentesPorEmpresa();
  const { data: lancamentos } = useLancamentosPorEmpresa();
  const { data: checklistsAbertos } = useChecklistsAbertosPorEmpresa();
  const { data: manutencoesAgendadas } = useManutencoesAgendadasPorEmpresa();
  const { data: multas } = useMultasPorEmpresa();
  const { data: arquivosVeiculo } = useArquivosComValidadePorEntidadeTipo('veiculo');
  const { data: arquivosMotorista } = useArquivosComValidadePorEntidadeTipo('motorista');
  const { data: arquivosContrato } = useArquivosComValidadePorEntidadeTipo('contrato');

  const isLoading =
    !motoristas ||
    !contratos ||
    !veiculos ||
    !pagamentosPendentes ||
    !lancamentos ||
    !checklistsAbertos ||
    !manutencoesAgendadas ||
    !multas ||
    !arquivosVeiculo ||
    !arquivosMotorista ||
    !arquivosContrato;

  return useMemo((): { isLoading: true } | { isLoading: false; filas: FilaDeTrabalho[] } => {
    if (isLoading) return { isLoading: true };

    const arquivosComValidade = [...arquivosVeiculo, ...arquivosMotorista, ...arquivosContrato];

    const checklistsEntrega = checklistsAbertos.filter((c) => c.titulo.toLowerCase().includes('entrega'));
    const checklistsDevolucao = checklistsAbertos.filter((c) => c.titulo.toLowerCase().includes('devolu'));
    const checklistsGenericos = checklistsAbertos.filter(
      (c) => !c.titulo.toLowerCase().includes('entrega') && !c.titulo.toLowerCase().includes('devolu')
    );

    const manutencoesCandidatas = gerarAcoesManutencaoAgendadaVencendo(manutencoesAgendadas);
    const documentosCandidatas = gerarAcoesDocumentoVencendo(arquivosComValidade);
    const multasCandidatas = gerarAcoesMultaVencendo(multas);
    const cobrancasCandidatas = [
      ...gerarAcoesPagamentoAtrasado(pagamentosPendentes),
      ...gerarAcoesParcelaAVencer(pagamentosPendentes),
    ];
    const renovacoesCandidatas = [...gerarAcoesContratoVencendo(contratos), ...gerarAcoesCnhVencendo(motoristas)];

    const lancamentosPrevistos = lancamentos.filter((l) => l.status === 'prevista');
    const veiculosParados = veiculos.filter((v) => v.status === 'disponivel');
    const motoristasBloqueados = motoristas.filter((m) => m.status === 'bloqueado');

    const impactoCobrancas = pagamentosPendentes
      .filter((p) => {
        const dias = diasAte(p.data_prevista);
        return dias !== null && dias <= JANELA_COBRANCA_A_VENCER_DIAS;
      })
      .reduce((soma, p) => soma + p.valor, 0);

    const impactoMultas = multas
      .filter((m) => {
        if (m.status !== 'pendente') return false;
        const dias = diasAte(m.data_vencimento);
        return dias !== null && dias <= JANELA_MULTA_DIAS;
      })
      .reduce((soma, m) => soma + (m.valor ?? 0), 0);

    const impactoFinanceiro = lancamentosPrevistos.reduce((soma, l) => soma + l.valor, 0);

    const filas: FilaDeTrabalho[] = [
      {
        chave: 'entregas',
        titulo: 'Entregas',
        quantidade: checklistsEntrega.length,
        prioridade: prioridadeDeChecklists(checklistsEntrega),
        diasPior: diasAbertoPior(checklistsEntrega),
        impactoFinanceiro: null,
        href: '/operacoes/acoes?tipo=checklist_pendente',
      },
      {
        chave: 'devolucoes',
        titulo: 'Devoluções',
        quantidade: checklistsDevolucao.length,
        prioridade: prioridadeDeChecklists(checklistsDevolucao),
        diasPior: diasAbertoPior(checklistsDevolucao),
        impactoFinanceiro: null,
        href: '/operacoes/acoes?tipo=checklist_pendente',
      },
      {
        chave: 'manutencoes',
        titulo: 'Manutenções',
        quantidade: manutencoesCandidatas.length,
        prioridade: prioridadeDeCandidatas(manutencoesCandidatas),
        diasPior: diasMaisUrgente(manutencoesCandidatas),
        impactoFinanceiro: null,
        href: '/operacoes/acoes?tipo=manutencao_agendada',
      },
      {
        chave: 'multas',
        titulo: 'Multas',
        quantidade: multasCandidatas.length,
        prioridade: prioridadeDeCandidatas(multasCandidatas),
        diasPior: diasMaisUrgente(multasCandidatas),
        impactoFinanceiro: impactoMultas || null,
        href: '/operacoes/acoes?tipo=multa_vencendo',
      },
      {
        chave: 'documentos',
        titulo: 'Documentos',
        quantidade: documentosCandidatas.length,
        prioridade: prioridadeDeCandidatas(documentosCandidatas),
        diasPior: diasMaisUrgente(documentosCandidatas),
        impactoFinanceiro: null,
        href: '/operacoes/acoes?tipo=documento_vencendo',
      },
      {
        chave: 'financeiro',
        titulo: 'Financeiro',
        quantidade: lancamentosPrevistos.length,
        prioridade: lancamentosPrevistos.length > 0 ? 'media' : null,
        diasPior: null,
        impactoFinanceiro: impactoFinanceiro || null,
        href: '/financeiro/lancamentos?status=prevista',
      },
      {
        chave: 'cobrancas',
        titulo: 'Cobranças',
        quantidade: cobrancasCandidatas.length,
        prioridade: prioridadeDeCandidatas(cobrancasCandidatas),
        diasPior: diasMaisUrgente(cobrancasCandidatas),
        impactoFinanceiro: impactoCobrancas || null,
        href: '/financeiro/pagamentos?status=pendente',
      },
      {
        chave: 'renovacoes',
        titulo: 'Renovações',
        quantidade: renovacoesCandidatas.length,
        prioridade: prioridadeDeCandidatas(renovacoesCandidatas),
        diasPior: diasMaisUrgente(renovacoesCandidatas),
        impactoFinanceiro: null,
        href: '/operacoes/acoes?tipo=renovacao_contrato',
      },
      {
        chave: 'veiculos-parados',
        titulo: 'Veículos parados',
        quantidade: veiculosParados.length,
        prioridade: veiculosParados.length > 0 ? 'media' : null,
        // Aproximado — `atualizado_em` é "última mudança em qualquer campo", não
        // "há quanto tempo está neste status" (não existe tracking de transição de status
        // hoje). Melhor sinal disponível sem inventar dado novo; rotulado como aproximação na
        // UI (ver QueueCard).
        diasPior: veiculosParados.length > 0 ? Math.max(...veiculosParados.map((v) => diasDesde(v.atualizado_em) ?? 0)) : null,
        impactoFinanceiro: null,
        href: '/veiculos?status=disponivel',
      },
      {
        chave: 'motoristas-bloqueados',
        titulo: 'Motoristas bloqueados',
        quantidade: motoristasBloqueados.length,
        prioridade: motoristasBloqueados.length > 0 ? 'alta' : null,
        diasPior:
          motoristasBloqueados.length > 0
            ? Math.max(...motoristasBloqueados.map((m) => diasDesde(m.atualizado_em) ?? 0))
            : null,
        impactoFinanceiro: null,
        href: '/motoristas?status=bloqueado',
      },
      {
        chave: 'checklists',
        titulo: 'Checklists',
        quantidade: checklistsGenericos.length,
        prioridade: prioridadeDeChecklists(checklistsGenericos),
        diasPior: diasAbertoPior(checklistsGenericos),
        impactoFinanceiro: null,
        href: '/operacoes/acoes?tipo=checklist_pendente',
      },
      {
        chave: 'alertas',
        titulo: 'Alertas',
        // Preenchido por quem consome o hook (CentroDeOperacoesPage já busca alertas via
        // useCommandCenter — evita este hook duplicar os 3 coletores de inteligência só pra
        // contar alerta). Placeholder aqui, sobrescrito na página.
        quantidade: 0,
        prioridade: null,
        diasPior: null,
        impactoFinanceiro: null,
        href: '#alertas-secao',
      },
    ];

    return { isLoading: false, filas };
  }, [
    isLoading,
    motoristas,
    contratos,
    veiculos,
    pagamentosPendentes,
    lancamentos,
    checklistsAbertos,
    manutencoesAgendadas,
    multas,
    arquivosVeiculo,
    arquivosMotorista,
    arquivosContrato,
  ]);
}
