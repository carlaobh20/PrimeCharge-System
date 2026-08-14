import type { EstagioTimeline, TimelineDeCrescimento } from './growthTimeline';

// Épico 3, Missão 1 — Roadmap Automático (terceira e última fatia da Missão 1).
//
// Decisão de arquitetura (registrada em 2026-08-09, ver relatório do dia): o brief original
// pedia "comparar estado atual vs. metas definidas". Já existe uma tabela `metas` (Dashboard/
// BOS), mas ela não tem uma coluna que diga qual meta é sobre frota — teria que adivinhar pelo
// texto do título, o que quebraria DEC-022 (nunca inventar um sinal que não existe no dado).
// Adicionar essa coluna numa tabela já usada por outra feature foi julgado desproporcional pra
// esta fatia (regra dos 3 — só cria estrutura nova quando existir consumidor real). Solução:
// o "objetivo" comparado aqui é o marco ESTRUTURAL da própria Timeline de Crescimento (1, 5,
// 10, 20...), não uma meta que o dono precisa comprometer com data/número — respeita o pedido
// explícito do Carlos de não travar a empresa num alvo fixo agora.
export type RoadmapAutomatico = {
  frotaAtual: number;
  /** Null quando a frota já passou de todos os marcos definidos (1000+). */
  proximoMarco: EstagioTimeline | null;
  veiculosFaltantes: number | null;
  capitalAdicionalNecessario: number | null;
  aumentoLucroMensalProjetado: number | null;
};

export function calcularRoadmapAutomatico(timeline: TimelineDeCrescimento): RoadmapAutomatico {
  const proximoMarco = timeline.estagios.find((e) => !e.jaAlcancado) ?? null;

  if (!proximoMarco) {
    return {
      frotaAtual: timeline.frotaAtual,
      proximoMarco: null,
      veiculosFaltantes: null,
      capitalAdicionalNecessario: null,
      aumentoLucroMensalProjetado: null,
    };
  }

  const veiculosFaltantes = proximoMarco.veiculos - timeline.frotaAtual;

  // Média por veículo derivada do próprio marco (capitalNecessario / veiculos) em vez de
  // recalcular — mesma proporção, um único lugar de verdade (o marco já é média × N).
  const capitalMedioPorVeiculo = proximoMarco.capitalNecessario === null ? null : proximoMarco.capitalNecessario / proximoMarco.veiculos;
  const lucroMedioMensalPorVeiculo =
    proximoMarco.lucroMensalProjetado === null ? null : proximoMarco.lucroMensalProjetado / proximoMarco.veiculos;

  return {
    frotaAtual: timeline.frotaAtual,
    proximoMarco,
    veiculosFaltantes,
    capitalAdicionalNecessario: capitalMedioPorVeiculo === null ? null : capitalMedioPorVeiculo * veiculosFaltantes,
    aumentoLucroMensalProjetado: lucroMedioMensalPorVeiculo === null ? null : lucroMedioMensalPorVeiculo * veiculosFaltantes,
  };
}
