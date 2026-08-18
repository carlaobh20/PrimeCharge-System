import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileSignature, Lock } from 'lucide-react';
import { supabase } from '@/shared/lib/supabase';
import { markdownParaHtml } from '@/features/contracts/juridico/markdown';
import { Secao, Pill } from './ui';
import {
  assinarMeuContrato,
  listMeusAditivos,
  listMinhasAssinaturas,
  listMinhasVersoesContrato,
  marcarVersaoVisualizada,
  recusarMeuContrato,
  type MinhaAssinatura,
  type MinhaVersaoContrato,
} from '../api/meuContratoJuridico';

const ADITIVO_LABEL: Record<string, string> = {
  valor: 'Alteração de valor', veiculo: 'Troca de veículo', prazo: 'Alteração de prazo',
  motorista: 'Alteração cadastral', renovacao: 'Renovação', rescisao: 'Rescisão', outro: 'Outros',
};

// "Meu contrato" — o DOCUMENTO jurídico (Centro Jurídico Fase 2, regras 24–25). A RLS entrega só
// o que o motorista pode ver: versões do próprio contrato em aguardando_assinatura/assinada/
// vigente e a própria linha de assinatura. Nada de dado interno (snapshot, template, auditoria).
// Aceite/recusa passam pela RLS de UPDATE da própria linha; abrir o documento marca "visualizado".

const STATUS_PILL: Record<string, { tom: 'verde' | 'ambar' | 'neutro'; label: string }> = {
  aguardando_assinatura: { tom: 'ambar', label: 'Aguardando sua assinatura' },
  assinada: { tom: 'verde', label: 'Assinado' },
  vigente: { tom: 'verde', label: 'Vigente' },
};

export function MeuDocumentoContrato() {
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState('');

  const versoesQuery = useQuery({ queryKey: ['motorista-app', 'contrato-versoes'], queryFn: listMinhasVersoesContrato });
  const assinaturasQuery = useQuery({ queryKey: ['motorista-app', 'contrato-assinaturas'], queryFn: listMinhasAssinaturas });
  const aditivosQuery = useQuery({ queryKey: ['motorista-app', 'contrato-aditivos'], queryFn: listMeusAditivos });

  const versao: MinhaVersaoContrato | undefined = versoesQuery.data?.[0];
  const assinatura: MinhaAssinatura | undefined = useMemo(
    () => assinaturasQuery.data?.find((a) => a.contrato_versao_id === versao?.id),
    [assinaturasQuery.data, versao],
  );

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['motorista-app', 'contrato-versoes'] });
    qc.invalidateQueries({ queryKey: ['motorista-app', 'contrato-assinaturas'] });
  };

  const visualizar = useMutation({ mutationFn: marcarVersaoVisualizada, onSuccess: invalidar });
  const assinar = useMutation({
    mutationFn: async () => {
      const { data } = await supabase.auth.getUser();
      return assinarMeuContrato(assinatura!.id, data.user?.email ?? undefined);
    },
    onSuccess: invalidar,
  });
  const recusar = useMutation({
    mutationFn: () => recusarMeuContrato(assinatura!.id, motivo.trim()),
    onSuccess: () => {
      setRecusando(false);
      setMotivo('');
      invalidar();
    },
  });

  const html = useMemo(() => (versao?.corpo ? markdownParaHtml(versao.corpo) : ''), [versao?.corpo]);

  if (versoesQuery.isLoading || !versao) return null; // sem documento compartilhado — seção não aparece

  const pill = STATUS_PILL[versao.status] ?? { tom: 'neutro' as const, label: versao.status };
  const podeAssinar = versao.status === 'aguardando_assinatura' && assinatura && ['enviado', 'visualizado'].includes(assinatura.status);
  const jaAssinou = assinatura && ['assinado', 'aceito'].includes(assinatura.status);
  const recusou = assinatura?.status === 'recusado';

  const abrirDocumento = () => {
    const proximo = !aberto;
    setAberto(proximo);
    if (proximo && assinatura?.status === 'enviado') visualizar.mutate(assinatura.id);
  };

  return (
    <Secao titulo="Documento do contrato" acao={<Pill tom={pill.tom}>{pill.label}</Pill>}>
      {versao.status === 'aguardando_assinatura' && !jaAssinou && !recusou && (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          <FileSignature className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Contrato aguardando sua assinatura. Leia o documento inteiro antes de aceitar.</p>
        </div>
      )}
      {jaAssinou && (
        <p className="mb-3 text-sm text-neutral-500">
          Você assinou em {assinatura?.assinado_em ? new Date(assinatura.assinado_em).toLocaleDateString('pt-BR') : '—'}.
        </p>
      )}
      {recusou && (
        <p className="mb-3 text-sm text-neutral-500">
          Você recusou esta versão{assinatura?.motivo_recusa ? ` — motivo: ${assinatura.motivo_recusa}` : ''}. A locadora foi
          notificada e pode gerar uma nova versão.
        </p>
      )}

      <button
        type="button"
        onClick={abrirDocumento}
        className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-left text-sm font-medium text-sky-700 dark:border-white/10 dark:text-sky-400"
      >
        {aberto ? 'Ocultar documento' : `Ler o documento (${versao.rotulo ?? `v${versao.numero}`})`}
      </button>

      {aberto && (
        <div className="mt-3">
          {versao.congelada_em && (
            <p className="mb-2 flex items-center gap-1.5 text-[11px] text-neutral-400">
              <Lock className="h-3 w-3" /> Documento congelado — o conteúdo não muda depois do envio.
            </p>
          )}
          <div
            className="max-h-[60vh] overflow-y-auto rounded-lg border border-neutral-200 bg-white px-4 py-3 text-[13px] leading-relaxed text-neutral-800 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-200 [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-base [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-sm [&_h2]:font-bold [&_h3]:mb-1.5 [&_h3]:mt-3 [&_h3]:text-xs [&_h3]:font-bold [&_h3]:uppercase [&_hr]:my-3 [&_li]:ml-4 [&_li]:list-disc [&_p]:mb-2 [&_ul]:mb-2"
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {versao.hash_sha256 && (
            <p className="mt-2 break-all text-[10px] text-neutral-400">Código de integridade (SHA-256): {versao.hash_sha256}</p>
          )}
        </div>
      )}

      {podeAssinar && !recusando && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={assinar.isPending}
            onClick={() => assinar.mutate()}
            className="flex-1 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {assinar.isPending ? 'Registrando…' : 'Li e aceito — assinar'}
          </button>
          <button
            type="button"
            onClick={() => setRecusando(true)}
            className="rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-600 dark:border-white/10 dark:text-neutral-300"
          >
            Recusar
          </button>
        </div>
      )}
      {assinar.isError && <p className="mt-2 text-xs text-red-600">Não foi possível registrar a assinatura. Tente novamente.</p>}

      {(aditivosQuery.data ?? []).length > 0 && (
        <div className="mt-4 border-t border-neutral-100 pt-3 dark:border-white/5">
          <p className="mb-1.5 text-xs font-semibold text-neutral-500">Aditivos vigentes</p>
          {(aditivosQuery.data ?? []).map((a) => (
            <p key={a.id} className="py-0.5 text-xs text-neutral-600 dark:text-neutral-300">
              {ADITIVO_LABEL[a.tipo] ?? a.tipo} · {new Date(a.criado_em).toLocaleDateString('pt-BR')}
              {a.descricao ? ` — ${a.descricao}` : ''}
            </p>
          ))}
        </div>
      )}

      {(versoesQuery.data ?? []).length > 1 && (
        <div className="mt-3 border-t border-neutral-100 pt-3 dark:border-white/5">
          <p className="mb-1.5 text-xs font-semibold text-neutral-500">Versões do documento</p>
          {(versoesQuery.data ?? []).map((v) => (
            <p key={v.id} className="py-0.5 text-xs text-neutral-500">
              {v.rotulo ?? `v${v.numero}`} · {STATUS_PILL[v.status]?.label ?? v.status} · {new Date(v.criado_em).toLocaleDateString('pt-BR')}
            </p>
          ))}
        </div>
      )}

      {recusando && (
        <div className="mt-3 space-y-2">
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Explique o motivo da recusa (obrigatório)…"
            className="min-h-[80px] w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-white/10"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={motivo.trim().length < 5 || recusar.isPending}
              onClick={() => recusar.mutate()}
              className="flex-1 rounded-lg bg-red-600 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {recusar.isPending ? 'Enviando…' : 'Confirmar recusa'}
            </button>
            <button
              type="button"
              onClick={() => setRecusando(false)}
              className="rounded-lg border border-neutral-300 px-3 py-2.5 text-sm text-neutral-600 dark:border-white/10 dark:text-neutral-300"
            >
              Voltar
            </button>
          </div>
        </div>
      )}
    </Secao>
  );
}
