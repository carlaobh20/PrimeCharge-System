export interface CarroCombustao {
  id: number;
  marca: string;
  modelo: string;
  ano: number;
  valor: number;
  consumoGasolina: number; // km/l cidade com gasolina
  consumoEtanol: number; // km/l cidade com etanol
  custoRevisao10k: number; // Custo da revisão a cada 10.000 km
  custoPneuUnidade: number; // Custo unitário do pneu
  vidaUtilPneuKm: number; // Vida útil do pneu em km
  seguroMensal: number;
  ipvaMensal: number;
  categoria: 'UberX' | 'Comfort';
}

export type TipoCombustivel = 'gasolina' | 'etanol';
export type PeriodoVisualizacao = 'semanal' | 'mensal' | 'anual';

export interface Plano {
  id: number;
  nome: string;
  meses: number;
  preco: number;
  desconto: number;
  destaque?: string;
  beneficios: string[];
}

// === DADOS REAIS - FIPE MAIO 2026 + INMETRO PBE 2026 ===
//
// Valores: Tabela FIPE Maio/2026 (verificada em mobiauto, carzin, napista, tabelafipebrasil)
// Consumo: Inmetro/PBE Veicular 2026 + dados oficiais das montadoras
// Revisões: Valores médios de concessionárias autorizadas
// Pneus: Valores médios de pneus populares (Pirelli, Continental, Goodyear)
// Vida útil pneu: Estimativa conservadora para uso intensivo (motorista de app)
// IPVA: Calculado a 4% do valor FIPE (alíquota SP) / 12 meses
// Seguro: Estimativa para perfil motorista de app (pode variar por região)
//
// Última atualização: 03 de Maio de 2026

export const carrosCombustao: CarroCombustao[] = [
  // ============================================================
  // === UBER X - Hatches e compactos (0km - FIPE Mai/26) ===
  // ============================================================

  // Chevrolet Onix Turbo: top vendas, "sinônimo de Uber"
  { id: 1, marca: "Chevrolet", modelo: "Onix 1.0 Turbo", ano: 2026, valor: 99776, consumoGasolina: 13.2, consumoEtanol: 9.2, custoRevisao10k: 450, custoPneuUnidade: 380, vidaUtilPneuKm: 40000, seguroMensal: 320, ipvaMensal: 333, categoria: 'UberX' },

  // Hyundai HB20 Turbo: 8º mais vendido 2026
  { id: 2, marca: "Hyundai", modelo: "HB20 1.0 Turbo", ano: 2026, valor: 110005, consumoGasolina: 12.8, consumoEtanol: 8.9, custoRevisao10k: 520, custoPneuUnidade: 400, vidaUtilPneuKm: 40000, seguroMensal: 340, ipvaMensal: 367, categoria: 'UberX' },

  // Fiat Argo: 4º mais vendido Q1 2026 (FIPE caiu bastante)
  { id: 3, marca: "Fiat", modelo: "Argo 1.0 Drive", ano: 2026, valor: 77212, consumoGasolina: 13.5, consumoEtanol: 9.4, custoRevisao10k: 380, custoPneuUnidade: 350, vidaUtilPneuKm: 40000, seguroMensal: 280, ipvaMensal: 257, categoria: 'UberX' },

  // VW Polo TSI: top vendas
  { id: 4, marca: "Volkswagen", modelo: "Polo 1.0 TSI", ano: 2026, valor: 103365, consumoGasolina: 12.5, consumoEtanol: 8.7, custoRevisao10k: 580, custoPneuUnidade: 450, vidaUtilPneuKm: 40000, seguroMensal: 360, ipvaMensal: 345, categoria: 'UberX' },

  // Renault Sandero: clássico do app
  { id: 5, marca: "Renault", modelo: "Sandero 1.0", ano: 2026, valor: 85000, consumoGasolina: 12.9, consumoEtanol: 9.0, custoRevisao10k: 350, custoPneuUnidade: 340, vidaUtilPneuKm: 40000, seguroMensal: 270, ipvaMensal: 283, categoria: 'UberX' },

  // Peugeot 208: design e equipamento
  { id: 6, marca: "Peugeot", modelo: "208 1.0", ano: 2026, valor: 100582, consumoGasolina: 13.0, consumoEtanol: 9.1, custoRevisao10k: 480, custoPneuUnidade: 420, vidaUtilPneuKm: 40000, seguroMensal: 310, ipvaMensal: 335, categoria: 'UberX' },

  // === NOVOS UBER X (FIPE Mai/2026) ===

  // Hyundai HB20 Sense (versão de entrada, sem turbo)
  { id: 15, marca: "Hyundai", modelo: "HB20 Sense 1.0", ano: 2026, valor: 81722, consumoGasolina: 13.3, consumoEtanol: 9.4, custoRevisao10k: 480, custoPneuUnidade: 380, vidaUtilPneuKm: 40000, seguroMensal: 310, ipvaMensal: 272, categoria: 'UberX' },

  // VW Polo Track: substituiu o Gol, 2º mais vendido Q1 2026
  { id: 16, marca: "Volkswagen", modelo: "Polo Track 1.0 MPI", ano: 2026, valor: 81080, consumoGasolina: 13.5, consumoEtanol: 9.4, custoRevisao10k: 520, custoPneuUnidade: 410, vidaUtilPneuKm: 40000, seguroMensal: 330, ipvaMensal: 270, categoria: 'UberX' },

  // Fiat Mobi: carro mais barato do Brasil 2026 (Like)
  { id: 17, marca: "Fiat", modelo: "Mobi Like 1.0", ano: 2026, valor: 79060, consumoGasolina: 14.0, consumoEtanol: 9.7, custoRevisao10k: 320, custoPneuUnidade: 320, vidaUtilPneuKm: 40000, seguroMensal: 250, ipvaMensal: 264, categoria: 'UberX' },

  // Renault Kwid: o mais barato (Zen)
  { id: 18, marca: "Renault", modelo: "Kwid Zen 1.0", ano: 2026, valor: 62249, consumoGasolina: 13.7, consumoEtanol: 9.5, custoRevisao10k: 320, custoPneuUnidade: 310, vidaUtilPneuKm: 40000, seguroMensal: 240, ipvaMensal: 208, categoria: 'UberX' },

  // ============================================================
  // === UBER COMFORT - Sedãs médios (0km - FIPE Mai/26) ===
  // ============================================================

  // Toyota Corolla GLi 2.0
  { id: 7, marca: "Toyota", modelo: "Corolla GLi 2.0", ano: 2026, valor: 152896, consumoGasolina: 11.8, consumoEtanol: 8.2, custoRevisao10k: 750, custoPneuUnidade: 550, vidaUtilPneuKm: 45000, seguroMensal: 480, ipvaMensal: 510, categoria: 'Comfort' },

  // Honda Civic 2.0 (não-híbrido)
  { id: 8, marca: "Honda", modelo: "Civic 2.0", ano: 2026, valor: 165000, consumoGasolina: 11.2, consumoEtanol: 7.8, custoRevisao10k: 820, custoPneuUnidade: 620, vidaUtilPneuKm: 45000, seguroMensal: 520, ipvaMensal: 550, categoria: 'Comfort' },

  // Chevrolet Cruze Turbo
  { id: 9, marca: "Chevrolet", modelo: "Cruze Turbo", ano: 2026, valor: 145000, consumoGasolina: 10.8, consumoEtanol: 7.5, custoRevisao10k: 680, custoPneuUnidade: 480, vidaUtilPneuKm: 45000, seguroMensal: 420, ipvaMensal: 483, categoria: 'Comfort' },

  // VW Virtus TSI
  { id: 10, marca: "Volkswagen", modelo: "Virtus TSI", ano: 2026, valor: 125000, consumoGasolina: 12.0, consumoEtanol: 8.4, custoRevisao10k: 550, custoPneuUnidade: 440, vidaUtilPneuKm: 42000, seguroMensal: 380, ipvaMensal: 417, categoria: 'Comfort' },

  // Toyota Yaris Sedan
  { id: 11, marca: "Toyota", modelo: "Yaris Sedan 1.5", ano: 2026, valor: 110000, consumoGasolina: 12.4, consumoEtanol: 8.6, custoRevisao10k: 620, custoPneuUnidade: 420, vidaUtilPneuKm: 42000, seguroMensal: 340, ipvaMensal: 367, categoria: 'Comfort' },

  // Fiat Cronos
  { id: 12, marca: "Fiat", modelo: "Cronos 1.3", ano: 2026, valor: 98990, consumoGasolina: 12.6, consumoEtanol: 8.8, custoRevisao10k: 400, custoPneuUnidade: 360, vidaUtilPneuKm: 40000, seguroMensal: 300, ipvaMensal: 330, categoria: 'Comfort' },

  // Nissan Versa 1.6
  { id: 13, marca: "Nissan", modelo: "Versa 1.6", ano: 2026, valor: 122000, consumoGasolina: 11.5, consumoEtanol: 8.0, custoRevisao10k: 580, custoPneuUnidade: 400, vidaUtilPneuKm: 42000, seguroMensal: 360, ipvaMensal: 407, categoria: 'Comfort' },

  // Caoa Chery Arrizo 6 Pro
  { id: 14, marca: "Caoa Chery", modelo: "Arrizo 6 Pro", ano: 2026, valor: 128000, consumoGasolina: 11.0, consumoEtanol: 7.7, custoRevisao10k: 500, custoPneuUnidade: 480, vidaUtilPneuKm: 42000, seguroMensal: 370, ipvaMensal: 427, categoria: 'Comfort' },

  // === NOVOS COMFORT (FIPE Mai/2026) ===

  // Hyundai HB20S Sense (sedan da família HB20)
  { id: 19, marca: "Hyundai", modelo: "HB20S Sense 1.0", ano: 2026, valor: 95000, consumoGasolina: 12.8, consumoEtanol: 8.9, custoRevisao10k: 520, custoPneuUnidade: 400, vidaUtilPneuKm: 40000, seguroMensal: 340, ipvaMensal: 317, categoria: 'Comfort' },

  // Chevrolet Onix Plus: o sedã mais econômico segundo Inmetro
  { id: 20, marca: "Chevrolet", modelo: "Onix Plus 1.0", ano: 2026, valor: 89143, consumoGasolina: 13.9, consumoEtanol: 9.7, custoRevisao10k: 470, custoPneuUnidade: 390, vidaUtilPneuKm: 40000, seguroMensal: 330, ipvaMensal: 297, categoria: 'Comfort' },

  // ============================================================
  // === USADOS / SEMINOVOS clássicos do Uber (FIPE Mai/26) ===
  // ============================================================

  // Toyota Etios: lendário pela durabilidade Toyota (descontinuado em 2021)
  { id: 21, marca: "Toyota", modelo: "Etios Sedan 1.5 (2020)", ano: 2020, valor: 64000, consumoGasolina: 12.5, consumoEtanol: 8.7, custoRevisao10k: 420, custoPneuUnidade: 360, vidaUtilPneuKm: 45000, seguroMensal: 280, ipvaMensal: 213, categoria: 'Comfort' },

  // VW Voyage 1.6: clássico das frotas (descontinuado em 2022)
  { id: 22, marca: "Volkswagen", modelo: "Voyage 1.6 (2020)", ano: 2020, valor: 53000, consumoGasolina: 11.5, consumoEtanol: 8.0, custoRevisao10k: 380, custoPneuUnidade: 340, vidaUtilPneuKm: 40000, seguroMensal: 260, ipvaMensal: 177, categoria: 'Comfort' },

  // Renault Logan 1.6: espaço interno gigante (descontinuado em 2022)
  { id: 23, marca: "Renault", modelo: "Logan 1.6 (2020)", ano: 2020, valor: 50000, consumoGasolina: 11.8, consumoEtanol: 8.2, custoRevisao10k: 350, custoPneuUnidade: 330, vidaUtilPneuKm: 40000, seguroMensal: 250, ipvaMensal: 167, categoria: 'Comfort' },
];

export const planos: Plano[] = [
  {
    id: 1,
    nome: "Zero KM",
    meses: 18,
    preco: 1700,
    desconto: 0,
    destaque: "MAIS PREMIUM",
    beneficios: [
      "Carro 0 KM de fábrica",
      "Fidelidade de 1,5 anos",
      "Garantia total do fabricante",
      "Assistência 24h incluída",
      "Seguro completo incluído",
      "Manutenção preventiva grátis"
    ]
  },
  {
    id: 2,
    nome: "3 Meses",
    meses: 3,
    preco: 1500,
    desconto: 12,
    beneficios: [
      "Carro seminovo revisado",
      "Garantia RodaVolt",
      "Assistência 24h incluída",
      "Seguro completo incluído",
      "Manutenção incluída",
      "Sem entrada"
    ]
  },
  {
    id: 3,
    nome: "6 Meses",
    meses: 6,
    preco: 1400,
    desconto: 18,
    destaque: "MELHOR CUSTO-BENEFÍCIO",
    beneficios: [
      "Carro seminovo revisado",
      "Garantia RodaVolt",
      "Assistência 24h incluída",
      "Seguro completo incluído",
      "Manutenção incluída",
      "Bônus: 1 recarga grátis/mês"
    ]
  },
  {
    id: 4,
    nome: "12 Meses",
    meses: 12,
    preco: 1300,
    desconto: 24,
    destaque: "MÁXIMA ECONOMIA",
    beneficios: [
      "Carro seminovo revisado",
      "Garantia RodaVolt",
      "Assistência 24h incluída",
      "Seguro completo incluído",
      "Manutenção incluída",
      "Bônus: 2 recargas grátis/mês"
    ]
  }
];

export const modelos = [
  {
    id: 1,
    nome: "AION UT",
    imagem: "/aion-ut.png",
    autonomia: 310,
    tempoCarregamento: "30→80% em 24 min (carga rápida DC)",
    potencia: "204 cv",
    precoBase: 1590,
    disponivel: true
  }
];

// Taxa de rendimento mensal do capital investido
const TAXA_RENDIMENTO_MENSAL = 0.01; // 1% ao mês (CDI aproximado)

// Aluguel mensal de carros a combustão (valores de mercado - locadoras)
// Valores estimados para aluguel mensal sem motorista, uso app
export const aluguelCombustaoSemanal: Record<string, number> = {
  'UberX': 800, // ~R$800/semana para hatches populares
  'Comfort': 1000, // ~R$1000/semana para sedãs médios
};

export const calcularEconomia = (
  carro: CarroCombustao,
  kmMensal: number,
  precoCombustivel: number,
  planoSelecionado: Plano,
  tipoCombustivel: TipoCombustivel = 'gasolina'
) => {
  // Consumo baseado no tipo de combustível
  const consumo = tipoCombustivel === 'gasolina' ? carro.consumoGasolina : carro.consumoEtanol;
  
  // === CUSTOS CARRO A COMBUSTÃO PRÓPRIO ===
  
  // 1. Combustível
  const litrosMensal = kmMensal / consumo;
  const gastoCombustivel = litrosMensal * precoCombustivel;
  
  // 2. Depreciação mensal (média 15% ao ano)
  const depreciacaoMensal = (carro.valor * 0.15) / 12;
  
  // 3. Revisões (custo proporcional à km rodada - revisão a cada 10k km)
  const revisoesPorMes = kmMensal / 10000;
  const custoRevisaoMensal = carro.custoRevisao10k * revisoesPorMes;
  
  // 4. Pneus (4 pneus, custo proporcional à km rodada)
  const pneusPorMes = (kmMensal / carro.vidaUtilPneuKm) * 4;
  const custoPneusMensal = pneusPorMes * carro.custoPneuUnidade;
  
  // 5. Manutenção geral (óleo, pastilhas, filtros, etc.) - estimativa R$ 0.05/km
  const manutencaoGeralMensal = kmMensal * 0.05;
  
  // Total carro próprio (mensal)
  const totalCarroProprio = gastoCombustivel + depreciacaoMensal + custoRevisaoMensal + 
                            custoPneusMensal + manutencaoGeralMensal + 
                            carro.seguroMensal + carro.ipvaMensal;
  
  // === CUSTOS CARRO A COMBUSTÃO ALUGADO ===
  
  // 1. Aluguel semanal convertido para mensal
  const aluguelCombustaoMensal = aluguelCombustaoSemanal[carro.categoria] * 4.33;
  
  // 2. Combustível (mesmo gasto)
  const gastoCombustivelAlugado = gastoCombustivel;
  
  // 3. Custo de oportunidade (mesmo que elétrico - capital livre)
  const rendimentoCapitalAlugadoCombustao = carro.valor * TAXA_RENDIMENTO_MENSAL;
  
  // Total alugado combustão (mensal) - aluguel + combustível - rendimento capital
  const totalAlugadoCombustao = aluguelCombustaoMensal + gastoCombustivelAlugado - rendimentoCapitalAlugadoCombustao;
  
  // === CUSTOS CARRO ELÉTRICO ALUGADO ===
  
  // 1. Aluguel (convertendo semanal para mensal: preco * 4.33 semanas)
  const aluguelMensal = planoSelecionado.preco * 4.33;
  
  // 2. Energia elétrica
  // Consumo: 13 kWh/100km = 0.13 kWh/km
  // Custo kWh: R$ 0.82
  // Custo por km: 0.13 * 0.82 = R$ 0.1066/km
  const custoKwh = 0.82;
  const consumoKwhPorKm = 0.18; // ~18 kWh/100km (AION UT real: 60kWh/310km Inmetro)
  const gastoEletricidade = kmMensal * consumoKwhPorKm * custoKwh;
  
  // 3. Custo de oportunidade: valor do carro a combustão rendendo 1%/mês
  // O motorista do elétrico não precisa imobilizar capital em um carro
  const rendimentoCapital = carro.valor * TAXA_RENDIMENTO_MENSAL;
  
  // Total aluguel elétrico (mensal) - descontando o rendimento do capital
  const totalAluguel = aluguelMensal + gastoEletricidade - rendimentoCapital;
  
  // Economia vs próprio combustão
  const economiaMensalVsProprio = totalCarroProprio - totalAluguel;
  const economiaAnualVsProprio = economiaMensalVsProprio * 12;
  const economiaSemanalVsProprio = economiaMensalVsProprio / 4.33;
  
  // Economia vs alugado combustão
  const economiaMensalVsAlugado = totalAlugadoCombustao - totalAluguel;
  const economiaAnualVsAlugado = economiaMensalVsAlugado * 12;
  const economiaSemanalVsAlugado = economiaMensalVsAlugado / 4.33;
  
  return {
    combustao: {
      combustivel: gastoCombustivel,
      depreciacao: depreciacaoMensal,
      revisao: custoRevisaoMensal,
      pneus: custoPneusMensal,
      manutencaoGeral: manutencaoGeralMensal,
      seguro: carro.seguroMensal,
      ipva: carro.ipvaMensal,
      total: totalCarroProprio,
      consumoUsado: consumo
    },
    combustaoAlugado: {
      aluguel: aluguelCombustaoMensal,
      combustivel: gastoCombustivelAlugado,
      rendimentoCapital: rendimentoCapitalAlugadoCombustao,
      depreciacao: 0,
      revisao: 0,
      pneus: 0,
      manutencaoGeral: 0,
      seguro: 0,
      ipva: 0,
      total: totalAlugadoCombustao
    },
    eletrico: {
      aluguel: aluguelMensal,
      energia: gastoEletricidade,
      rendimentoCapital: rendimentoCapital,
      depreciacao: 0,
      manutencao: 0,
      seguro: 0,
      ipva: 0,
      total: totalAluguel
    },
    // Economia padrão (vs próprio)
    economiaMensal: economiaMensalVsProprio,
    economiaSemanal: economiaSemanalVsProprio,
    economiaAnual: economiaAnualVsProprio,
    percentualEconomia: ((economiaMensalVsProprio / totalCarroProprio) * 100).toFixed(0),
    // Economia vs alugado combustão
    economiaMensalVsAlugado,
    economiaSemanalVsAlugado,
    economiaAnualVsAlugado,
    percentualEconomiaVsAlugado: totalAlugadoCombustao > 0 ? ((economiaMensalVsAlugado / totalAlugadoCombustao) * 100).toFixed(0) : '0',
    // Preço do aluguel combustão para exibição
    aluguelCombustaoSemanal: aluguelCombustaoSemanal[carro.categoria]
  };
};

export const formatarMoeda = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(valor);
};
