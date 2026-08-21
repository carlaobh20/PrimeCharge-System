import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Car, Radio, Clock, CircleOff } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { cn } from '@/shared/lib/utils';
import { listFrotaComLocalizacao, type VeiculoFrotaComLocalizacao } from '../../api/localizacaoFrota';
import { frescorLocalizacao, resumoFrota, type EstadoFrescorLocalizacao } from '../../lib/localizacaoFrota';
import { presencaMotorista, JANELAS_PRESENCA_PADRAO } from '../../lib/presenca';
import type { MarcadorFrota } from './MapaFrota';

// FASE 20 — Módulo 9: primeira UI real da tab "Inteligência da Frota" (antes EmptyState).
// Mapa (Módulo 10) só entra no bundle quando este componente monta — nunca no carregamento
// inicial da tab "Dashboard"/"Todos os Veículos", e nunca no app do motorista.
const MapaFrota = lazy(() => import('./MapaFrota'));

const REFETCH_INTERVAL_MS = 30_000; // "tempo quase real" via polling (auditoria, seção 9-10 — sem Supabase Realtime nesta fase)

const LABEL_ESTADO: Record<EstadoFrescorLocalizacao, string> = {
  LOCALIZACAO_ATUAL: 'Localização atual',
  LOCALIZACAO_RECENTE: 'Localização recente',
  SEM_ATUALIZACAO: 'Sem atualização',
  SEM_LOCALIZACAO: 'Sem localização',
};

function idadeLegivel(ms: number, agoraMs: number): string {
  const segundos = Math.max(0, Math.round((agoraMs - ms) / 1000));
  if (segundos < 60) return `${segundos}s`;
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.round(minutos / 60);
  return `${horas}h`;
}

type FiltroResumo = 'todos' | 'localizacao_ativa' | 'sem_atualizacao' | 'sem_localizacao';

export function CentroInteligenciaFrota() {
  const [agoraMs, setAgoraMs] = useState(() => Date.now());
  const [filtroResumo, setFiltroResumo] = useState<FiltroResumo>('todos');
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<string>('todos');
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);

  // "Tempo quase real": refetch por polling + "agora" reavaliado, ambos só enquanto a aba está
  // visível (mesmo padrão de useHeartbeatVisibilidade — nunca setInterval cego em background).
  useEffect(() => {
    const atualizar = () => {
      if (document.visibilityState === 'visible') setAgoraMs(Date.now());
    };
    const intervalo = window.setInterval(atualizar, 15_000);
    document.addEventListener('visibilitychange', atualizar);
    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener('visibilitychange', atualizar);
    };
  }, []);

  const query = useQuery({
    queryKey: ['frota', 'inteligencia', 'localizacao'],
    queryFn: listFrotaComLocalizacao,
    // "Tempo quase real" via polling (auditoria, seção 9-10). refetchIntervalInBackground:false
    // já pausa o polling quando a aba perde o foco — sem setInterval próprio pra isso.
    refetchInterval: REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });

  const itens = useMemo(() => query.data ?? [], [query.data]);

  const resumo = useMemo(
    () =>
      resumoFrota(
        itens.map((i) => ({
          veiculoId: i.id,
          placa: i.placa,
          statusVeiculo: i.status,
          motoristaId: i.motoristaId,
          motoristaNome: i.motoristaNome,
          contratoId: i.contratoId,
          ultimaLocalizacao: i.ultimaLocalizacao,
        })),
        agoraMs,
      ),
    [itens, agoraMs],
  );

  const statusDisponiveis = useMemo(() => [...new Set(itens.map((i) => i.status))].sort(), [itens]);
  // Módulo 12: "se a empresa logada só tiver uma empresa, não mostrar filtro inútil" — RLS já
  // garante que esta tela SEMPRE mostra exatamente uma empresa (a do staff logado), então não
  // existe filtro de empresa aqui (seria sempre 1 opção fixa, sem função nenhuma).

  const itensFiltrados = useMemo(() => {
    const buscaNorm = busca.trim().toLowerCase();
    return itens.filter((i) => {
      const estado = frescorLocalizacao(i.ultimaLocalizacao?.timestampMs ?? null, agoraMs);
      if (filtroResumo === 'localizacao_ativa' && !(estado === 'LOCALIZACAO_ATUAL' || estado === 'LOCALIZACAO_RECENTE')) return false;
      if (filtroResumo === 'sem_atualizacao' && estado !== 'SEM_ATUALIZACAO') return false;
      if (filtroResumo === 'sem_localizacao' && estado !== 'SEM_LOCALIZACAO') return false;
      if (statusFiltro !== 'todos' && i.status !== statusFiltro) return false;
      if (buscaNorm && !`${i.placa} ${i.motoristaNome ?? ''}`.toLowerCase().includes(buscaNorm)) return false;
      return true;
    });
  }, [itens, agoraMs, filtroResumo, statusFiltro, busca]);

  const marcadores: MarcadorFrota[] = useMemo(
    () =>
      itensFiltrados
        .filter((i) => i.ultimaLocalizacao != null)
        .map((i) => ({
          id: i.id,
          latitude: i.ultimaLocalizacao!.latitude,
          longitude: i.ultimaLocalizacao!.longitude,
          estado: frescorLocalizacao(i.ultimaLocalizacao!.timestampMs, agoraMs),
          placaLabel: i.placa,
        })),
    [itensFiltrados, agoraMs],
  );

  const selecionado = itens.find((i) => i.id === selecionadoId) ?? null;

  if (query.isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-neutral-100 dark:bg-white/5" />;
  }

  if (query.isError) {
    return (
      <EmptyState
        icon={CircleOff}
        title="Não foi possível carregar a Inteligência da Frota"
        description="Verifique sua conexão e tente novamente."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <CardResumo icon={Car} label="Total de veículos" value={resumo.totalVeiculos} ativo={filtroResumo === 'todos'} onClick={() => setFiltroResumo('todos')} />
        <CardResumo icon={Radio} label="Localização ativa" value={resumo.localizacaoAtiva} tom="verde" ativo={filtroResumo === 'localizacao_ativa'} onClick={() => setFiltroResumo('localizacao_ativa')} />
        <CardResumo icon={Clock} label="Sem atualização" value={resumo.semAtualizacao} tom="ambar" ativo={filtroResumo === 'sem_atualizacao'} onClick={() => setFiltroResumo('sem_atualizacao')} />
        <CardResumo icon={MapPin} label="Sem localização" value={resumo.semLocalizacao} tom="neutro" ativo={filtroResumo === 'sem_localizacao'} onClick={() => setFiltroResumo('sem_localizacao')} />
      </div>

      {resumo.totalVeiculos > 0 && resumo.localizacaoAtiva === 0 && resumo.semAtualizacao === 0 && (
        <p className="text-[13px] text-neutral-500">Localização operacional ainda não disponível para nenhum veículo desta frota.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por placa ou motorista"
          className="min-w-[220px] flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm dark:border-white/10 dark:bg-white/[0.03]"
        />
        {statusDisponiveis.length > 1 && (
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm dark:border-white/10 dark:bg-white/[0.03]"
          >
            <option value="todos">Todos os status</option>
            {statusDisponiveis.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="order-2 lg:order-1 lg:col-span-2 max-h-[520px] space-y-1.5 overflow-y-auto rounded-2xl border border-neutral-200 p-2 dark:border-white/10">
          {itensFiltrados.length === 0 && <p className="p-3 text-sm text-neutral-400">Nenhum veículo corresponde ao filtro.</p>}
          {itensFiltrados.map((item) => {
            const estado = frescorLocalizacao(item.ultimaLocalizacao?.timestampMs ?? null, agoraMs);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelecionadoId(item.id)}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors',
                  item.id === selecionadoId ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'hover:bg-neutral-100 dark:hover:bg-white/5',
                )}
              >
                <span>
                  <span className="font-semibold">{item.placa}</span>
                  {item.motoristaNome && <span className="ml-2 opacity-70">{item.motoristaNome}</span>}
                </span>
                <span className={cn('text-[11px] font-medium', item.id === selecionadoId ? 'opacity-80' : PONTO_COR[estado])}>
                  {estado === 'SEM_LOCALIZACAO' ? '—' : idadeLegivel(item.ultimaLocalizacao!.timestampMs, agoraMs)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="order-1 lg:order-2 lg:col-span-3 h-[360px] lg:h-[520px] overflow-hidden rounded-2xl border border-neutral-200 dark:border-white/10">
          {marcadores.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-neutral-400">Nenhum veículo com localização para mostrar no mapa.</div>
          ) : (
            <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-neutral-400">Carregando mapa…</div>}>
              <MapaFrota marcadores={marcadores} selecionadoId={selecionadoId} onSelecionar={setSelecionadoId} />
            </Suspense>
          )}
        </div>
      </div>

      {selecionado && <PainelDetalhe item={selecionado} agoraMs={agoraMs} onFechar={() => setSelecionadoId(null)} />}
    </div>
  );
}

const PONTO_COR: Record<EstadoFrescorLocalizacao, string> = {
  LOCALIZACAO_ATUAL: 'text-emerald-600 dark:text-emerald-400',
  LOCALIZACAO_RECENTE: 'text-sky-600 dark:text-sky-400',
  SEM_ATUALIZACAO: 'text-amber-600 dark:text-amber-400',
  SEM_LOCALIZACAO: 'text-neutral-400',
};

function CardResumo({
  icon: Icon,
  label,
  value,
  tom,
  ativo,
  onClick,
}: {
  icon: typeof Car;
  label: string;
  value: number;
  tom?: 'verde' | 'ambar' | 'neutro';
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-w-[168px] flex-1 flex-col gap-2 rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
        ativo ? 'border-neutral-900 dark:border-white' : 'border-neutral-200 dark:border-white/10',
        'bg-white dark:bg-white/[0.03]',
      )}
    >
      <div className="flex items-center gap-2 text-neutral-500">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <span
        className={cn(
          'text-xl font-semibold',
          tom === 'verde' && 'text-emerald-600 dark:text-emerald-400',
          tom === 'ambar' && 'text-amber-600 dark:text-amber-400',
          !tom && 'text-neutral-900 dark:text-neutral-100',
        )}
      >
        {value}
      </span>
    </button>
  );
}

function PainelDetalhe({ item, agoraMs, onFechar }: { item: VeiculoFrotaComLocalizacao; agoraMs: number; onFechar: () => void }) {
  const estado = frescorLocalizacao(item.ultimaLocalizacao?.timestampMs ?? null, agoraMs);
  // Presença aproximada pela recência da própria captura de localização — é a única evidência
  // real de atividade que chega até staff hoje (heartbeat de visibilidade é local ao dispositivo
  // do motorista, ver auditoria seção 12/CENTRO-INTELIGENCIA-FROTA.md §1). Honesto: SEM_DADO
  // quando não há nenhuma localização, nunca "offline" inventado.
  const presenca = presencaMotorista(item.ultimaLocalizacao?.timestampMs ?? null, agoraMs, JANELAS_PRESENCA_PADRAO);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{item.placa} {item.marca ? `— ${item.marca} ${item.modelo ?? ''}` : ''}</h3>
        <button type="button" onClick={onFechar} className="text-xs text-neutral-400 underline">fechar</button>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
        <Campo label="Motorista" valor={item.motoristaNome ?? 'Sem contrato ativo'} />
        <Campo label="Status operacional" valor={item.status} />
        <Campo label="Presença" valor={presenca === 'SEM_DADO' ? 'Sem dado' : presenca.replace('_', ' ')} />
        <Campo label="Localização" valor={LABEL_ESTADO[estado]} />
        <Campo label="Última atualização" valor={item.ultimaLocalizacao ? `há ${idadeLegivel(item.ultimaLocalizacao.timestampMs, agoraMs)}` : 'Sem dado'} />
        <Campo label="Precisão" valor={item.ultimaLocalizacao?.accuracyM != null ? `≈ ${Math.round(item.ultimaLocalizacao.accuracyM)} m` : 'Não informado'} />
      </dl>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-neutral-400">{label}</dt>
      <dd className="font-medium text-neutral-900 dark:text-neutral-100">{valor}</dd>
    </div>
  );
}
