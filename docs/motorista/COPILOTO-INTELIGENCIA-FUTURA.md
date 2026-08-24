# Copiloto Inteligente — Arquitetura Futura (Módulo L, documentação apenas)

> Este documento é ARQUITETURA-ONLY. Nenhum código, nenhuma migration, nenhuma tabela aqui foi
> criada nesta fase. É um mapa de possíveis extensões futuras, para não perder o raciocínio —
> não é um compromisso de entrega.

## Fila imediata (próxima passada, escopo já delimitado)

- **Módulo I — Cenários estendidos**: opção "Usar minha média registrada" dentro de
  `cenariosOperacionais()`, sem persistir nada (simulação pura, rotulada SIMULAÇÃO).
- **Módulo J — Plano de Hoje estendido**: bloco "Janelas com mais registros" dentro de
  `PlanoDeHoje.tsx`, reusando `inteligenciaPorHorario`/`inteligenciaPorDiaSemana` (Fase 17).
- **Módulo K — Assistente Contextual**: `CopilotoContext` (objeto estruturado agregando
  meta/hoje/mês/corridas/histórico/horários/dias da semana/custos/carro/qualidade de dados) +
  um Q&A determinístico (NÃO IA externa) que só lê esse objeto e responde com o mesmo vocabulário
  e a mesma disciplina de honestidade de dado do resto do app.

## Inteligência de frota/região (futuro distante — fora do escopo de qualquer fase atual)

Ideia registrada para não se perder, sem nenhum compromisso de prazo: se um dia o PrimeCharge
tiver volume suficiente de motoristas com Copiloto ativo, padrões agregados (nunca
individualizados por motorista) poderiam alimentar leituras de FROTA ou REGIÃO — por exemplo,
"entre os motoristas desta frota que usam o Copiloto, a faixa de horário com mais corridas
registradas é X" (mesma filosofia de "maior média/volume REGISTRADO", nunca "melhor horário").

Isso exigiria, no mínimo:

1. **Consentimento explícito e opt-in** por motorista para que os dados dele entrem numa
   agregação de frota — o padrão atual (privacidade invertida, staff zero acesso a dado
   individual) não pode ser enfraquecido; uma agregação de frota só pode ler dados JÁ AGREGADOS
   e anonimizados, nunca corridas individuais de outro motorista.
2. **Massa mínima de motoristas** antes de mostrar qualquer agregação (para não reidentificar
   um motorista individual numa frota pequena — ex.: frota com 2 motoristas não pode mostrar
   "faixa de horário da frota", porque equivaleria a expor o dado de um deles).
3. Uma nova política de RLS específica para uma tabela de AGREGADOS (nunca uma policy que dê a
   staff acesso a `motorista_corridas` bruta).
4. Uma migration nova, dedicada, com sua própria auditoria de reuso e sua própria suíte de
   testes de RLS — não é uma extensão do Copiloto pessoal, é uma feature nova de outro domínio
   (frota/região), que só reusaria o MOTOR de cálculo (R$/km, R$/h, faixas de horário), nunca a
   tabela.

Nenhuma decisão de implementação foi tomada aqui — é só o mapa para quando (e se) esse momento
chegar.
