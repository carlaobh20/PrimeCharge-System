import { useState, type FormEvent } from 'react';
import { formatDataSimples } from '@/shared/lib/format';
import { toast } from '@/shared/components/ui/toast';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import { Secao, Pill, SkeletonPortal, ErroPortal, VazioPortal } from '../components/ui';
import { useMeuContrato } from '../hooks/useMeuContrato';
import { useMeusChamados, useAbrirChamado, useCancelarChamado } from '../hooks/useMotoristaApp';
import {
  CHAMADO_CATEGORIA_LABEL,
  CHAMADO_STATUS_LABEL,
  type ChamadoCategoria,
  type ChamadoStatus,
  type MeuChamado,
} from '../api/chamados';

// Épico 11 — App do Motorista. Tela "Ajuda e suporte": abrir chamado + acompanhar os próprios.
// O motorista nunca resolve o chamado (só cancela); o staff analisa pelo sistema administrativo.

const CATEGORIAS = Object.keys(CHAMADO_CATEGORIA_LABEL) as ChamadoCategoria[];

// Pill de status do chamado.
function tomStatus(status: ChamadoStatus): 'azul' | 'ambar' | 'verde' | 'neutro' {
  if (status === 'aberto') return 'azul';
  if (status === 'em_analise' || status === 'aguardando_motorista') return 'ambar';
  if (status === 'resolvido') return 'verde';
  return 'neutro';
}

function ItemChamado({ chamado, onCancelar, cancelando }: { chamado: MeuChamado; onCancelar: (id: string) => void; cancelando: boolean }) {
  const encerrado = chamado.status === 'resolvido' || chamado.status === 'cancelado';
  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{chamado.assunto}</span>
        <Pill tom={tomStatus(chamado.status)}>{CHAMADO_STATUS_LABEL[chamado.status]}</Pill>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className="text-xs text-neutral-500">{CHAMADO_CATEGORIA_LABEL[chamado.categoria]}</span>
        <span className="text-xs text-neutral-500">· {formatDataSimples(chamado.criado_em)}</span>
      </div>
      {!encerrado && (
        <Button variant="ghost" size="sm" className="mt-1 px-0 text-red-600 hover:text-red-700" disabled={cancelando} onClick={() => onCancelar(chamado.id)}>
          Cancelar
        </Button>
      )}
    </div>
  );
}

export function SuportePage() {
  const contratoResult = useMeuContrato();
  const contratoAtivo = !contratoResult.isLoading && !contratoResult.isError ? contratoResult.contratoAtivo : null;

  const chamados = useMeusChamados();
  const abrir = useAbrirChamado();
  const cancelar = useCancelarChamado();

  const [categoria, setCategoria] = useState<ChamadoCategoria>('outro');
  const [assunto, setAssunto] = useState('');
  const [descricao, setDescricao] = useState('');

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!assunto.trim() || !descricao.trim()) {
      toast.error('Preencha assunto e descrição.');
      return;
    }
    // Veículo só faz sentido em chamados de veículo/manutenção.
    const veiculoId = categoria === 'veiculo' || categoria === 'manutencao' ? contratoAtivo?.veiculo.id ?? null : null;
    try {
      await abrir.mutateAsync({
        categoria,
        assunto: assunto.trim(),
        descricao: descricao.trim(),
        contratoId: contratoAtivo?.id ?? null,
        veiculoId,
      });
      toast.success('Chamado aberto!');
      setCategoria('outro');
      setAssunto('');
      setDescricao('');
    } catch {
      toast.error('Não foi possível abrir o chamado.');
    }
  }

  async function onCancelar(id: string) {
    try {
      await cancelar.mutateAsync(id);
      toast.success('Chamado cancelado.');
    } catch {
      toast.error('Não foi possível cancelar.');
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Ajuda e suporte</h1>

      {/* (a) Abrir chamado */}
      <Secao titulo="Abrir chamado">
        <form className="space-y-3" onSubmit={enviar}>
          <div>
            <Label htmlFor="categoria">Categoria</Label>
            <Select id="categoria" value={categoria} onChange={(e) => setCategoria(e.target.value as ChamadoCategoria)}>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {CHAMADO_CATEGORIA_LABEL[c]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="assunto">Assunto</Label>
            <Input id="assunto" value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="Resumo do problema" />
          </div>
          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={4}
              placeholder="Conte o que aconteceu com detalhes"
              className="flex w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
          </div>
          <Button type="submit" disabled={abrir.isPending} className="w-full">
            {abrir.isPending ? 'Enviando…' : 'Enviar'}
          </Button>
        </form>
      </Secao>

      {/* (b) Meus chamados */}
      {chamados.isLoading ? (
        <SkeletonPortal />
      ) : chamados.isError ? (
        <ErroPortal onRetry={() => chamados.refetch()} />
      ) : !chamados.data || chamados.data.length === 0 ? (
        <VazioPortal>Você ainda não abriu chamados.</VazioPortal>
      ) : (
        <Secao titulo="Meus chamados">
          <div className="divide-y divide-neutral-100 dark:divide-white/5">
            {chamados.data.map((c) => (
              <ItemChamado key={c.id} chamado={c} onCancelar={onCancelar} cancelando={cancelar.isPending} />
            ))}
          </div>
        </Secao>
      )}
    </div>
  );
}
