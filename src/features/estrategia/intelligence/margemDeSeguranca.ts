import { SEMANAS_POR_MES } from './simulacaoEmpresarial';
import type { MesSimulado } from './simulacaoEmpresarial';
import type { CenarioSimulacaoInput } from '../types';

// Épico 3 — Central de Decisão Empresarial, "Margem de Segurança da Operação" (2026-08-10,
// missão do Carlos: "transformar a Central de Decisão num copiloto financeiro" — cards devem
// concluir, não só mostrar número). Este módulo NÃO adiciona nenhuma variável nova ao cenário —
// é só a mesma matemática do motor principal (`simulacaoEmpresarial.ts`), resolvida ao contrário:
// em vez de "dado ocupação/aluguel, qual o lucro", pergunta "qual o menor ocupação/aluguel que
// ainda dá lucro zero".
//
// 2026-08-13 (Fase 4.3) — removida a classificação "seguro/atenção/risco" (nivel/motivo) que
// vivia aqui: pedido explícito do Carlos foi tirar TODA classificação subjetiva da Central de
// Decisão, tanto o selo do card quanto o "Nível de risco" do Card 1 (esse já tinha saído antes).
// O que ficou é só a matemática objetiva (break-even, margem em %, dias parado) — cada linha do
// card mostra o número e o próprio usuário decide o que aquilo significa pra ele.

export type MargemDeSeguranca = {
  frotaAtual: number;
  ocupacaoAtualPct: number;
  /** null quando frota=0 — não dá pra calcular break-even de uma frota que ainda não existe. */
  ocupacaoMinimaPct: number | null;
  margemOcupacaoPct: number | null;
  aluguelSemanalAtual: number;
  aluguelSemanalMinimo: number | null;
  /** Quantos dias por mês (de 30) o carro pode ficar parado sem que a operação dê prejuízo. 0 quando nem rodando 100% do tempo cobre as contas. */
  diasParadoMaximo: number | null;
  /** Quanto o aluguel pode cair (%) antes da operação ficar negativa — mesma folga de margemOcupacaoPct, só que em termos de preço em vez de tempo rodado. */
  margemFinanceiraPct: number | null;
  receitaAtual: number;
  receitaMinima: number;
  /** Fase 4.2 (2026-08-13) — movido de MargemDeSegurancaCard.tsx, que calculava isso na hora:
   * (receitaAtual − receitaMinima) ÷ receitaMinima × 100. Mesma fórmula de margemOcupacaoPct e
   * margemFinanceiraPct acima, só que em cima da receita em vez de ocupação/aluguel. null quando
   * receitaMinima <= 0 (break-even indefinido — sem despesa não há "mínimo" pra comparar). */
  margemReceitaPct: number | null;
  caixaAtual: number;
  reservaMinima: number;
  /** Fase 4.2 (2026-08-13) — movido de MargemDeSegurancaCard.tsx: (caixaAtual − reservaMinima) ÷
   * reservaMinima × 100. null quando reservaMinima <= 0 (sem reserva configurada, não há "mínimo"
   * pra comparar). */
  margemCaixaPct: number | null;
  lucroAtual: number;
  lucroMinimo: number;
};

export type Runway = {
  precisaAporte: boolean;
  mesDoAporte: number | null;
  diasAteAporte: number | null;
  /** Mês em que o caixa fura a RESERVA (aviso mais cedo, mais brando que precisar de aporte de verdade — que é caixa < 0). null se nunca fura dentro do horizonte simulado. */
  mesAbaixoDaReserva: number | null;
  mensagem: string;
};

const DIAS_POR_MES = 30;

export function calcularMargemDeSeguranca(cenario: CenarioSimulacaoInput, mesAtual: MesSimulado): MargemDeSeguranca {
  const frota = mesAtual.frota;
  const ocupacaoAtualPct = cenario.ocupacao_esperada_pct;
  const inadimplencia = cenario.inadimplencia_esperada_pct / 100;
  const aluguelMensalPorVeiculo = cenario.aluguel_esperado_semanal_por_veiculo * SEMANAS_POR_MES;
  const receitaMinima = mesAtual.despesaMensal; // break-even: receita = despesa, por definição

  let ocupacaoMinimaPct: number | null = null;
  let margemOcupacaoPct: number | null = null;
  let aluguelSemanalMinimo: number | null = null;
  let diasParadoMaximo: number | null = null;
  let margemFinanceiraPct: number | null = null;

  if (frota > 0 && aluguelMensalPorVeiculo > 0 && inadimplencia < 1) {
    // Ocupação mínima: quanto da capacidade da frota precisa estar alugada pra cobrir a despesa
    // do mês (incluindo parcela, seguro, contador etc.) — pode passar de 100% (aluguel/frota
    // configurados não cobrem as contas nem com o carro rodando o mês inteiro).
    ocupacaoMinimaPct = (mesAtual.despesaMensal / (frota * aluguelMensalPorVeiculo * (1 - inadimplencia))) * 100;
    margemOcupacaoPct = ocupacaoAtualPct - ocupacaoMinimaPct;
    diasParadoMaximo = Math.max(0, Math.round(DIAS_POR_MES * (1 - ocupacaoMinimaPct / 100)));

    if (ocupacaoAtualPct > 0) {
      // Aluguel semanal mínimo: mesma conta, isolando o aluguel em vez da ocupação (mantém a
      // ocupação configurada fixa).
      const aluguelMensalMinimo = mesAtual.despesaMensal / (frota * (ocupacaoAtualPct / 100) * (1 - inadimplencia));
      aluguelSemanalMinimo = aluguelMensalMinimo / SEMANAS_POR_MES;
      margemFinanceiraPct = ((cenario.aluguel_esperado_semanal_por_veiculo - aluguelSemanalMinimo) / cenario.aluguel_esperado_semanal_por_veiculo) * 100;
    }
  }

  // Fase 4.2 (2026-08-13) — movidos de MargemDeSegurancaCard.tsx (mesma fórmula que já era usada
  // lá, só centralizada aqui, ao lado de margemOcupacaoPct/margemFinanceiraPct que já viviam no
  // motor).
  const caixaAtual = mesAtual.caixaDisponivel;
  const reservaMinima = cenario.reserva_de_seguranca;
  const margemReceitaPct = receitaMinima > 0 ? ((mesAtual.receitaMensal - receitaMinima) / receitaMinima) * 100 : null;
  const margemCaixaPct = reservaMinima > 0 ? ((caixaAtual - reservaMinima) / reservaMinima) * 100 : null;

  return {
    frotaAtual: frota,
    ocupacaoAtualPct,
    ocupacaoMinimaPct,
    margemOcupacaoPct,
    aluguelSemanalAtual: cenario.aluguel_esperado_semanal_por_veiculo,
    aluguelSemanalMinimo,
    diasParadoMaximo,
    margemFinanceiraPct,
    receitaAtual: mesAtual.receitaMensal,
    receitaMinima,
    margemReceitaPct,
    caixaAtual,
    reservaMinima,
    margemCaixaPct,
    lucroAtual: mesAtual.lucroMensal,
    lucroMinimo: 0,
  };
}

// Runway — "mantidas as condições atuais, em quantos dias/meses será necessário novo aporte"
// (pedido do Carlos). Varre os meses JÁ SIMULADOS pelo motor principal (nenhum cálculo novo de
// projeção, só uma busca no array que já existe) — precisa que a correção do motor
// (prejuízo sempre descontar do caixa, ver simulacaoEmpresarial.ts) já esteja aplicada, senão
// esse número mentiria com "Reinvestir lucro = Não".
export function calcularRunway(meses: MesSimulado[], reservaMinima: number): Runway {
  const mesesOperacionais = meses.filter((m) => m.mes > 0);

  const primeiroNegativo = mesesOperacionais.find((m) => m.caixaDisponivel < 0);
  const primeiroAbaixoDaReserva = mesesOperacionais.find((m) => m.caixaDisponivel < reservaMinima);

  if (!primeiroNegativo) {
    return {
      precisaAporte: false,
      mesDoAporte: null,
      diasAteAporte: null,
      mesAbaixoDaReserva: null,
      mensagem: 'Nenhum aporte previsto no horizonte simulado.',
    };
  }

  return {
    precisaAporte: true,
    mesDoAporte: primeiroNegativo.mes,
    diasAteAporte: primeiroNegativo.mes * DIAS_POR_MES,
    mesAbaixoDaReserva: primeiroAbaixoDaReserva?.mes ?? null,
    mensagem: `Mantidas as condições atuais, o caixa fica negativo no mês ${primeiroNegativo.mes} — em torno de ${primeiroNegativo.mes * DIAS_POR_MES} dias a partir de hoje.`,
  };
}

