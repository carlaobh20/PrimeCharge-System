import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Check, X, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { toast } from '@/shared/components/ui/toast';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { cn } from '@/shared/lib/utils';
import { Secao, Linha, Pill, SkeletonPortal, ErroPortal, VazioPortal } from '../components/ui';
import { useMeuContrato } from '../hooks/useMeuContrato';
import { enviarFotoVistoria } from '../api/uploads';
import {
  ITENS_VISTORIA_PADRAO,
  iniciarVistoria,
  adicionarItens,
  responderItem,
  enviarVistoria,
  type RespostaItem,
} from '../api/vistoriaWrite';

// Épico 11/8 — Vistoria digital executada pelo MOTORISTA. Ele CRIA, preenche item a item com foto
// e ENVIA pra análise da operação. NÃO conclui: concluir ativa/encerra o contrato e é ação do
// staff. A UI deixa isso explícito ("fica aguardando análise da operação").

type TipoVistoria = 'entrega' | 'devolucao';

// Estado local de um item durante o preenchimento (a resposta só vai ao banco ao avançar).
type ItemLocal = {
  id: string;
  descricao: string;
  resposta: RespostaItem | null;
  observacao: string;
  fotoPath: string | null;
  gravado: boolean; // já persistido (responderItem) com a resposta atual
};

// Passos internos: -1 = início (escolher tipo), 0..N-1 = itens, N = revisão/envio.
export function NovaVistoriaPage() {
  const navigate = useNavigate();
  const contrato = useMeuContrato();

  const [tipo, setTipo] = useState<TipoVistoria>('entrega');
  const [checklistId, setChecklistId] = useState<string | null>(null);
  const [itens, setItens] = useState<ItemLocal[]>([]);
  const [passo, setPasso] = useState(-1); // -1 início; índice do item; itens.length = revisão
  const [iniciando, setIniciando] = useState(false);

  // Passo final.
  const [odometro, setOdometro] = useState('');
  const [carga, setCarga] = useState('');
  const [obsGerais, setObsGerais] = useState('');
  const [declara, setDeclara] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const total = itens.length;

  // Resumo por resposta (usado na revisão).
  const resumo = useMemo(() => {
    let ok = 0, avaria = 0, na = 0;
    for (const it of itens) {
      if (it.resposta === 'ok') ok++;
      else if (it.resposta === 'avaria') avaria++;
      else if (it.resposta === 'nao_aplica') na++;
    }
    return { ok, avaria, na };
  }, [itens]);

  const todosRespondidos = itens.every(
    (it) => it.resposta !== null && (it.resposta !== 'avaria' || it.observacao.trim() !== ''),
  );

  // ---- Estados de carga do contrato ----
  if (contrato.isLoading) return <SkeletonPortal />;
  if (contrato.isError) return <ErroPortal onRetry={() => window.location.reload()} />;
  if (!contrato.contratoAtivo) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Nova vistoria</h1>
        <VazioPortal>Você precisa de um contrato ativo para fazer vistoria.</VazioPortal>
      </div>
    );
  }

  const c = contrato.contratoAtivo;
  const veiculoLabel = [c.veiculo.marca?.nome, c.veiculo.modelo?.nome].filter(Boolean).join(' ') || 'Veículo';

  // ---- Ação: iniciar ----
  async function iniciar() {
    setIniciando(true);
    try {
      const id = await iniciarVistoria(tipo, c.id, c.veiculo.id);
      const criados = await adicionarItens(id, ITENS_VISTORIA_PADRAO);
      setChecklistId(id);
      setItens(
        criados.map((it) => ({ id: it.id, descricao: it.descricao, resposta: null, observacao: '', fotoPath: null, gravado: false })),
      );
      setPasso(0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível iniciar a vistoria.');
    } finally {
      setIniciando(false);
    }
  }

  // Atualiza um item por índice.
  function patchItem(idx: number, patch: Partial<ItemLocal>) {
    setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  // Persiste a resposta do item atual antes de avançar; devolve true se ok.
  async function gravarItem(idx: number): Promise<boolean> {
    const it = itens[idx];
    if (!it.resposta) {
      toast.error('Escolha OK, Avaria ou Não se aplica.');
      return false;
    }
    if (it.resposta === 'avaria' && it.observacao.trim() === '') {
      toast.error('Descreva a avaria na observação.');
      return false;
    }
    if (it.gravado) return true; // nada mudou desde a última gravação
    try {
      await responderItem(it.id, it.resposta, it.observacao.trim(), it.fotoPath);
      patchItem(idx, { gravado: true });
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível salvar o item.');
      return false;
    }
  }

  async function proximo() {
    const ok = await gravarItem(passo);
    if (ok) setPasso((p) => p + 1);
  }

  // ---- Ação: enviar ----
  async function enviar() {
    if (!checklistId) return;
    if (!todosRespondidos) {
      toast.error('Responda todos os itens antes de enviar.');
      return;
    }
    if (!declara) {
      toast.error('Confirme a declaração para enviar.');
      return;
    }
    setEnviando(true);
    try {
      await enviarVistoria(checklistId, {
        odometroKm: odometro.trim() === '' ? null : Number(odometro),
        cargaPct: carga.trim() === '' ? null : Number(carga),
        observacoes: obsGerais.trim() === '' ? null : obsGerais.trim(),
      });
      toast.success('Vistoria enviada para análise.');
      navigate('/motorista/vistorias');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível enviar a vistoria.');
    } finally {
      setEnviando(false);
    }
  }

  // ================= PASSO -1: INÍCIO =================
  if (passo === -1) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Nova vistoria</h1>

        <Secao titulo="Tipo de vistoria">
          <div className="grid grid-cols-2 gap-3">
            <BotaoTipo ativo={tipo === 'entrega'} onClick={() => setTipo('entrega')}>Entrega</BotaoTipo>
            <BotaoTipo ativo={tipo === 'devolucao'} onClick={() => setTipo('devolucao')}>Devolução</BotaoTipo>
          </div>
        </Secao>

        <Secao titulo="Veículo">
          <Linha label="Placa" value={c.veiculo.placa} />
          <Linha label="Modelo" value={veiculoLabel} />
        </Secao>

        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200">
          Você vai fotografar e avaliar cada parte. No fim, envia pra locadora analisar. Você não
          conclui a vistoria — quem valida e ativa o contrato é a operação.
        </div>

        <Button className="h-12 w-full text-base" disabled={iniciando} onClick={iniciar}>
          {iniciando ? 'Preparando…' : 'Iniciar vistoria'}
        </Button>
      </div>
    );
  }

  // ================= PASSO FINAL: REVISÃO =================
  if (passo >= total) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Revisar e enviar</h1>

        <Secao titulo="Resumo dos itens">
          <div className="flex flex-wrap gap-2">
            <Pill tom="verde">{resumo.ok} OK</Pill>
            <Pill tom="ambar">{resumo.avaria} avaria{resumo.avaria === 1 ? '' : 's'}</Pill>
            <Pill tom="neutro">{resumo.na} não se aplica</Pill>
          </div>
        </Secao>

        <Secao titulo="Medições">
          <div className="space-y-3">
            <div>
              <Label htmlFor="odometro">Odômetro (km)</Label>
              <Input id="odometro" type="number" inputMode="numeric" min={0} value={odometro}
                onChange={(e) => setOdometro(e.target.value)} placeholder="Ex.: 45210" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="carga">Carga / bateria (%)</Label>
              <Input id="carga" type="number" inputMode="numeric" min={0} max={100} value={carga}
                onChange={(e) => setCarga(e.target.value)} placeholder="Ex.: 80" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="obs">Observações gerais</Label>
              <textarea id="obs" rows={3} value={obsGerais} onChange={(e) => setObsGerais(e.target.value)}
                placeholder="Algo que a operação precisa saber?"
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700" />
            </div>
          </div>
        </Secao>

        <label className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <input type="checkbox" checked={declara} onChange={(e) => setDeclara(e.target.checked)}
            className="mt-0.5 h-5 w-5 rounded border-neutral-300 text-emerald-600" />
          <span className="text-sm text-neutral-700 dark:text-neutral-300">Declaro que as informações estão corretas.</span>
        </label>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          Ao enviar, a vistoria fica aguardando análise da operação. Ela só é concluída pela locadora.
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="h-12 flex-1 text-base" onClick={() => setPasso(total - 1)}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>
          <Button className="h-12 flex-1 text-base" disabled={enviando || !todosRespondidos || !declara} onClick={enviar}>
            {enviando ? 'Enviando…' : 'Enviar vistoria'}
          </Button>
        </div>
      </div>
    );
  }

  // ================= PASSO 0..N-1: UM ITEM POR VEZ =================
  const item = itens[passo];
  return (
    <div className="space-y-4">
      {/* Progresso */}
      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-neutral-500">
          <span>Item {passo + 1} de {total}</span>
          <span>{passo + 1}/{total}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
          <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${((passo + 1) / total) * 100}%` }} />
        </div>
      </div>

      <Secao titulo="Avaliação">
        <p className="mb-3 text-base font-semibold text-neutral-900 dark:text-neutral-100">{item.descricao}</p>

        <div className="grid grid-cols-3 gap-2">
          <BotaoResposta ativo={item.resposta === 'ok'} tom="verde" onClick={() => patchItem(passo, { resposta: 'ok', gravado: false })}>
            <Check className="h-5 w-5" /> OK
          </BotaoResposta>
          <BotaoResposta ativo={item.resposta === 'avaria'} tom="ambar" onClick={() => patchItem(passo, { resposta: 'avaria', gravado: false })}>
            <AlertTriangle className="h-5 w-5" /> Avaria
          </BotaoResposta>
          <BotaoResposta ativo={item.resposta === 'nao_aplica'} tom="neutro" onClick={() => patchItem(passo, { resposta: 'nao_aplica', gravado: false })}>
            <X className="h-5 w-5" /> Não se aplica
          </BotaoResposta>
        </div>

        {/* Avaria: observação obrigatória + foto */}
        {item.resposta === 'avaria' && (
          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor={`obs-${passo}`}>Descreva a avaria</Label>
              <textarea id={`obs-${passo}`} rows={2} value={item.observacao}
                onChange={(e) => patchItem(passo, { observacao: e.target.value, gravado: false })}
                placeholder="Ex.: risco na porta dianteira direita"
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700" />
            </div>
            <BotaoFoto checklistId={checklistId!} itemId={item.id} temFoto={!!item.fotoPath}
              onFoto={(path) => patchItem(passo, { fotoPath: path, gravado: false })} />
          </div>
        )}
      </Secao>

      <div className="flex gap-3">
        <Button variant="outline" className="h-12 flex-1 text-base" onClick={() => setPasso((p) => p - 1)}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>
        <Button className="h-12 flex-1 text-base" onClick={proximo}>
          {passo === total - 1 ? 'Revisar' : 'Próximo'} <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Botão de escolha de tipo (início).
function BotaoTipo({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        'h-12 rounded-xl border text-base font-medium transition-colors',
        ativo
          ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
          : 'border-neutral-200 text-neutral-700 dark:border-white/10 dark:text-neutral-300',
      )}>
      {children}
    </button>
  );
}

// Botão grande de resposta (OK / Avaria / Não se aplica).
function BotaoResposta({ ativo, tom, onClick, children }: { ativo: boolean; tom: 'verde' | 'ambar' | 'neutro'; onClick: () => void; children: ReactNode }) {
  const cores: Record<typeof tom, string> = {
    verde: 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    ambar: 'border-amber-600 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    neutro: 'border-neutral-500 bg-neutral-100 text-neutral-700 dark:bg-white/10 dark:text-neutral-200',
  };
  return (
    <button type="button" onClick={onClick}
      className={cn(
        'flex h-20 flex-col items-center justify-center gap-1 rounded-xl border text-xs font-semibold transition-colors',
        ativo ? cores[tom] : 'border-neutral-200 text-neutral-600 dark:border-white/10 dark:text-neutral-400',
      )}>
      {children}
    </button>
  );
}

// Botão de foto com loading LOCAL (não trava a tela). Sobe a foto e devolve o caminho_storage.
function BotaoFoto({ checklistId, itemId, temFoto, onFoto }: { checklistId: string; itemId: string; temFoto: boolean; onFoto: (path: string) => void }) {
  const [subindo, setSubindo] = useState(false);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite re-selecionar o mesmo arquivo
    if (!file) return;
    setSubindo(true);
    try {
      const path = await enviarFotoVistoria(file, checklistId, itemId);
      onFoto(path);
      toast.success('Foto anexada.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível enviar a foto.');
    } finally {
      setSubindo(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className={cn(
        'inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-neutral-300 text-sm font-medium dark:border-neutral-700',
        subindo && 'pointer-events-none opacity-60',
      )}>
        <Camera className="h-4 w-4" />
        {subindo ? 'Enviando foto…' : temFoto ? 'Trocar foto' : 'Tirar foto'}
        <input type="file" accept="image/*" capture="environment" onChange={onFile} disabled={subindo} className="hidden" />
      </label>
      {temFoto && <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Foto anexada ✓</p>}
    </div>
  );
}
