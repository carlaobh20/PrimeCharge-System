import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Camera } from 'lucide-react';
import { formatKm, formatDataSimples } from '@/shared/lib/format';
import { Secao, Linha, Pill, SkeletonPortal, ErroPortal, VazioPortal } from '../components/ui';
import { useMinhasVistorias } from '../hooks/useMotoristaApp';
import { listItensDaVistoria, type MinhaVistoriaItem } from '../api/vistorias';
import { assinarUrlDocumento } from '../api/documentos';

// Épico 11 — App do Motorista. Detalhe de uma vistoria: resumo + itens do checklist. Só leitura.

// Label do estado de cada item do checklist.
const APLICAVEL_LABEL: Record<string, string> = {
  ok: 'OK',
  nao_ok: 'Não OK',
  nao_aplica: 'Não se aplica',
};
function labelAplicavel(aplicavel: string | null): string | null {
  if (!aplicavel) return null;
  return APLICAVEL_LABEL[aplicavel] ?? aplicavel;
}
function tomAplicavel(aplicavel: string | null): 'verde' | 'vermelho' | 'neutro' {
  if (aplicavel === 'ok') return 'verde';
  if (aplicavel === 'nao_ok') return 'vermelho';
  return 'neutro';
}

// Abre a foto do item via URL assinada (mesmo caminho de storage dos documentos).
async function abrirFoto(caminho: string) {
  const url = await assinarUrlDocumento(caminho);
  if (url) window.open(url, '_blank');
}

function ItemVistoria({ item }: { item: MinhaVistoriaItem }) {
  const aplicavel = labelAplicavel(item.aplicavel);
  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-neutral-900 dark:text-neutral-100">{item.descricao}</span>
        {aplicavel && <Pill tom={tomAplicavel(item.aplicavel)}>{aplicavel}</Pill>}
      </div>
      {item.observacao && <p className="mt-1 text-xs text-neutral-500">{item.observacao}</p>}
      {item.foto_url && (
        <button
          type="button"
          onClick={() => abrirFoto(item.foto_url as string)}
          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-sky-700 dark:text-sky-400"
        >
          <Camera className="h-3.5 w-3.5" /> Ver foto
        </button>
      )}
    </div>
  );
}

export function VistoriaDetalhePage() {
  const { id = '' } = useParams();
  const vistorias = useMinhasVistorias();
  const itens = useQuery({
    queryKey: ['motorista-app', 'vistoria-itens', id],
    queryFn: () => listItensDaVistoria(id),
    enabled: !!id,
  });

  const voltar = (
    <Link
      to="/motorista/vistorias"
      className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
    >
      <ChevronLeft className="h-4 w-4" /> Voltar
    </Link>
  );

  if (vistorias.isLoading) return <SkeletonPortal />;
  if (vistorias.isError) return <ErroPortal onRetry={() => vistorias.refetch()} />;

  const vistoria = vistorias.data?.find((v) => v.id === id);
  if (!vistoria) {
    return (
      <div className="space-y-4">
        {voltar}
        <VazioPortal>Vistoria não encontrada.</VazioPortal>
      </div>
    );
  }

  const data = vistoria.concluido_em ?? vistoria.criado_em;

  return (
    <div className="space-y-4">
      {voltar}
      <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{vistoria.titulo}</h1>

      <Secao titulo="Resumo">
        <div className="divide-y divide-neutral-100 dark:divide-white/5">
          <Linha label="Data" value={formatDataSimples(data)} />
          {vistoria.odometro_km != null && <Linha label="Odômetro" value={formatKm(vistoria.odometro_km)} />}
          {vistoria.carga_pct != null && <Linha label="Carga" value={`${vistoria.carga_pct}%`} />}
          {vistoria.assinatura_url && <Linha label="Assinatura" value="Registrada" />}
        </div>
        {vistoria.observacoes && <p className="mt-2 text-sm text-neutral-500">{vistoria.observacoes}</p>}
      </Secao>

      <Secao titulo="Itens da vistoria">
        {itens.isLoading ? (
          <div className="h-24 animate-pulse rounded-lg bg-neutral-100 dark:bg-white/5" />
        ) : itens.isError ? (
          <ErroPortal onRetry={() => itens.refetch()} />
        ) : !itens.data || itens.data.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhum item registrado.</p>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-white/5">
            {itens.data.map((item) => (
              <ItemVistoria key={item.id} item={item} />
            ))}
          </div>
        )}
      </Secao>
    </div>
  );
}
