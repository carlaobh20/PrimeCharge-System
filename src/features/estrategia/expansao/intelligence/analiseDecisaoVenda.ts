import { simularMomentoDeVenda, type CenarioDecisaoVenda, type ResultadoMomentoDeVenda } from './comparadorMomentosDeVenda';

// Épico 10 — Fase 2. Transforma "qual mês de venda produz maior patrimônio?" (Fase 1) em "qual
// decisão de renovação produz maior patrimônio E POR QUÊ?" — tudo construído EM CIMA da Fase 1
// (`simularMomentoDeVenda`, já validado 63/63), sem duplicar o motor: reconciliação e
// decomposição são derivadas dos campos que a Fase 1 já calcula (`meses[]`/`eventos[]`), não uma
// segunda implementação da mesma matemática.
//
// PROVA MATEMÁTICA CENTRAL DESTE ARQUIVO (item 8 do brief — "o motor precisa identificar
// quantitativamente o peso de cada fator", não uma atribuição inventada):
//
// O "efeito líquido de venda" sobre o PATRIMÔNIO (não o caixa) é:
//   caixa: +liquido = +(valorVenda − saldoDevedor − custosVenda)
//   equity: −(valorAtivo − saldoDevedor)  [o veículo vendido sai do pool de equity]
//   soma:    valorVenda − saldoDevedor − custosVenda − valorAtivo + saldoDevedor
//          = valorVenda − custosVenda − valorAtivo
// O saldoDevedor CANCELA EXATAMENTE. Ou seja: o impacto da venda EM SI sobre o patrimônio não
// depende de quanto da dívida já foi amortizada — é uma constante do cenário (valorVenda,
// vendaCustosPct e precoVeiculo não mudam com o mês escolhido). O momento da venda não muda
// "quanto patrimônio a venda gera" — muda "quanto CAIXA a venda libera" (saldo devedor menor =
// mais caixa livre), o que por sua vez afeta quanto pode ser reinvestido. Essa é a resposta
// rigorosa ao item 8: o "Fator B" (venda liberou capital) tem efeito patrimonial DIRETO igual a
// zero; seu efeito é indireto, via Fator C/D (reinvestimento). Ver `testarCausalidade` abaixo,
// que usa exatamente esta identidade (validada numericamente no script de validação).
//
// A mesma lógica prova que AMORTIZAÇÃO e a ENTRADA de uma nova compra são patrimonialmente
// neutras (dinheiro só muda de "bucket": caixa ⇄ equity, 1:1) — por isso não aparecem como termos
// na reconciliação do item 6: seu efeito líquido em Δpatrimônio é sempre 0, matematicamente.

const EPS = 1;

// ---------------------------------------------------------------------------------------------
// 6. RECONCILIAÇÃO PATRIMONIAL (item 6 do brief)
// ---------------------------------------------------------------------------------------------

export type ReconciliacaoMensal = {
  mes: number;
  patrimonioInicial: number;
  patrimonioFinal: number;
  deltaPatrimonio: number;
  /** Receita − custos operacionais. NUNCA inclui juros (corrige a Fase 1 — ver nota no relatório
   * de entrega: `retornoOperacionalAcumulado` da Fase 1 misturava operação e financiamento). */
  resultadoOperacional: number;
  /** −jurosDoMes: custo financeiro, separado do operacional (item 4.3 do brief). */
  resultadoFinanceiro: number;
  /** Sempre 0 nesta fase — não é "não sabemos calcular", é uma PREMISSA explícita: o valor do
   * ativo é fixo (`cenario.precoVeiculo`) porque não há curva de depreciação modelada (fora de
   * escopo desde a Fase 1). Documentado, não inventado. */
  variacaoEconomicaDoAtivo: number;
  /** Só != 0 no(s) mês(es) com evento de venda: valorVenda − custosVenda − precoVeiculo (ver
   * prova matemática no cabeçalho do arquivo — não depende do saldo devedor). */
  efeitoLiquidoDeVenda: number;
  /** Resíduo da identidade — deve ficar ~0 (dentro de EPS). Se não ficar, é sinal de um termo
   * real não capturado pelos 4 anteriores; o motor NUNCA absorve isso silenciosamente num dos
   * outros campos (DEC-022 aplicado à própria matemática, não só a dado de veículo). */
  outrosEfeitos: number;
  identidadeFechou: boolean;
};

export function reconciliarPatrimonioMensal(cenario: CenarioDecisaoVenda, resultado: ResultadoMomentoDeVenda): ReconciliacaoMensal[] {
  const linhas: ReconciliacaoMensal[] = [];
  for (let i = 0; i < resultado.meses.length; i++) {
    const m = resultado.meses[i];
    // ACHADO da validação (não um bug do motor — uma sutileza da reconciliação): o motor nunca
    // debita `cenario.entrada` do caixa para o veículo ORIGINAL (ele já é seu, antes do mês 0 —
    // só o reinvestimento debita entrada explicitamente). Mas a equity dele (precoVeiculo −
    // valorFinanciado = entrada) já entra no cálculo desde o mês 0. Ou seja, a entrada já foi
    // "gasta" antes da janela desta simulação, e o que ela comprou (entrada de equity no carro)
    // já está contado no mês 0. Por isso o patrimônio de referência ANTES do mês 0 é `entrada`
    // (o que você já tinha investido no carro), não 0 — testado explicitamente: com essa base, a
    // identidade fecha em todos os meses; com 0, sobra um resíduo de exatamente `entrada` só no
    // mês 0. Mesma convenção já usada em `crescimentoPatrimonialMultiplo` (Fase 1).
    const patrimonioInicial = i === 0 ? cenario.entrada : resultado.meses[i - 1].patrimonio;
    const deltaPatrimonio = m.patrimonio - patrimonioInicial;
    const resultadoOperacional = m.receita - m.custosOperacionais;
    const resultadoFinanceiro = -m.jurosDoMes;
    const variacaoEconomicaDoAtivo = 0;
    const eventosVendaNoMes = resultado.eventos.filter((e) => e.tipo === 'venda' && e.mes === m.mes);
    const efeitoLiquidoDeVenda = eventosVendaNoMes.reduce((s, e) => (e.tipo === 'venda' ? s + (e.valorVenda - e.custosVenda - cenario.precoVeiculo) : s), 0);
    const outrosEfeitos = deltaPatrimonio - resultadoOperacional - resultadoFinanceiro - variacaoEconomicaDoAtivo - efeitoLiquidoDeVenda;
    linhas.push({
      mes: m.mes,
      patrimonioInicial,
      patrimonioFinal: m.patrimonio,
      deltaPatrimonio,
      resultadoOperacional,
      resultadoFinanceiro,
      variacaoEconomicaDoAtivo,
      efeitoLiquidoDeVenda,
      outrosEfeitos,
      identidadeFechou: Math.abs(outrosEfeitos) < EPS,
    });
  }
  return linhas;
}

// ---------------------------------------------------------------------------------------------
// 7. DECOMPOSIÇÃO DE UM MOMENTO DE VENDA (item 7 do brief)
// ---------------------------------------------------------------------------------------------

export type DecomposicaoVenda = {
  mesVenda: number;
  patrimonioAntesDaVenda: number;
  saldoDevedor: number;
  valorVenda: number;
  capitalLiquido: number;
  /** Caixa imediatamente após a venda, ANTES de qualquer reinvestimento ou da operação do
   * próprio mês — isola o efeito puro da transação de venda no caixa. */
  caixaImediatamenteAposVenda: number;
  quantidadeNovosVeiculos: number;
  /** patrimonioFinal(reinvestir=true) − patrimonioFinal(reinvestir=false), rodando o MESMO mês
   * de venda com e sem reinvestimento — isola exatamente quanto do patrimônio final veio dos
   * veículos novos (não uma estimativa, é a diferença real entre 2 simulações). */
  patrimonioGeradoPelosNovosVeiculos: number;
  patrimonioFinal: number;
};

export function decomporMomentoDeVenda(cenario: CenarioDecisaoVenda, mesVenda: number): DecomposicaoVenda {
  const comReinvestimento = simularMomentoDeVenda(cenario, mesVenda, true);
  const semReinvestimento = simularMomentoDeVenda(cenario, mesVenda, false);
  const eventoVenda = comReinvestimento.eventos.find((e) => e.tipo === 'venda' && e.mes === mesVenda);
  if (!eventoVenda || eventoVenda.tipo !== 'venda') throw new Error(`Nenhum evento de venda no mês ${mesVenda} — mesVenda fora do horizonte?`);

  const caixaAntesDoMes = mesVenda === 0 ? 0 : comReinvestimento.meses[mesVenda - 1].caixa;
  const patrimonioAntesDaVenda = mesVenda === 0 ? 0 : comReinvestimento.meses[mesVenda - 1].patrimonio;
  const quantidadeNovosVeiculos = comReinvestimento.eventos.filter((e) => e.tipo === 'reinvestimento' && e.mes === mesVenda).length;

  return {
    mesVenda,
    patrimonioAntesDaVenda,
    saldoDevedor: eventoVenda.saldoDevedor,
    valorVenda: eventoVenda.valorVenda,
    capitalLiquido: eventoVenda.liquido,
    caixaImediatamenteAposVenda: caixaAntesDoMes + eventoVenda.liquido,
    quantidadeNovosVeiculos,
    patrimonioGeradoPelosNovosVeiculos: comReinvestimento.patrimonioFinalNoHorizonte - semReinvestimento.patrimonioFinalNoHorizonte,
    patrimonioFinal: comReinvestimento.patrimonioFinalNoHorizonte,
  };
}

export type DiferencaDecomposicao = {
  mesA: number;
  mesB: number;
  diferencaCaixa: number;
  diferencaEquity: number;
  diferencaDivida: number;
  diferencaFrota: number;
  diferencaReceita: number;
  diferencaCustos: number;
  diferencaJuros: number;
  diferencaPatrimonio: number;
};

export function compararDoisMomentos(cenario: CenarioDecisaoVenda, mesA: number, mesB: number): DiferencaDecomposicao {
  const a = simularMomentoDeVenda(cenario, mesA, true);
  const b = simularMomentoDeVenda(cenario, mesB, true);
  return {
    mesA,
    mesB,
    diferencaCaixa: b.caixaFinal - a.caixaFinal,
    diferencaEquity: b.equityFinal - a.equityFinal,
    diferencaDivida: b.meses[b.meses.length - 1].saldoDevedor - a.meses[a.meses.length - 1].saldoDevedor,
    diferencaFrota: b.frotaFinalUnidades - a.frotaFinalUnidades,
    diferencaReceita: b.receitaAcumulada - a.receitaAcumulada,
    diferencaCustos: b.custosOperacionaisAcumulados - a.custosOperacionaisAcumulados,
    diferencaJuros: b.jurosAcumulados - a.jurosAcumulados,
    diferencaPatrimonio: b.patrimonioFinalNoHorizonte - a.patrimonioFinalNoHorizonte,
  };
}

// ---------------------------------------------------------------------------------------------
// 8. TESTE CAUSAL (item 8 do brief)
// ---------------------------------------------------------------------------------------------

export type TesteCausal = {
  mesA: number;
  mesB: number;
  deltaPatrimonioFinal: number;
  /** Fator A — "o veículo original gerou mais equity [operando mais tempo antes da venda]":
   * patrimônio acumulado pela operação do carro original entre o mês A e o mês B. */
  fatorA_operacaoAntesDaVenda: number;
  /** Fator B — "a venda liberou mais capital": efeito PATRIMONIAL direto é sempre 0 (prova no
   * cabeçalho do arquivo — valorVenda/custosVenda/precoVeiculo não mudam com o mês). O que muda
   * é o CAIXA liberado (reportado aqui só como contexto, não como termo da soma patrimonial). */
  fatorB_capitalLiberado: { deltaCaixaLiberado: number; efeitoPatrimonialDireto: 0 };
  /** Fatores C+D combinados — "a venda permitiu comprar mais veículos" + "os novos veículos
   * tiveram mais tempo para operar": efeito TOTAL da reciclagem (patrimonioGeradoPelosNovosVeiculos)
   * em cada mês, e a diferença entre os dois. C e D não são separáveis com exatidão de um único
   * ponto de dado (é uma soma não linear: nº de veículos × tempo de cada um) — reportado como
   * "efeito por veículo" (proxy do fator tempo) em vez de uma atribuição forçada. */
  fatoresCD_efeitoDaReciclagem: {
    efeitoTotalA: number;
    efeitoTotalB: number;
    delta: number;
    quantidadeVeiculosA: number;
    quantidadeVeiculosB: number;
    efeitoPorVeiculoA: number | null;
    efeitoPorVeiculoB: number | null;
  };
  /** fatorA + fatoresCD.delta deveria bater exatamente com deltaPatrimonioFinal (identidade
   * matemática provada no cabeçalho — Fator B contribui 0). Resíduo checado explicitamente. */
  residuo: number;
  identidadeFechou: boolean;
  conclusao: string;
};

export function testarCausalidade(cenario: CenarioDecisaoVenda, mesA: number, mesB: number): TesteCausal {
  const decompA = decomporMomentoDeVenda(cenario, mesA);
  const decompB = decomporMomentoDeVenda(cenario, mesB);
  const resultadoA = simularMomentoDeVenda(cenario, mesA, true);
  const resultadoB = simularMomentoDeVenda(cenario, mesB, true);

  const deltaPatrimonioFinal = resultadoB.patrimonioFinalNoHorizonte - resultadoA.patrimonioFinalNoHorizonte;
  const fatorA = decompB.patrimonioAntesDaVenda - decompA.patrimonioAntesDaVenda;
  const deltaCaixaLiberado = decompB.capitalLiquido - decompA.capitalLiquido;
  const deltaCD = decompB.patrimonioGeradoPelosNovosVeiculos - decompA.patrimonioGeradoPelosNovosVeiculos;
  const residuo = deltaPatrimonioFinal - fatorA - deltaCD;

  const efeitoPorVeiculoA = decompA.quantidadeNovosVeiculos > 0 ? decompA.patrimonioGeradoPelosNovosVeiculos / decompA.quantidadeNovosVeiculos : null;
  const efeitoPorVeiculoB = decompB.quantidadeNovosVeiculos > 0 ? decompB.patrimonioGeradoPelosNovosVeiculos / decompB.quantidadeNovosVeiculos : null;

  let conclusao: string;
  if (Math.abs(fatorA) < EPS && Math.abs(deltaCD) > EPS) {
    conclusao = `A diferença é explicada quase inteiramente pela reciclagem de capital (fatores C/D) — a operação isolada do veículo original (fator A) contribui perto de zero.`;
  } else if (Math.abs(deltaCD) < EPS && Math.abs(fatorA) > EPS) {
    conclusao = `A diferença é explicada quase inteiramente por operar o veículo original por mais tempo antes de vender (fator A) — a reciclagem não teve efeito relevante aqui.`;
  } else {
    conclusao = `Combinação dos fatores: ${fatorA >= 0 ? 'operar mais tempo antes de vender' : 'operar menos tempo antes de vender'} contribuiu ${fmt(fatorA)}, e a reciclagem de capital (compra de novos veículos + tempo deles operando) contribuiu ${fmt(deltaCD)}.`;
  }

  return {
    mesA,
    mesB,
    deltaPatrimonioFinal,
    fatorA_operacaoAntesDaVenda: fatorA,
    fatorB_capitalLiberado: { deltaCaixaLiberado, efeitoPatrimonialDireto: 0 },
    fatoresCD_efeitoDaReciclagem: {
      efeitoTotalA: decompA.patrimonioGeradoPelosNovosVeiculos,
      efeitoTotalB: decompB.patrimonioGeradoPelosNovosVeiculos,
      delta: deltaCD,
      quantidadeVeiculosA: decompA.quantidadeNovosVeiculos,
      quantidadeVeiculosB: decompB.quantidadeNovosVeiculos,
      efeitoPorVeiculoA,
      efeitoPorVeiculoB,
    },
    residuo,
    identidadeFechou: Math.abs(residuo) < EPS,
    conclusao,
  };
}

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ---------------------------------------------------------------------------------------------
// 22-24. SENSIBILIDADE E BREAK-EVEN (itens 22-25 do brief)
// ---------------------------------------------------------------------------------------------

export type PontoSensibilidade = {
  valorTestado: number;
  patrimonioFinal: number;
  frotaFinal: number;
  capitalReciclado: number;
  capitalUsadoEmNovaAquisicao: number;
};

/** Varia `cenario.valorVenda` sobre `valores`, recalculando o patrimônio final para um mês de venda fixo. */
export function sensibilidadeValorDeVenda(cenario: CenarioDecisaoVenda, mesVenda: number, valores: number[]): PontoSensibilidade[] {
  return valores.map((valorVenda) => {
    const r = simularMomentoDeVenda({ ...cenario, valorVenda }, mesVenda, true);
    return { valorTestado: valorVenda, patrimonioFinal: r.patrimonioFinalNoHorizonte, frotaFinal: r.frotaFinalUnidades, capitalReciclado: r.capitalReciclado, capitalUsadoEmNovaAquisicao: r.capitalRecicladoUsadoEmNovaAquisicao };
  });
}

/** Varia `cenario.aluguelSemanalPorVeiculo` sobre `valores`, recalculando o patrimônio final para um mês de venda fixo. */
export function sensibilidadeAluguel(cenario: CenarioDecisaoVenda, mesVenda: number, valores: number[]): PontoSensibilidade[] {
  return valores.map((aluguelSemanalPorVeiculo) => {
    const r = simularMomentoDeVenda({ ...cenario, aluguelSemanalPorVeiculo }, mesVenda, true);
    return { valorTestado: aluguelSemanalPorVeiculo, patrimonioFinal: r.patrimonioFinalNoHorizonte, frotaFinal: r.frotaFinalUnidades, capitalReciclado: r.capitalReciclado, capitalUsadoEmNovaAquisicao: r.capitalRecicladoUsadoEmNovaAquisicao };
  });
}

export type PontoDeIndiferenca =
  | { encontrado: true; valorVendaDeIndiferenca: number; precisao: number; nota: string; outrosPontosEncontrados: number[] }
  | { encontrado: false; motivo: string; faixaTestada: [number, number] };

/**
 * Busca o `valorVenda` em que `patrimonio(mesA) == patrimonio(mesB)` (item 24/25 do brief), FIXO
 * o resto do cenário — variando só o preço de venda que se APLICA IGUALMENTE aos dois meses
 * (não dá pra ter um valorVenda diferente por mês simulado sem inventar um 2º cenário; a pergunta
 * do brief é "em que preço as duas estratégias empatam", não "que combinação de 2 preços
 * diferentes empata" — ambos os candidatos usam o MESMO valorVenda de premissa).
 *
 * ACHADO da validação (achado real, não hipotético — pegou uma raiz errada na 1ª versão deste
 * arquivo): `g(valorVenda) = patrimonio(mesB) − patrimonio(mesA)` NÃO é contínua. Cada candidato
 * tem seu próprio limiar de reinvestimento (o loop `while caixa >= entrada + reserva`), e esses
 * limiares batem em valores de `valorVenda` DIFERENTES para mesA e mesB — perto desses pontos,
 * g() pode SALTAR de positivo pra negativo sem nunca passar por zero de verdade. Uma bisseção
 * ingênua (só olhando o sinal dos extremos do intervalo) converge pra dentro desse salto e reporta
 * uma "raiz" que não é raiz nenhuma — foi exatamente o que aconteceu na 1ª versão: convergiu em
 * valorVenda≈167.902 com g(167.902)≈+23.343 (não zero), porque o salto real ficava entre 167.902
 * e 170.000. Corrigido com: (1) varredura fina primeiro, pra achar TODOS os intervalos onde o
 * sinal muda; (2) bisseção dentro de cada intervalo já estreito; (3) VERIFICAÇÃO pós-bisseção —
 * só aceita a raiz se g(raiz) estiver de fato perto de 0 (não apenas se o intervalo encolheu).
 */
export function calcularPontoIndiferencaVenda(
  cenario: CenarioDecisaoVenda,
  mesA: number,
  mesB: number,
  faixa: [number, number] = [0, 300_000],
  opcoes: { pontosDeVarredura?: number; iteracoesBissecao?: number; toleranciaAbsoluta?: number } = {}
): PontoDeIndiferenca {
  const pontosDeVarredura = opcoes.pontosDeVarredura ?? 400;
  const iteracoesBissecao = opcoes.iteracoesBissecao ?? 40;
  // Tolerância absoluta pra aceitar uma raiz: intencionalmente pequena frente à escala de
  // patrimônio deste cenário (dezenas a centenas de milhares) — separa um cruzamento real de um
  // salto de degrau que passa perto de 0 por coincidência.
  const toleranciaAbsoluta = opcoes.toleranciaAbsoluta ?? 1_000;

  const g = (valorVenda: number) => {
    const a = simularMomentoDeVenda({ ...cenario, valorVenda }, mesA, true);
    const b = simularMomentoDeVenda({ ...cenario, valorVenda }, mesB, true);
    return b.patrimonioFinalNoHorizonte - a.patrimonioFinalNoHorizonte;
  };

  const [lo0, hi0] = faixa;
  const passo = (hi0 - lo0) / pontosDeVarredura;
  const amostras: { v: number; g: number }[] = [];
  for (let i = 0; i <= pontosDeVarredura; i++) {
    const v = lo0 + i * passo;
    amostras.push({ v, g: g(v) });
  }

  const raizesValidas: number[] = [];
  for (let i = 1; i < amostras.length; i++) {
    const anterior = amostras[i - 1];
    const atual = amostras[i];
    if (anterior.g === 0) { raizesValidas.push(anterior.v); continue; }
    if (Math.sign(anterior.g) === Math.sign(atual.g)) continue; // sem troca de sinal neste sub-intervalo.

    let lo = anterior.v, hi = atual.v, gLo = anterior.g;
    for (let it = 0; it < iteracoesBissecao; it++) {
      const meio = (lo + hi) / 2;
      const gMeio = g(meio);
      if (gMeio === 0) { lo = hi = meio; break; }
      if (Math.sign(gMeio) === Math.sign(gLo)) { lo = meio; gLo = gMeio; } else { hi = meio; }
    }
    const candidato = (lo + hi) / 2;
    const gCandidato = g(candidato);
    // Verificação: só aceita se g(candidato) está de fato perto de 0 — rejeita saltos de degrau
    // que cruzam o sinal sem nunca chegar perto de zero de verdade.
    if (Math.abs(gCandidato) < toleranciaAbsoluta) raizesValidas.push(candidato);
  }

  if (raizesValidas.length === 0) {
    const semTrocaDeSinal = amostras.every((a) => Math.sign(a.g) === Math.sign(amostras[0].g));
    return {
      encontrado: false,
      motivo: semTrocaDeSinal
        ? `g(valorVenda) não muda de sinal na faixa [${fmt(lo0)}, ${fmt(hi0)}] — uma estratégia domina a outra em toda a faixa testada (mês ${amostras[0].g >= 0 ? mesB : mesA} sempre melhor).`
        : `Existe(m) troca(s) de sinal na faixa, mas causada(s) por salto(s) de degrau de reinvestimento — nenhuma raiz verificada ficou a menos de ${fmt(toleranciaAbsoluta)} de g=0. Reduza o passo da varredura ou estreite a faixa perto do salto para investigar melhor.`,
      faixaTestada: faixa,
    };
  }

  const valorVendaDeIndiferenca = raizesValidas[0];
  return {
    encontrado: true,
    valorVendaDeIndiferenca,
    precisao: toleranciaAbsoluta,
    nota: `Encontrado por varredura fina (${pontosDeVarredura} pontos) + bisseção (${iteracoesBissecao} iterações), com verificação pós-bisseção (|g(raiz)| < ${fmt(toleranciaAbsoluta)}). Válido só dentro da faixa testada [${fmt(faixa[0])}, ${fmt(faixa[1])}].${raizesValidas.length > 1 ? ` ATENÇÃO: ${raizesValidas.length} pontos de indiferença válidos encontrados nesta faixa (função não monotônica) — retornando o primeiro; ver \`outrosPontosEncontrados\` para os demais.` : ''}`,
    outrosPontosEncontrados: raizesValidas.slice(1),
  };
}
