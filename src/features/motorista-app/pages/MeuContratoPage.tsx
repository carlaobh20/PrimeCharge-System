import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { formatMoeda, formatDataSimples } from '@/shared/lib/format';
import {
  CONTRATO_STATUS_LABEL,
  CONTRATO_PERIODICIDADE_LABEL,
  type ContratoStatus,
} from '@/features/contracts/types';
import { Secao, Linha, Pill, SkeletonPortal, ErroPortal, VazioPortal } from '../components/ui';
import { MeuDocumentoContrato } from '../components/MeuDocumentoContrato';
import { useMeuContrato } from '../hooks/useMeuContrato';
import type { MeuContrato } from '../api/meuContrato';

// Épico 11 — App do Motorista. Tela "Meu contrato": termos do contrato ativo + histórico.
// Só leitura; nada financeiro interno (juros, caução, multas ficam fora do tipo, não invento).

// Tom da pill de status: verde = ativo; âmbar = em processo (renovação/análise/aprovado/
// assinado); neutro = encerrado/cancelado/rascunho.
const TONS_AMBAR: ContratoStatus[] = ['renovacao', 'em_analise', 'aprovado', 'assinado'];
function tomStatus(status: ContratoStatus): 'verde' | 'ambar' | 'neutro' {
  if (status === 'ativo') return 'verde';
  if (TONS_AMBAR.includes(status)) return 'ambar';
  return 'neutro';
}

// Uma linha do histórico: status + período (início → fim real/previsto ou "em aberto").
function ItemHistorico({ contrato }: { contrato: MeuContrato }) {
  const fim = contrato.data_fim_real ?? contrato.data_fim_prevista;
  const periodo = `${formatDataSimples(contrato.data_inicio)} — ${fim ? formatDataSimples(fim) : 'em aberto'}`;
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-neutral-500">{periodo}</span>
      <Pill tom={tomStatus(contrato.status)}>{CONTRATO_STATUS_LABEL[contrato.status]}</Pill>
    </div>
  );
}

export function MeuContratoPage() {
  const resultado = useMeuContrato();

  if (resultado.isLoading) return <SkeletonPortal />;
  if (resultado.isError) return <ErroPortal onRetry={() => window.location.reload()} />;

  const contrato = resultado.contratoAtivo;
  if (!contrato) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Meu contrato</h1>
        <VazioPortal>Nenhum contrato encontrado. Fale com a locadora.</VazioPortal>
      </div>
    );
  }

  const veiculo = contrato.veiculo;
  const nomeVeiculo = `${veiculo.marca?.nome ?? ''} ${veiculo.modelo?.nome ?? ''}`.trim() || '—';

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Meu contrato</h1>

      <Secao titulo="Contrato" acao={<Pill tom={tomStatus(contrato.status)}>{CONTRATO_STATUS_LABEL[contrato.status]}</Pill>}>
        <div className="divide-y divide-neutral-100 dark:divide-white/5">
          <Linha
            label="Valor"
            value={`${formatMoeda(contrato.valor_periodico)}/${CONTRATO_PERIODICIDADE_LABEL[contrato.periodicidade].toLowerCase()}`}
          />
          <Linha
            label="Dia de vencimento"
            value={contrato.dia_vencimento != null ? `Todo dia ${contrato.dia_vencimento}` : 'Não definido'}
          />
          <Linha label="Início" value={formatDataSimples(contrato.data_inicio)} />
          <Linha
            label="Término previsto"
            value={contrato.data_fim_prevista ? formatDataSimples(contrato.data_fim_prevista) : 'Sem data definida'}
          />
        </div>
      </Secao>

      {/* Centro Jurídico Fase 2 — o documento do contrato (ver/assinar/recusar). A seção só
          aparece quando existe versão compartilhada com o motorista (RLS decide). */}
      <MeuDocumentoContrato />

      <Secao titulo="Veículo do contrato">
        <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{veiculo.placa}</p>
        <p className="text-sm text-neutral-500">{nomeVeiculo}</p>
        <Link
          to="/motorista/carro"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-sky-700 dark:text-sky-400"
        >
          Ver meu carro <ChevronRight className="h-4 w-4" />
        </Link>
      </Secao>

      {resultado.historico.length > 0 && (
        <Secao titulo="Contratos anteriores">
          <div className="divide-y divide-neutral-100 dark:divide-white/5">
            {resultado.historico.map((c) => (
              <ItemHistorico key={c.id} contrato={c} />
            ))}
          </div>
        </Secao>
      )}
    </div>
  );
}
