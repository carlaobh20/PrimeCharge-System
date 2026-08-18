import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronLeft, FileText, Search, XCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { toast, extrairMensagemDeErro } from '@/shared/components/ui/toast';
import { formatDataSimples } from '@/shared/lib/format';
import { formatarMoedaInput, digitosParaReais } from '@/shared/lib/moedaInput';
import { cn } from '@/shared/lib/utils';
import { useCurrentUsuario } from '@/shared/hooks/useCurrentUsuario';
import { listMotoristas } from '@/features/motoristas/api/motoristas';
import { listVeiculos } from '@/features/frota/api/veiculos';
import { listContratos } from '../../api/contratos';
import { useCreateContrato } from '../../hooks/useContratos';
import type { ContratoPeriodicidade } from '../../types';
import { getEmpresaParaContrato } from '../api';
import { useGerarVersao, useTemplatesJuridico } from '../hooks';
import { renderarCorpo } from '../lib';
import { montarSnapshot, validarParaGeracao, type CondicoesContrato } from '../validacao';
import { DocumentoView } from '../components/DocumentoView';

// Wizard "Novo Contrato" (regras 5–13): motorista → veículo → condições → template → validação →
// geração. Só chega na geração quem passou SEM BLOQUEIO na validação; a geração monta o SNAPSHOT
// (fotografia dos dados), renderiza pelo motor único (renderarCorpo), calcula o hash e cria a
// versão v1 em rascunho — dali em diante o fluxo segue na tela do contrato.

const ETAPAS = ['Motorista', 'Veículo', 'Condições', 'Template', 'Validação', 'Geração'] as const;

type CondicoesForm = {
  valor_periodico: number;
  periodicidade: ContratoPeriodicidade;
  dia_vencimento: string;
  valor_caucao: number;
  data_inicio: string;
  data_fim_prevista: string;
  km_incluso: string;
  regras_especificas: string;
  endereco_sede: string;
};

export function NovoContratoJuridicoPage() {
  const navigate = useNavigate();
  const { data: usuario } = useCurrentUsuario();
  const empresaId = usuario?.empresa_id ?? undefined;

  const [etapa, setEtapa] = useState(0);
  const [buscaMotorista, setBuscaMotorista] = useState('');
  const [buscaVeiculo, setBuscaVeiculo] = useState('');
  const [motoristaId, setMotoristaId] = useState<string | null>(null);
  const [veiculoId, setVeiculoId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [cond, setCond] = useState<CondicoesForm>({
    valor_periodico: 0,
    periodicidade: 'semanal',
    dia_vencimento: '',
    valor_caucao: 0,
    data_inicio: new Date().toISOString().slice(0, 10),
    data_fim_prevista: '',
    km_incluso: '',
    regras_especificas: '',
    endereco_sede: '',
  });

  const motoristasQuery = useQuery({ queryKey: ['juridico', 'wizard', 'motoristas'], queryFn: () => listMotoristas() });
  const veiculosQuery = useQuery({ queryKey: ['juridico', 'wizard', 'veiculos'], queryFn: () => listVeiculos() });
  const contratosQuery = useQuery({ queryKey: ['juridico', 'wizard', 'contratos'], queryFn: () => listContratos() });
  const templatesQuery = useTemplatesJuridico();
  const empresaQuery = useQuery({
    queryKey: ['juridico', 'empresa', empresaId],
    queryFn: () => getEmpresaParaContrato(empresaId!),
    enabled: !!empresaId,
  });

  const criarContrato = useCreateContrato();
  const gerarVersao = useGerarVersao();

  const motorista = motoristasQuery.data?.find((m) => m.id === motoristaId) ?? null;
  const veiculo = veiculosQuery.data?.find((v) => v.id === veiculoId) ?? null;
  const template = templatesQuery.data?.find((t) => t.id === templateId) ?? null;
  const contratos = contratosQuery.data ?? [];

  const contratosDoMotorista = (id: string) => contratos.filter((c) => c.motorista_id === id);
  const contratoAtivoDoVeiculo = (id: string) => contratos.find((c) => c.veiculo_id === id && c.status === 'ativo');

  const condicoes: CondicoesContrato = useMemo(
    () => ({
      valor_periodico: cond.valor_periodico,
      periodicidade: cond.periodicidade,
      dia_vencimento: cond.dia_vencimento ? Number(cond.dia_vencimento) : null,
      valor_caucao: cond.valor_caucao || null,
      data_inicio: cond.data_inicio,
      data_fim_prevista: cond.data_fim_prevista || null,
      km_incluso: cond.km_incluso || null,
      regras_especificas: cond.regras_especificas || null,
    }),
    [cond],
  );

  const snapshot = useMemo(() => {
    if (!motorista || !veiculo || !template || !empresaQuery.data) return null;
    return montarSnapshot({
      empresa: {
        ...empresaQuery.data,
        endereco: cond.endereco_sede || empresaQuery.data.endereco || '',
      },
      motorista,
      veiculo,
      condicoes,
      template: { id: template.id, nome: template.nome, versao_template: template.versao_template },
    });
  }, [motorista, veiculo, template, empresaQuery.data, condicoes, cond.endereco_sede]);

  const validacao = useMemo(
    () =>
      validarParaGeracao({
        motorista,
        veiculo,
        condicoes,
        templateCorpo: template?.corpo ?? null,
        snapshot,
        veiculoTemContratoAtivo: veiculoId ? !!contratoAtivoDoVeiculo(veiculoId) : false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [motorista, veiculo, condicoes, template, snapshot, veiculoId, contratos],
  );

  const preview = useMemo(
    () => (template && snapshot ? renderarCorpo(template.corpo, snapshot) : ''),
    [template, snapshot],
  );

  const podeAvancar = [
    !!motorista,
    !!veiculo && !contratoAtivoDoVeiculo(veiculoId ?? ''),
    cond.valor_periodico > 0 && !!cond.data_inicio,
    !!template,
    validacao.podeGerar,
    false,
  ][etapa];

  const gerar = () => {
    if (!empresaId || !motorista || !veiculo || !template || !snapshot || !validacao.podeGerar) return;
    criarContrato.mutate(
      {
        empresaId,
        payload: {
          veiculo_id: veiculo.id,
          motorista_id: motorista.id,
          data_inicio: cond.data_inicio,
          data_fim_prevista: cond.data_fim_prevista || null,
          periodicidade: cond.periodicidade,
          valor_periodico: cond.valor_periodico,
          valor_caucao: cond.valor_caucao || null,
          km_inicial: null,
          carga_inicial_pct: null,
          observacoes: cond.regras_especificas || null,
          dia_vencimento: cond.dia_vencimento ? Number(cond.dia_vencimento) : null,
          data_reajuste: null,
          indice_reajuste: null,
          forma_pagamento: null,
          tipo_garantia: cond.valor_caucao ? 'caucao' : null,
          percentual_multa_atraso: null,
          percentual_juros_atraso: null,
        },
      },
      {
        onSuccess: (contrato) => {
          gerarVersao.mutate(
            { empresaId, contratoId: contrato.id, templateId: template.id, templateCorpo: template.corpo, snapshot },
            {
              onSuccess: () => {
                toast.success('Contrato criado e v1.0 gerada', 'Documento em rascunho — siga para revisão.');
                navigate(`/juridico/contratos/${contrato.id}`);
              },
              onError: (e) => toast.error('Contrato criado, mas a versão falhou', extrairMensagemDeErro(e)),
            },
          );
        },
        onError: (e) => toast.error('Não foi possível criar o contrato', extrairMensagemDeErro(e)),
      },
    );
  };

  const gerando = criarContrato.isPending || gerarVersao.isPending;

  return (
    <div className="p-8">
      <Link to="/juridico" className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
        <ChevronLeft className="h-4 w-4" /> Jurídico
      </Link>
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Novo contrato</h1>
      <p className="mt-1 text-sm text-neutral-500">Do motorista à versão v1.0 do documento — com validação antes de gerar.</p>

      {/* Trilho de etapas */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {ETAPAS.map((nome, i) => (
          <button
            key={nome}
            type="button"
            disabled={i > etapa}
            onClick={() => i < etapa && setEtapa(i)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              i === etapa
                ? 'bg-emerald-600 text-white'
                : i < etapa
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800',
            )}
          >
            {i < etapa && <Check className="h-3 w-3" />}
            {i + 1}. {nome}
          </button>
        ))}
      </div>

      <div className="mt-6 max-w-4xl">
        {/* ===== Etapa 1 — Motorista ===== */}
        {etapa === 0 && (
          <div>
            <div className="relative mb-3 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input value={buscaMotorista} onChange={(e) => setBuscaMotorista(e.target.value)} placeholder="Buscar por nome ou CPF…" className="pl-9" />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {(motoristasQuery.data ?? [])
                .filter((m) => {
                  const t = buscaMotorista.trim().toLowerCase();
                  return !t || m.nome_completo.toLowerCase().includes(t) || m.cpf.includes(t);
                })
                .map((m) => {
                  const elegivel = m.status === 'ativo' && !!m.cnh_numero;
                  const meus = contratosDoMotorista(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={!elegivel}
                      onClick={() => {
                        setMotoristaId(m.id);
                        setEtapa(1);
                      }}
                      className={cn(
                        'rounded-lg border px-4 py-3 text-left transition-colors',
                        motoristaId === m.id
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900',
                        !elegivel && 'cursor-not-allowed opacity-50',
                      )}
                    >
                      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{m.nome_completo}</p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        CPF {m.cpf} · CNH {m.cnh_numero ?? 'não cadastrada'}
                        {m.cnh_validade && ` (val. ${formatDataSimples(m.cnh_validade)})`} · {m.status}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-400">
                        {meus.length === 0 ? 'Sem contratos' : `${meus.length} contrato(s) — ${meus.filter((c) => c.status === 'ativo').length} ativo(s)`}
                      </p>
                      {!elegivel && (
                        <p className="mt-1 text-[11px] font-medium text-amber-600">
                          {m.status !== 'ativo' ? `Indisponível: status "${m.status}"` : 'Indisponível: sem CNH no cadastro'}
                        </p>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* ===== Etapa 2 — Veículo ===== */}
        {etapa === 1 && (
          <div>
            <div className="relative mb-3 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input value={buscaVeiculo} onChange={(e) => setBuscaVeiculo(e.target.value)} placeholder="Buscar por placa…" className="pl-9" />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {(veiculosQuery.data ?? [])
                .filter((v) => {
                  const t = buscaVeiculo.trim().toLowerCase();
                  return !t || v.placa.toLowerCase().includes(t);
                })
                .map((v) => {
                  const ocupado = contratoAtivoDoVeiculo(v.id);
                  const bloqueado = ['manutencao', 'venda', 'encerrado'].includes(v.status) || !!ocupado;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={bloqueado}
                      onClick={() => {
                        setVeiculoId(v.id);
                        setEtapa(2);
                      }}
                      className={cn(
                        'rounded-lg border px-4 py-3 text-left transition-colors',
                        veiculoId === v.id
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900',
                        bloqueado && 'cursor-not-allowed opacity-50',
                      )}
                    >
                      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                        {v.marca?.nome} {v.modelo?.nome} · {v.placa}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {v.ano_fabricacao}/{v.ano_modelo} · {v.quilometragem.toLocaleString('pt-BR')} km · {v.status}
                      </p>
                      {bloqueado && (
                        <p className="mt-1 text-[11px] font-medium text-amber-600">
                          {ocupado ? 'Indisponível: já tem contrato ativo' : `Indisponível: ${v.status}`}
                        </p>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* ===== Etapa 3 — Condições ===== */}
        {etapa === 2 && (
          <Card>
            <CardContent className="grid gap-4 py-5 md:grid-cols-2">
              <div>
                <Label>Valor por período (R$)</Label>
                <Input
                  inputMode="numeric"
                  className="mt-1 text-right"
                  value={formatarMoedaInput(cond.valor_periodico)}
                  onChange={(e) => setCond((c) => ({ ...c, valor_periodico: digitosParaReais(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Periodicidade</Label>
                <Select value={cond.periodicidade} onChange={(e) => setCond((c) => ({ ...c, periodicidade: e.target.value as ContratoPeriodicidade }))} className="mt-1">
                  <option value="diaria">Diária</option>
                  <option value="semanal">Semanal</option>
                  <option value="mensal">Mensal</option>
                </Select>
              </div>
              <div>
                <Label>Dia de vencimento (opcional)</Label>
                <Input type="number" min={1} max={31} className="mt-1" value={cond.dia_vencimento} onChange={(e) => setCond((c) => ({ ...c, dia_vencimento: e.target.value }))} />
              </div>
              <div>
                <Label>Caução (R$)</Label>
                <Input
                  inputMode="numeric"
                  className="mt-1 text-right"
                  value={formatarMoedaInput(cond.valor_caucao)}
                  onChange={(e) => setCond((c) => ({ ...c, valor_caucao: digitosParaReais(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Data de início</Label>
                <Input type="date" className="mt-1" value={cond.data_inicio} onChange={(e) => setCond((c) => ({ ...c, data_inicio: e.target.value }))} />
              </div>
              <div>
                <Label>Data de término (opcional)</Label>
                <Input type="date" className="mt-1" value={cond.data_fim_prevista} onChange={(e) => setCond((c) => ({ ...c, data_fim_prevista: e.target.value }))} />
              </div>
              <div>
                <Label>Quilometragem (regra, opcional)</Label>
                <Input className="mt-1" placeholder='Ex.: "livre" ou "3.000 km/mês"' value={cond.km_incluso} onChange={(e) => setCond((c) => ({ ...c, km_incluso: e.target.value }))} />
              </div>
              <div>
                <Label>Endereço da sede (LOCADORA)</Label>
                <Input
                  className="mt-1"
                  placeholder={empresaQuery.data?.endereco ?? 'Rua, nº, cidade/UF'}
                  value={cond.endereco_sede}
                  onChange={(e) => setCond((c) => ({ ...c, endereco_sede: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Regras específicas (opcional)</Label>
                <Textarea className="mt-1" placeholder="Condições particulares deste contrato…" value={cond.regras_especificas} onChange={(e) => setCond((c) => ({ ...c, regras_especificas: e.target.value }))} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== Etapa 4 — Template ===== */}
        {etapa === 3 && (
          <div className="grid gap-2 md:grid-cols-2">
            {(templatesQuery.data ?? []).filter((t) => t.status === 'publicado').length === 0 && (
              <div className="md:col-span-2 rounded-lg border border-dashed border-neutral-300 p-6 text-sm text-neutral-500 dark:border-neutral-700">
                Nenhum template publicado.{' '}
                <Link to="/juridico/templates" className="font-medium text-emerald-600 hover:underline">
                  Crie o Contrato Master em Templates
                </Link>{' '}
                e publique-o para poder gerar contratos.
              </div>
            )}
            {(templatesQuery.data ?? [])
              .filter((t) => t.status === 'publicado')
              .map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTemplateId(t.id);
                    setEtapa(4);
                  }}
                  className={cn(
                    'rounded-lg border px-4 py-3 text-left transition-colors',
                    templateId === t.id
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900',
                  )}
                >
                  <p className="flex items-center gap-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    <FileText className="h-4 w-4 text-emerald-600" /> {t.nome}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Template v{t.versao_template} · {t.tipo} · atualizado {formatDataSimples(t.atualizado_em)}
                  </p>
                  {t.descricao && <p className="mt-1 text-xs text-neutral-400">{t.descricao}</p>}
                </button>
              ))}
          </div>
        )}

        {/* ===== Etapa 5 — Validação ===== */}
        {etapa === 4 && (
          <Card>
            <CardContent className="py-5">
              <div className="space-y-1.5">
                {validacao.itens.map((item, i) => (
                  <div key={`${item.rotulo}-${i}`} className="flex items-start gap-2 text-sm">
                    {item.nivel === 'ok' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />}
                    {item.nivel === 'alerta' && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}
                    {item.nivel === 'bloqueio' && <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />}
                    <div>
                      <span className="font-medium text-neutral-800 dark:text-neutral-200">{item.rotulo}</span>
                      {item.detalhe && <span className="text-neutral-500"> — {item.detalhe}</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div
                className={cn(
                  'mt-4 rounded-lg px-4 py-3 text-sm font-medium',
                  validacao.podeGerar
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                    : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
                )}
              >
                {validacao.podeGerar
                  ? `Pronto para gerar${validacao.alertas.length > 0 ? ` — ${validacao.alertas.length} alerta(s) acima ficam registrados` : ''}.`
                  : `${validacao.bloqueios.length} bloqueio(s) impedem a geração. Corrija e volte.`}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== Etapa 6 — Geração/Pré-visualização ===== */}
        {etapa === 5 && template && snapshot && (
          <div>
            <DocumentoView corpo={preview} congelada={false} templateAprovado={false} />
            <div className="mt-4 flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <p className="text-sm text-neutral-500">
                Ao gerar: contrato criado em rascunho + versão <span className="font-medium">v1.0</span> com snapshot e hash SHA-256.
              </p>
              <Button disabled={gerando || !validacao.podeGerar} onClick={gerar}>
                {gerando ? 'Gerando…' : 'Criar contrato e gerar v1.0'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Navegação */}
      <div className="mt-6 flex max-w-4xl items-center justify-between">
        <Button variant="outline" disabled={etapa === 0} onClick={() => setEtapa((e) => Math.max(0, e - 1))}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        {etapa < 5 && (
          <Button disabled={!podeAvancar} onClick={() => setEtapa((e) => Math.min(5, e + 1))}>
            Avançar <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
