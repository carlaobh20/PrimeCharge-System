// GERADOR DE TERMOS (Fase 5, regras 15–16) — motor puro do snapshot ESTENDIDO usado pelos
// termos da biblioteca (entrega, devolução, seguro, sinistro, rescisão, aditivo...).
// Reusa montarSnapshot (base contrato/motorista/veículo/empresa) e acrescenta os namespaces
// operacionais. Campos de origem "informado no gerador" viram INPUTS dinâmicos no dialog —
// derivados do catálogo, nunca hard-coded na UI.
import { montarSnapshot } from './validacao';
import type { CondicoesContrato, EmpresaParaContrato, MotoristaParaContrato, VeiculoParaContrato } from './validacao';
import { CATALOGO_VARIAVEIS } from './variaveisCatalogo';
import { extrairVariaveis } from './lib';
import type { ContratoSeguro, ContratoRescisao } from './apiFase3';

const ROTULO_COBERTURA: Record<string, string> = {
  terceiros: 'danos a terceiros',
  roubo_furto: 'roubo/furto',
  colisao: 'colisão',
  incendio: 'incêndio',
};

function formatDataBR(iso: string | null | undefined): string {
  if (!iso) return '';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatBRL(v: number | null | undefined): string {
  return v != null ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
}

/** Aplica um valor manual num caminho com ponto do snapshot (cria os níveis que faltarem). */
function aplicarCaminho(obj: Record<string, unknown>, caminho: string, valor: string) {
  const partes = caminho.split('.');
  let atual: Record<string, unknown> = obj;
  for (let i = 0; i < partes.length - 1; i++) {
    if (typeof atual[partes[i]] !== 'object' || atual[partes[i]] === null) atual[partes[i]] = {};
    atual = atual[partes[i]] as Record<string, unknown>;
  }
  atual[partes[partes.length - 1]] = valor;
}

export type InsumosTermo = {
  empresa: EmpresaParaContrato;
  motorista: MotoristaParaContrato;
  veiculo: VeiculoParaContrato;
  condicoes: CondicoesContrato;
  template: { id: string; nome: string; versao_template: number };
  numeroContrato: string;
  localAssinatura?: string;
  seguro?: ContratoSeguro | null;
  vistoriaEntrega?: { criado_em: string; odometro_km: number | null; carga_pct: number | null } | null;
  vistoriaDevolucao?: { criado_em: string; odometro_km: number | null; carga_pct: number | null } | null;
  sinistro?: { tipo: string; data_ocorrencia: string; descricao: string | null } | null;
  multa?: { orgao_autuador: string; descricao: string; data_infracao: string; valor: number | null } | null;
  aditivo?: { tipo: string; descricao: string | null; criado_em: string } | null;
  rescisao?: ContratoRescisao | null;
  /** valores digitados no dialog para variáveis "informado no gerador" (caminho -> texto) */
  manuais?: Record<string, string>;
};

/** Snapshot estendido para termos — TUDO que os templates da biblioteca podem consumir. */
export function montarSnapshotTermo(i: InsumosTermo): Record<string, unknown> {
  const base = montarSnapshot({
    empresa: i.empresa,
    motorista: i.motorista,
    veiculo: i.veiculo,
    condicoes: i.condicoes,
    template: i.template,
    numeroContrato: i.numeroContrato,
    localAssinatura: i.localAssinatura,
    seguro: i.seguro ?? null,
  });

  const coberturas = i.seguro?.coberturas ?? {};
  const contratadas = Object.entries(coberturas)
    .filter(([, v]) => v === true)
    .map(([k]) => ROTULO_COBERTURA[k] ?? k);
  const excluidas = Object.entries(coberturas)
    .filter(([, v]) => v === false)
    .map(([k]) => ROTULO_COBERTURA[k] ?? k);

  const snapshot: Record<string, unknown> = {
    ...base,
    seguro: {
      ...(base.seguro as Record<string, unknown>),
      coberturas: contratadas.join('; '),
      exclusoes: excluidas.join('; '),
      assistencia: i.seguro?.assistencia ?? '',
    },
    entrega: {
      data: formatDataBR(i.vistoriaEntrega?.criado_em),
      km: i.vistoriaEntrega?.odometro_km != null ? i.vistoriaEntrega.odometro_km.toLocaleString('pt-BR') : '',
      bateria_pct: i.vistoriaEntrega?.carga_pct != null ? String(i.vistoriaEntrega.carga_pct) : '',
      itens: '',
      avarias: '',
      observacoes: '',
    },
    devolucao: {
      data: formatDataBR(i.vistoriaDevolucao?.criado_em),
      km: i.vistoriaDevolucao?.odometro_km != null ? i.vistoriaDevolucao.odometro_km.toLocaleString('pt-BR') : '',
      bateria_pct: i.vistoriaDevolucao?.carga_pct != null ? String(i.vistoriaDevolucao.carga_pct) : '',
      itens: '',
      avarias: '',
      pendencias: '',
      observacoes: '',
    },
    sinistro: {
      tipo: i.sinistro?.tipo ?? '',
      data: formatDataBR(i.sinistro?.data_ocorrencia),
      descricao: i.sinistro?.descricao ?? '',
      documentos: '',
    },
    multa: {
      orgao: i.multa?.orgao_autuador ?? '',
      descricao: i.multa?.descricao ?? '',
      data: formatDataBR(i.multa?.data_infracao),
      valor: formatBRL(i.multa?.valor),
    },
    aditivo: {
      tipo: i.aditivo?.tipo ?? '',
      descricao: i.aditivo?.descricao ?? '',
      data: formatDataBR(i.aditivo?.criado_em),
      condicao_anterior: '',
      condicao_nova: '',
      data_efeito: '',
    },
    rescisao: {
      motivo: i.rescisao?.motivo ?? '',
      solicitante: i.rescisao?.solicitante ?? '',
      data: formatDataBR(i.rescisao?.criado_em),
      valores: i.rescisao
        ? Object.entries(i.rescisao.valores ?? {})
            .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'number' ? formatBRL(v) : v}`)
            .join('; ')
        : '',
    },
  };

  // valores manuais por cima (o operador informa o que o sistema não tem)
  for (const [caminho, valor] of Object.entries(i.manuais ?? {})) {
    if (valor !== '') aplicarCaminho(snapshot, caminho, valor);
  }
  return snapshot;
}

/** Variáveis do template cuja origem é "informado no gerador" — viram campos do dialog. */
export function variaveisManuais(templateCorpo: string): { caminho: string; descricao: string; exemplo: string }[] {
  return extrairVariaveis(templateCorpo)
    .filter((v) => CATALOGO_VARIAVEIS[v]?.origem.includes('informado no gerador'))
    .map((v) => ({ caminho: v, descricao: CATALOGO_VARIAVEIS[v].descricao, exemplo: CATALOGO_VARIAVEIS[v].exemplo }));
}
