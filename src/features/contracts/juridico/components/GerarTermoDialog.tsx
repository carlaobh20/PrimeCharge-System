import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FilePlus2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Dialog } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import { toast, extrairMensagemDeErro } from '@/shared/components/ui/toast';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { uploadArquivo } from '@/shared/capabilities/api/arquivos';
import { getMotorista } from '@/features/motoristas/api/motoristas';
import { getVeiculo } from '@/features/frota/api/veiculos';
import type { ContratoComRelacoes } from '../../types';
import { useTemplatesJuridico } from '../hooks';
import { useFichaJuridica, useTodasRevisoes } from '../hooksFase3';
import { getEmpresaParaContrato } from '../api';
import { templateAprovadoJuridicamente } from '../apiFase3';
import { montarSnapshotTermo, variaveisManuais } from '../termos';
import { renderarCorpo, hashCorpo, variaveisFaltando } from '../lib';
import { CATALOGO_VARIAVEIS } from '../variaveisCatalogo';
import { BIBLIOTECA } from '../biblioteca';
import { gerarPdfContrato } from '../pdf';
import { useAditivos } from '../hooks';
import { DocumentoView } from '../components/DocumentoView';

// GERAR TERMO (Fase 15/16): escolhe uma minuta da biblioteca (não-contrato) → o sistema monta o
// snapshot estendido com o que JÁ EXISTE (contrato, seguro, vistorias, aditivo, rescisão) → os
// campos "informado no gerador" viram inputs dinâmicos derivados do CATÁLOGO → checklist separa
// ERROS BLOQUEANTES (variável obrigatória faltante) de ALERTAS (opcional vazia) → preview →
// PDF real arquivado nos Anexos (timeline via trigger 0045). Nada com variável faltante crítica.
export function GerarTermoDialog({
  open,
  onOpenChange,
  contrato,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contrato: ContratoComRelacoes;
}) {
  const { data: usuario } = useCurrentUsuario();
  const empresaId = usuario?.empresa_id ?? undefined;
  const { data: templates } = useTemplatesJuridico();
  const { data: revisoes } = useTodasRevisoes();
  const ficha = useFichaJuridica(open ? contrato.id : undefined);
  const { data: aditivos } = useAditivos(open ? contrato.id : undefined);

  const [templateId, setTemplateId] = useState('');
  const [manuais, setManuais] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<string | null>(null);

  const termos = (templates ?? []).filter((t) => t.tipo !== 'contrato' && t.status !== 'arquivado');
  const template = termos.find((t) => t.id === templateId) ?? null;

  const dadosBase = useQuery({
    queryKey: ['juridico', 'termo-base', contrato.id],
    enabled: open,
    queryFn: async () => {
      const [motorista, veiculo, empresa] = await Promise.all([
        getMotorista(contrato.motorista_id),
        getVeiculo(contrato.veiculo_id),
        getEmpresaParaContrato(empresaId!),
      ]);
      return { motorista, veiculo, empresa };
    },
  });

  const snapshot = useMemo(() => {
    if (!template || !dadosBase.data) return null;
    const vistorias = ficha.data?.vistorias ?? [];
    return montarSnapshotTermo({
      empresa: dadosBase.data.empresa,
      motorista: dadosBase.data.motorista,
      veiculo: dadosBase.data.veiculo,
      condicoes: {
        valor_periodico: contrato.valor_periodico,
        periodicidade: contrato.periodicidade,
        dia_vencimento: contrato.dia_vencimento,
        valor_caucao: contrato.valor_caucao,
        data_inicio: contrato.data_inicio,
        data_fim_prevista: contrato.data_fim_prevista,
        km_incluso: null,
        regras_especificas: contrato.observacoes,
      },
      template: { id: template.id, nome: template.nome, versao_template: template.versao_template },
      numeroContrato: contrato.id.slice(0, 8).toUpperCase(),
      seguro: ficha.data?.seguros?.[0] ?? null,
      vistoriaEntrega: vistorias.find((v) => v.tipo === 'entrega') ?? null,
      vistoriaDevolucao: vistorias.find((v) => v.tipo === 'devolucao') ?? null,
      sinistro: ficha.data?.sinistros?.[0] ?? null,
      multa: ficha.data?.multas?.[0]
        ? { orgao_autuador: ficha.data.multas[0].orgao_autuador, descricao: ficha.data.multas[0].descricao, data_infracao: ficha.data.multas[0].data_infracao, valor: ficha.data.multas[0].valor }
        : null,
      aditivo: (aditivos ?? [])[0] ?? null,
      rescisao: ficha.data?.rescisoes?.find((r) => !['cancelada'].includes(r.status)) ?? null,
      manuais,
    });
  }, [template, dadosBase.data, ficha.data, aditivos, contrato, manuais]);

  const camposManuais = useMemo(() => (template ? variaveisManuais(template.corpo) : []), [template]);

  const { bloqueantes, alertas, travas } = useMemo(() => {
    if (!template || !snapshot) return { bloqueantes: [] as string[], alertas: [] as string[], travas: [] as string[] };
    const faltando = variaveisFaltando(template.corpo, snapshot);
    // TRAVA OPERACIONAL (Fase 6): documento cujo ASSUNTO não existe no contrato não é emitido
    // (ex.: termo de seguro sem apólice, comunicação sem sinistro). Definida no registro da
    // biblioteca (exigeDados) — não é regra jurídica, é impedir documento vazio de si mesmo.
    const entrada = BIBLIOTECA.find((e) => e.nome === template.nome);
    const resolver = (caminho: string): unknown =>
      caminho.split('.').reduce<unknown>((acc, k) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[k] : undefined), snapshot);
    const travas = (entrada?.exigeDados ?? [])
      .filter(({ caminho }) => {
        const v = resolver(caminho);
        return v === undefined || v === null || v === '';
      })
      .map(({ motivo }) => motivo);
    return {
      bloqueantes: faltando.filter((v) => CATALOGO_VARIAVEIS[v]?.obrigatoria !== false),
      alertas: faltando.filter((v) => CATALOGO_VARIAVEIS[v]?.obrigatoria === false),
      travas,
    };
  }, [template, snapshot]);

  const gerar = useMutation({
    mutationFn: async () => {
      if (!template || !snapshot || bloqueantes.length > 0 || travas.length > 0) throw new Error('Há erros bloqueantes.');
      const corpo = renderarCorpo(template.corpo, snapshot);
      const hash = await hashCorpo(corpo);
      const aprovado = templateAprovadoJuridicamente(
        (revisoes ?? []).filter((r) => r.template_id === template.id),
        template.versao_template,
      );
      const blob = await gerarPdfContrato({
        numeroContrato: contrato.id.slice(0, 8).toUpperCase(),
        rotuloVersao: `template v${template.versao_template}`,
        statusVersao: aprovado ? 'Versão oficial' : 'Minuta',
        hashSha256: hash,
        corpo,
        nomeMotorista: contrato.motorista?.nome_completo ?? '—',
        placaVeiculo: contrato.veiculo?.placa ?? '—',
        geradoEm: new Date().toISOString(),
        templateAprovado: aprovado,
        tituloDocumento: template.nome,
      });
      const nome = `${template.nome.replace(/[^\w-]+/g, '_')}-${contrato.id.slice(0, 8)}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nome;
      a.click();
      URL.revokeObjectURL(url);
      await uploadArquivo({
        bucket: 'contratos-arquivos',
        empresaId: empresaId!,
        entidadeTipo: 'contrato',
        entidadeId: contrato.id,
        categoria: template.tipo,
        usuarioId: usuario?.id,
        file: new File([blob], nome, { type: 'application/pdf' }),
      });
      return nome;
    },
    onSuccess: (nome) => {
      toast.success('Termo gerado', `${nome} baixado e arquivado nos Anexos (com evento na timeline).`);
      onOpenChange(false);
      setPreview(null);
      setManuais({});
      setTemplateId('');
    },
    onError: (e) => toast.error('Não foi possível gerar', extrairMensagemDeErro(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Gerar termo da biblioteca" description="O documento usa os dados reais do contrato; campos operacionais são informados abaixo. Variável obrigatória faltante BLOQUEIA." className="max-w-4xl">
      <div className="space-y-3">
        <div className="max-w-md">
          <Label>Documento</Label>
          <Select className="mt-1" value={templateId} onChange={(e) => { setTemplateId(e.target.value); setPreview(null); }}>
            <option value="">— selecionar —</option>
            {termos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome} (v{t.versao_template})
              </option>
            ))}
          </Select>
        </div>

        {template && camposManuais.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">Campos informados na geração</p>
            <div className="grid gap-2 md:grid-cols-2">
              {camposManuais.map((c) => (
                <div key={c.caminho}>
                  <Label className="text-xs">{c.descricao}</Label>
                  <Input
                    className="mt-0.5 h-8 text-xs"
                    placeholder={c.exemplo}
                    value={manuais[c.caminho] ?? ''}
                    onChange={(e) => setManuais((m) => ({ ...m, [c.caminho]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {template && (
          <div className="space-y-1 rounded-lg border border-neutral-200 px-3 py-2 text-xs dark:border-neutral-800">
            {travas.length > 0 && (
              <p className="text-red-600">
                <span className="font-semibold">DOCUMENTO NÃO EMITÍVEL:</span> {travas.join(' ')}
              </p>
            )}
            {bloqueantes.length > 0 && (
              <p className="text-red-600">
                <span className="font-semibold">ERROS BLOQUEANTES:</span>{' '}
                {bloqueantes.map((v) => CATALOGO_VARIAVEIS[v]?.descricao ?? v).join('; ')}
              </p>
            )}
            {alertas.length > 0 && (
              <p className="text-amber-600">
                <span className="font-semibold">ALERTAS (saem [SEM VALOR] visível):</span>{' '}
                {alertas.map((v) => CATALOGO_VARIAVEIS[v]?.descricao ?? v).join('; ')}
              </p>
            )}
            {travas.length === 0 && bloqueantes.length === 0 && alertas.length === 0 && <p className="text-emerald-600">Todos os dados presentes.</p>}
          </div>
        )}

        {preview !== null && <DocumentoView corpo={preview} congelada={false} templateAprovado={false} />}

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={!template || !snapshot}
            onClick={() => setPreview(template && snapshot ? renderarCorpo(template.corpo, snapshot) : null)}
          >
            Pré-visualizar
          </Button>
          <Button disabled={!template || !snapshot || bloqueantes.length > 0 || travas.length > 0 || gerar.isPending || dadosBase.isLoading} onClick={() => gerar.mutate()}>
            <FilePlus2 className="h-4 w-4" aria-hidden /> {gerar.isPending ? 'Gerando…' : 'Gerar PDF e arquivar'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
