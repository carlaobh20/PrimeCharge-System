import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Copy, Eye, FileStack, Pencil, Plus, Upload } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Dialog } from '@/shared/components/ui/dialog';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { toast, extrairMensagemDeErro } from '@/shared/components/ui/toast';
import { formatDataSimples } from '@/shared/lib/format';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { useCreateTemplate, useTemplatesJuridico, useUpdateTemplate } from '../hooks';
import { corpoMinutaMaster, variaveisMinutaMaster, NOME_TEMPLATE_MASTER, AVISO_MINUTA } from '../minutaMaster';
import { extrairVariaveis } from '../lib';
import { DocumentoView } from '../components/DocumentoView';
import { CONTRATO_TEMPLATE_STATUS_LABEL, type ContratoTemplate } from '../types';

// Templates (regras 33–35). Editar um template NUNCA altera contratos já gerados: cada versão
// de contrato carrega o próprio `corpo` renderizado e congelado — o template é só a origem.
// (Garantia estrutural da 0042, não convenção de UI.) A minuta master vem de docs/juridico/
// via import ?raw — fonte única; o botão "Criar Contrato Master" materializa ela como template.

const VARIANTE_TEMPLATE: Record<ContratoTemplate['status'], 'secondary' | 'success' | 'outline'> = {
  rascunho: 'secondary',
  publicado: 'success',
  arquivado: 'outline',
};

export function JuridicoTemplatesPage() {
  const { data: usuario } = useCurrentUsuario();
  const empresaId = usuario?.empresa_id ?? undefined;
  const { data: templates, isLoading } = useTemplatesJuridico();
  const criar = useCreateTemplate();
  const atualizar = useUpdateTemplate();

  const [visualizar, setVisualizar] = useState<ContratoTemplate | null>(null);
  const [editar, setEditar] = useState<ContratoTemplate | null>(null);
  const [nomeEdit, setNomeEdit] = useState('');
  const [corpoEdit, setCorpoEdit] = useState('');

  const temMaster = (templates ?? []).some((t) => t.nome === NOME_TEMPLATE_MASTER);

  const criarMaster = () => {
    if (!empresaId) return;
    criar.mutate(
      {
        empresaId,
        payload: {
          nome: NOME_TEMPLATE_MASTER,
          descricao: `${AVISO_MINUTA}. Origem: docs/juridico/contrato-master-minuta.md — toda decisão jurídica marcada [VALIDAR COM ADVOGADO].`,
          tipo: 'padrao',
          corpo: corpoMinutaMaster(),
          variaveis: variaveisMinutaMaster(),
          status: 'rascunho',
        },
      },
      {
        onSuccess: () => toast.success('Contrato Master criado como template', 'Revise e publique quando decidir usar.'),
        onError: (e) => toast.error('Não foi possível criar', extrairMensagemDeErro(e)),
      },
    );
  };

  const abrirEdicao = (t: ContratoTemplate) => {
    setEditar(t);
    setNomeEdit(t.nome);
    setCorpoEdit(t.corpo);
  };

  const salvarEdicao = () => {
    if (!editar) return;
    atualizar.mutate(
      {
        id: editar.id,
        payload: {
          nome: nomeEdit,
          corpo: corpoEdit,
          variaveis: extrairVariaveis(corpoEdit),
        },
      },
      {
        onSuccess: () => {
          toast.success('Template salvo', 'Contratos já gerados não mudam — cada versão carrega o próprio corpo congelado.');
          setEditar(null);
        },
        onError: (e) => toast.error('Não foi possível salvar', extrairMensagemDeErro(e)),
      },
    );
  };

  const mudarStatus = (t: ContratoTemplate, status: ContratoTemplate['status']) => {
    atualizar.mutate(
      { id: t.id, payload: { status } },
      {
        onSuccess: () => toast.success(`Template ${CONTRATO_TEMPLATE_STATUS_LABEL[status].toLowerCase()}`),
        onError: (e) => toast.error('Não foi possível mudar o status', extrairMensagemDeErro(e)),
      },
    );
  };

  const duplicar = (t: ContratoTemplate) => {
    if (!empresaId) return;
    criar.mutate(
      {
        empresaId,
        payload: {
          nome: `${t.nome} (cópia)`,
          descricao: t.descricao,
          tipo: t.tipo,
          corpo: t.corpo,
          variaveis: t.variaveis,
          status: 'rascunho',
        },
      },
      {
        onSuccess: () => toast.success('Template duplicado', 'A cópia nasce em rascunho.'),
        onError: (e) => toast.error('Não foi possível duplicar', extrairMensagemDeErro(e)),
      },
    );
  };

  return (
    <div className="p-8">
      <Link to="/juridico" className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
        <ChevronLeft className="h-4 w-4" /> Jurídico
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            <FileStack className="h-6 w-6 text-emerald-600" /> Templates de contrato
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Minutas com variáveis {'{{...}}'}. Editar template não altera contratos já gerados.
          </p>
        </div>
        {!temMaster && (
          <Button onClick={criarMaster} disabled={criar.isPending || !empresaId}>
            <Plus className="h-4 w-4" /> Criar Contrato Master (minuta)
          </Button>
        )}
      </div>

      {isLoading && <p className="mt-6 text-sm text-neutral-500">Carregando…</p>}
      {!isLoading && (templates ?? []).length === 0 && (
        <div className="mt-6">
          <EmptyState
            icon={FileStack}
            title="Nenhum template"
            description="Comece criando o Contrato Master a partir da minuta jurídica do projeto."
          />
        </div>
      )}

      <div className="mt-6 space-y-2">
        {(templates ?? []).map((t) => (
          <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                {t.nome}
                <Badge variant={VARIANTE_TEMPLATE[t.status]}>{CONTRATO_TEMPLATE_STATUS_LABEL[t.status]}</Badge>
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">
                v{t.versao_template} · {t.variaveis.length} variáveis · atualizado {formatDataSimples(t.atualizado_em)}
              </p>
              {t.descricao && <p className="mt-0.5 max-w-2xl truncate text-xs text-amber-600 dark:text-amber-400">{t.descricao}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => setVisualizar(t)}>
                <Eye className="h-3.5 w-3.5" /> Ver
              </Button>
              {t.status !== 'arquivado' && (
                <Button size="sm" variant="ghost" onClick={() => abrirEdicao(t)}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => duplicar(t)}>
                <Copy className="h-3.5 w-3.5" /> Duplicar
              </Button>
              {t.status === 'rascunho' && (
                <Button size="sm" variant="outline" onClick={() => mudarStatus(t, 'publicado')}>
                  <Upload className="h-3.5 w-3.5" /> Publicar
                </Button>
              )}
              {t.status === 'publicado' && (
                <Button size="sm" variant="ghost" onClick={() => mudarStatus(t, 'arquivado')}>
                  Arquivar
                </Button>
              )}
              {t.status === 'arquivado' && (
                <Button size="sm" variant="ghost" onClick={() => mudarStatus(t, 'rascunho')}>
                  Reativar
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Visualizar */}
      <Dialog open={visualizar !== null} onOpenChange={(v) => !v && setVisualizar(null)} title={visualizar?.nome ?? ''} className="max-w-3xl">
        {visualizar && <DocumentoView corpo={visualizar.corpo} congelada={false} templateAprovado={false} />}
      </Dialog>

      {/* Editar */}
      <Dialog
        open={editar !== null}
        onOpenChange={(v) => !v && setEditar(null)}
        title="Editar template"
        description="Alterações valem só para contratos gerados DEPOIS — versões existentes têm corpo próprio congelado."
        className="max-w-3xl"
      >
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={nomeEdit} onChange={(e) => setNomeEdit(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Corpo (markdown com {'{{variáveis}}'})</Label>
            <Textarea value={corpoEdit} onChange={(e) => setCorpoEdit(e.target.value)} className="mt-1 min-h-[45vh] font-mono text-xs" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditar(null)}>
              Cancelar
            </Button>
            <Button disabled={atualizar.isPending || nomeEdit.trim().length < 3} onClick={salvarEdicao}>
              {atualizar.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
