import { useEffect, useRef } from 'react';
import { Secao, Linha, Pill, SkeletonPortal, ErroPortal } from '../ui';
import { ChecklistHojeCard } from './ChecklistHojeCard';
import { RotinaDoDiaCard } from './RotinaDoDiaCard';
import { CopilotoCard } from './CopilotoCard';
import { CopilotoInteligenteCard } from './CopilotoInteligenteCard';
import { AssistenteContextualCard } from './AssistenteContextualCard';
import { HistoricoCorridasCard, PadraoHorarioDiaCard, QualidadeBaseCopilotoCard } from './CopilotoHistoricoCard';
import { FechamentoCard } from './FechamentoCard';
import { HeroHoje } from './HeroHoje';
import { PlanoDeHoje } from './PlanoDeHoje';
import { MeuDiaCard } from './MeuDiaCard';
import { TresNumerosCard } from './TresNumerosCard';
import { RitmoMesCard } from './RitmoMesCard';
import { SemanaCard } from './SemanaCard';
import { CarroCard } from './CarroCard';
import { RecargasCard } from './RecargasCard';
import { InconsistenciasCard } from './InconsistenciasCard';
import { HistoricoOperacionalCard } from './HistoricoOperacionalCard';
import { OperacaoRealCard } from './OperacaoRealCard';
import { SimuladorESe } from './SimuladorESe';
import { CalendarioMeta } from './CalendarioMeta';
import { useMinhaMeta } from '../../hooks/useMinhaMeta';
import {
  checklistDoDia,
  formatBRL,
  saudeRegistroHoje,
  statusDoMes,
  STATUS_MES_LABEL,
} from '../../lib/metas';

// FASE 13 — CENTRO DE CONTROLE OPERACIONAL DO MOTORISTA
// Reorganiza os dados existentes em uma tela única que responde: "COMO ESTÁ MINHA OPERAÇÃO HOJE?"
// ZERO nova fonte de verdade. ZERO novo motor. Tudo vem de useMinhaMeta (Fases 8–12.2).

export function CentroControlePage() {
  const { carregando, erro, derivado, mGanho, mRecargaCriar, mRecargaRemover, mDespesaAtualizar, mCorridaRegistrar, mConfigCopiloto, recarregar } = useMinhaMeta();
  const topoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!carregando && topoRef.current) topoRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [carregando]);

  if (carregando) return <SkeletonPortal />;
  if (erro || !derivado) return <ErroPortal onRetry={recarregar} />;

  // Mesmo tratamento honesto da MinhaMetaPage: schema 0047/0048 ausente não é erro de conexão.
  if (derivado.indisponivel) {
    return (
      <Secao>
        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          Esta área ainda não foi liberada neste ambiente.
        </p>
        <p className="mt-1 text-[13px] text-neutral-500">
          As tabelas de operação do motorista ainda não existem no banco de dados. Sua conexão
          está normal e nenhum dado seu foi perdido.
        </p>
      </Secao>
    );
  }

  const d = derivado;
  const hojeIso = new Date().toISOString().slice(0, 10);
  const mesLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Checklist + saúde do dia (Módulos 3 e 5)
  const temRecargaHoje = d.recargas60.some((r) => r.data === hojeIso);
  const checklist = checklistDoDia(d.resumoHoje, temRecargaHoje, d.diaEncerrado);
  const saude = saudeRegistroHoje(checklist);

  // Status do mês (Módulo 8)
  const statusMes = statusDoMes(
    d.progresso.diasComLancamento,
    d.meta.diasTrabalho ?? 26,
    d.projecoes?.peloHistorico != null || d.projecoes?.pelaPremissa != null,
  );

  // Extras para semana (km e R$/h por data)
  const extrasSemana: Record<string, { km: number | null; rph: number | null }> = {};
  for (const g of d.ganhos60) {
    extrasSemana[g.data] = {
      km: g.km_fim != null && g.km_inicio != null ? Math.max(0, Math.round((g.km_fim - g.km_inicio) * 10) / 10) : null,
      rph: g.horas != null && g.horas > 0 && g.valor > 0 ? Math.round((g.valor / g.horas) * 100) / 100 : null,
    };
  }

  const onEncerrarDia = (dados: { valor: number; horas: number | null; km_inicio: number | null; km_fim: number | null; corridas: number | null; apps: string[] | null }) => {
    mGanho.mutate({
      data: hojeIso,
      valor: dados.valor,
      horas: dados.horas,
      km_inicio: dados.km_inicio,
      km_fim: dados.km_fim,
      corridas: dados.corridas,
      apps: dados.apps,
      observacao: 'dia_encerrado',
    });
  };

  // ===== FASE 14 — registro rápido: cada ação grava SÓ o que ela conhece.
  // O upsert por (motorista, data) preserva os demais campos do mesmo dia.
  const onSalvarGanho = (dd: { valor: number; horas: number | null }) =>
    mGanho.mutate({ data: hojeIso, valor: dd.valor, horas: dd.horas });
  const onSalvarKm = (dd: { km_inicio: number | null; km_fim: number | null; corridas: number | null }) =>
    mGanho.mutate({ data: hojeIso, valor: d.resumoHoje?.ganho ?? 0, km_inicio: dd.km_inicio, km_fim: dd.km_fim, corridas: dd.corridas });
  const onEncerrarSimples = () =>
    mGanho.mutate({ data: hojeIso, valor: d.resumoHoje?.ganho ?? 0, observacao: 'dia_encerrado' });

  return (
    <div ref={topoRef} className="mx-auto max-w-lg space-y-4 pb-24">
      {/* ===== CABEÇALHO DO CENTRO DE CONTROLE ===== */}
      <header className="px-1 pt-2">
        <p className="text-[10px] uppercase tracking-wide text-neutral-400">Centro de controle · {mesLabel}</p>
        <h1 className="text-xl font-extrabold text-neutral-900 dark:text-white">Como está minha operação hoje?</h1>
        <div className="mt-1 flex items-center gap-2">
          <Pill tom={statusMes === 'projecao_disponivel' || statusMes === 'dados_consistentes' ? 'verde' : statusMes === 'em_andamento' ? 'azul' : 'neutro'}>
            {STATUS_MES_LABEL[statusMes]}
          </Pill>
          <span className="text-[11px] text-neutral-500">{d.progresso.diasComLancamento} dia(s) registrado(s) no mês</span>
        </div>
      </header>

      {/* ===== 1. HERO — ESTADO DE HOJE ===== */}
      <HeroHoje
        hoje={d.hojeCockpit}
        mesLabel={mesLabel}
        rendaHora={d.meta.rendaHora}
        onEncerrarDia={onEncerrarDia}
        salvando={mGanho.isPending}
      />

      {/* ===== 1.5 ROTINA DO DIA (Fase 14): estado + registro rápido + encerramento ===== */}
      <RotinaDoDiaCard
        estado={d.estadoHoje}
        hoje={d.hojeCockpit}
        resumo={d.resumoHoje}
        revisao={d.revisaoHoje}
        horasPremissa={d.planoHoje.horasPremissa}
        horasHistorico={d.planoHoje.horasHistorico}
        salvando={mGanho.isPending || mRecargaCriar.isPending}
        onSalvarGanho={onSalvarGanho}
        onSalvarKm={onSalvarKm}
        onSalvarRecarga={(rr) => mRecargaCriar.mutate({ data: hojeIso, ...rr })}
        onEncerrar={onEncerrarSimples}
      />

      {/* ===== 3. MEU DIA (reuso Fase 12.1) ===== */}
      {d.resumoHoje && (
        <MeuDiaCard
          resumo={d.resumoHoje}
          janelas={{ 7: d.janelas[7], 14: d.janelas[14], 30: d.janelas[30] }}
          comparacaoOdometro={d.comparacaoOdometro}
        />
      )}

      {/* ===== 4. SEU COPILOTO (Fase 17, Módulo D) + Assistente Contextual (Fase 18, Módulo K,
          substitui o antigo Módulo E) + ferramenta de avaliar/registrar corrida (Fase 16) +
          5. Histórico de corridas / 6-7. Inteligência por horário e dia da semana /
          8. Qualidade da base ===== */}
      {!d.copilotoIndisponivel && (
        <>
          <CopilotoInteligenteCard
            hojeCockpit={d.hojeCockpit}
            qtdCorridasHoje={d.qtdCorridasHoje}
            somaValorCorridasHoje={d.somaValorCorridasHoje}
          />
          <AssistenteContextualCard insights={d.assistenteInsights} />
          <CopilotoCard
            corridasHoje={d.corridasHoje}
            qtdCorridasHoje={d.qtdCorridasHoje}
            somaValorCorridasHoje={d.somaValorCorridasHoje}
            divergenciaCorridasValor={d.divergenciaCorridasValor}
            divergenciaCorridasQtd={d.divergenciaCorridasQtd}
            configCopiloto={d.configCopiloto}
            copilotoConfigurado={d.copilotoConfigurado}
            copilotoAtivo={d.copilotoAtivo}
            hojeCockpit={d.hojeCockpit}
            mediaHistoricaRph={d.realHora14?.valor ?? null}
            salvando={mCorridaRegistrar.isPending}
            onRegistrar={(c) => mCorridaRegistrar.mutate({ data: hojeIso, ...c })}
            onSalvarConfig={(patch) => mConfigCopiloto.mutate(patch)}
            salvandoConfig={mConfigCopiloto.isPending}
          />
          {/* ===== Fase 17 — Módulos A/B/C/G: histórico, padrões e qualidade da base ===== */}
          <HistoricoCorridasCard historicoPeriodos={d.historicoPeriodos} />
          <PadraoHorarioDiaCard porHorarioCorridas={d.porHorarioCorridas} porDiaSemanaCorridas={d.porDiaSemanaCorridas} />
          <QualidadeBaseCopilotoCard qualidadeBaseCorridas={d.qualidadeBaseCorridas} />
        </>
      )}

      {/* ===== 9. OPERAÇÃO REAL (tendência, evolução, janelas) ===== */}
      <OperacaoRealCard
        realHora={d.realHora14}
        realDia={d.realDia14}
        metaDiaria={d.meta.metaDiaria}
        premissaHora={d.meta.rendaHora}
        eficiencia={d.eficiencia}
        custoDia={d.custoDia}
        custoHoraRealMes={d.custoHoraRealMes}
        janelas={d.janelas}
        tendencia7={d.tendencia7}
        confianca={d.confianca}
        qualidade={d.qualidadeOp}
        evolucao={d.evolucao}
        recargasResumo={d.recargasResumo30}
        energia={d.energia30}
        equilibrio={d.equilibrio}
        melhoresDias={d.melhoresDias}
        ganhosJanela={d.ganhos14}
        onUsarComoPremissa={() => {/* escolha explícita — não automática */}}
        salvandoPremissa={false}
      />

      {/* ===== 10. RESTANTE — checklist, plano, três números, custo, ritmo do mês, semana,
          inconsistências, recargas, carro, calendário, fechamento, histórico, simulador ===== */}

      {/* ===== CHECKLIST DO DIA + SAÚDE ===== */}
      <ChecklistHojeCard checklist={checklist} saude={saude} />

      {/* ===== PLANO DE HOJE (reuso Fase 11) ===== */}
      <PlanoDeHoje
        hoje={d.hojeCockpit}
        ritmo={d.ritmo}
        horasPremissa={d.planoHoje.horasPremissa}
        horasHistorico={d.planoHoje.horasHistorico}
        historicoHora={d.realHora14?.valor ?? null}
        premissaHora={d.meta.rendaHora}
        rsHoraHoje={d.planoHoje.rsHoraHoje}
        custoHoraRealMes={d.custoHoraRealMes}
        pararAgora={d.planoHoje.pararAgora}
        simulacoes={d.planoHoje.simulacoes}
        amanha={d.planoHoje.amanha}
        horasRestantesMesDia={d.planoHoje.horasRestantesMesDia}
        porHorarioCorridas={d.porHorarioCorridas}
      />

      {/* ===== TRÊS NÚMEROS — META × REAL × PROJEÇÃO ===== */}
      <TresNumerosCard meta={d.meta.metaMensal} real={d.progresso.realizado} projecoes={d.projecoes} />

      {/* ===== 6. CUSTO DA OPERAÇÃO (separação FIXO × REGISTRADO × ESTIMADO) ===== */}
      {(d.resumoHoje || d.custoOperacionalRegistrado30 > 0) && (
        <Secao titulo="Custo da operação">
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
              <p className="text-[9px] uppercase tracking-wide text-neutral-400">FIXO · IMPORTADO</p>
              <p className="text-[13px] font-bold text-neutral-900 dark:text-white">
                {d.contratoAtivo ? `${formatBRL(d.aluguelCarroMensal)}/mês` : 'NÃO INFORMADO'}
              </p>
              <p className="text-[8px] text-neutral-400">aluguel do contrato</p>
            </div>
            <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
              <p className="text-[9px] uppercase tracking-wide text-neutral-400">OPERACIONAL · REGISTRADO</p>
              <p className="text-[13px] font-bold text-neutral-900 dark:text-white">{formatBRL(d.custoOperacionalRegistrado30)}</p>
              <p className="text-[8px] text-neutral-400">recargas 30d</p>
            </div>
            <div className="rounded-xl bg-neutral-50 p-2 dark:bg-white/5">
              <p className="text-[9px] uppercase tracking-wide text-neutral-400">ENERGÉTICO · ESTIMADO</p>
              <p className="text-[13px] font-bold text-neutral-900 dark:text-white">
                {d.custoEnergeticoEstimado30 != null ? `≈ ${formatBRL(d.custoEnergeticoEstimado30)}` : 'NÃO INFORMADO'}
              </p>
              <p className="text-[8px] text-neutral-400">ficha × km × R$/kWh</p>
            </div>
          </div>
          {d.resumoHoje && (
            <div className="mt-2">
              <Linha label="Custo operacional de hoje" value={formatBRL(d.resumoHoje.custoRecargasDia)} />
              {d.resumoHoje.custoPorKm != null && <Linha label="Custo/km hoje" value={`${formatBRL(d.resumoHoje.custoPorKm)}/km`} />}
              {d.custoDiaCarro != null && <Linha label="Custo estimado/dia" value={formatBRL(d.custoDiaCarro)} />
}
            </div>
          )}
          <p className="mt-1 text-[9px] text-neutral-400">
            Categorias separadas: fixo (contrato), operacional (registrado), energético (estimado). Nunca somadas entre si.
          </p>
        </Secao>
      )}

      {/* ===== 7. MÊS ATUAL (visão simples) ===== */}
      <RitmoMesCard
        ritmo={d.ritmo}
        bancoMeta={d.bancoMeta}
        bancoHoras={d.bancoHoras}
        projecao={d.projecao}
        projecoes={d.projecoes}
        recuperacao={d.recuperacao}
      />

      {/* ===== 8. SEMANA ===== */}
      <SemanaCard semana={d.semana} extras={extrasSemana} />

      {/* ===== 9. INCONSISTÊNCIAS / PENDÊNCIAS ===== */}
      <InconsistenciasCard itens={d.inconsistencias} />

      {/* ===== 10. RECARGAS ===== */}
      <RecargasCard
        recargas={d.recargas60.filter((r) => {
          const t = new Date(`${r.data}T12:00:00`).getTime();
          return t >= new Date(`${hojeIso}T12:00:00`).getTime() - 29 * 86_400_000;
        })}
        custoRegistrado30={d.custoOperacionalRegistrado30}
        divergencia={d.divergenciaRecarga}
        onCriar={(r) => mRecargaCriar.mutate(r)}
        onRemover={(id) => mRecargaRemover.mutate(id)}
        onPausarRecorrencia={(despesaId) => mDespesaAtualizar.mutate({ id: despesaId, patch: { ativa: false } })}
        salvando={mRecargaCriar.isPending}
      />

      {/* ===== 11. CARRO ===== */}
      <CarroCard
        totalCarro={d.totais.carro}
        totalGeral={d.totais.total}
        aluguelContrato={d.contratoAtivo ? { valorMensal: d.aluguelCarroMensal, origem: typeof d.contratoAtivo.veiculo?.modelo === 'string' ? d.contratoAtivo.veiculo.modelo : 'Contrato ativo' } : null}
        porCategoria={d.carroPorCategoria}
        custoVida={d.custoVida}
        custoOperacao={d.custoOperacao}
        custoDiaCarro={d.custoDiaCarro}
        custoHoraCarro={d.custoHoraCarro}
        horasCarroHoje={d.planoHoje.horasPremissa != null ? d.horasCarroHoje : null}
        custoOperacionalRegistrado30={d.custoOperacionalRegistrado30}
        custoEnergeticoEstimado30={d.custoEnergeticoEstimado30}
        custoPorKmRegistrado={d.janelas[30].custoPorKmRegistrado}
      />

      {/* ===== CALENDÁRIO ===== */}
      <CalendarioMeta
        dias={d.calendario}
        onLancar={(dados) => mGanho.mutate({
          data: `${new Date().toISOString().slice(0, 7)}-${String(dados.dia).padStart(2, '0')}`,
          valor: dados.valor,
          horas: dados.horas,
          km_inicio: null,
          km_fim: null,
          corridas: null,
          apps: null,
          observacao: null,
        })}
        salvando={mGanho.isPending}
      />

      {/* ===== 14. HISTÓRICO ===== */}
      {/* ===== FECHAMENTO DA SEMANA E DO MÊS (Fase 14, Módulos 17/18) ===== */}
      <FechamentoCard fechamento={d.fechamentoSemana} evolucao={d.evolucao[7]} periodo="semana" />
      <FechamentoCard
        fechamento={d.fechamentoMes}
        evolucao={d.evolucao[30]}
        periodo="mes"
        metaMensal={d.meta.metaMensal}
        realizadoMes={d.progresso.realizado}
      />

      <HistoricoOperacionalCard dias={d.diarioDias} hojeIso={hojeIso} />

      {/* ===== 15. SIMULADOR ===== */}
      <SimuladorESe
        base={{ custoTotal: d.totais.total, diasTrabalho: d.meta.diasTrabalho ?? 26, rendaHora: d.meta.rendaHora }}
        cenarios={d.cenarios}
        mediaRegistrada={d.realHora14?.valor ?? null}
        faltaMeta={d.faltaMeta}
      />

      <p className="pb-2 text-center text-[10px] text-neutral-400">
        Centro de controle operacional · todos os números têm origem declarada (registrado, importado, premissa, estimativa ou simulação).
      </p>
    </div>
  );
}