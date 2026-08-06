# PrimeCharge OS — Script de Teste Completo (Missão 4, Fase 8)

**Objetivo:** cobrir 100% das telas e ações da plataforma, passo a passo, clique a clique. Escrito para quem não programa — qualquer pessoa da operação deve conseguir seguir este roteiro sem ajuda técnica.

**Pré-requisito:** ambiente demo carregado (`supabase/seed.sql`, ver Fase 7) — o roteiro assume que já existem 2 veículos (PRM1A23 alugado, PRM2B45 disponível), 2 motoristas, 1 contrato ativo, lançamentos/pagamentos, 2 manutenções, 1 checklist concluído e 1 multa. Se o ambiente estiver vazio, use os passos "Cadastro do zero" de cada seção antes dos passos de "Cenário existente".

**Como marcar o resultado de cada passo:** ✅ funcionou como esperado / ❌ bug (anotar tela + o que aconteceu) / ⚠️ funcionou mas confuso (anotar o que não ficou claro).

---

## 0. Login e navegação geral

1. Acesse a URL da plataforma. Deve cair na tela de login (`/login`).
2. Digite um e-mail/senha inválido → deve aparecer mensagem de erro clara, sem travar a tela.
3. Digite as credenciais corretas → deve cair na Central de Comando (Command Center), não no Dashboard.
4. Confira o menu lateral: Central de Comando, Dashboard, Veículos, Motoristas, Contratos, Financeiro (com submenu: Lançamentos, Pagamentos, Contas Bancárias, Centros de Custo), Operações → Ações, Usuários.
5. Clique em cada item do menu uma vez, confirme que a tela abre sem erro e sem ficar em branco.

## 1. Central de Comando (Home)

1. Confirme que aparecem os blocos: Alertas, Riscos, Oportunidades, Ações (Próxima Ação por entidade) e a fila real de **Ações Operacionais** (checklists pendentes, manutenções agendadas, documentos vencendo, cobranças a vencer/atrasadas) — todos juntos em "Prioridades do Dia".
3. Clique em um item da lista "Prioridades do Dia" cujo tipo seja "Ação operacional" → deve navegar para o veículo/motorista/contrato relacionado (ou para `/operacoes/acoes` se não tiver entidade associada).
4. Clique em um item de tipo Alerta/Risco/Oportunidade → deve navegar para o Cockpit da entidade correspondente.
5. Confirme visualmente que o "Resumo da Frota" (health score) só considera Veículos, não mistura motorista/contrato.

## 2. Veículos

### 2.1 Cadastro do zero
1. `Veículos` → botão "Novo veículo".
2. Preencha marca, modelo, ano, chassi, renavam, placa, cor, categoria, tipo de aquisição, data/valor de compra.
3. Salve → deve cair no Cockpit do veículo recém-criado, status inicial "novo".
4. Tente cadastrar de novo com a mesma placa → deve bloquear com mensagem de placa duplicada (constraint `uq_veiculos_placa`).

### 2.2 Cockpit do veículo (cenário existente — abra PRM1A23)
1. Confirme os KPIs no topo: Receita, Custo, ROI — devem refletir os lançamentos reais do contrato ativo (não texto fixo/zerado).
2. Aba **Financeiro**: confirme os 2 lançamentos de mensalidade pagos e a mensalidade a vencer aparecem.
3. Aba **Manutenções**: confirme 1 manutenção "realizada" (troca de pneus) e 1 "agendada" (revisão 10.000km) aparecem com badges diferentes.
4. Na manutenção agendada, clique em "Marcar como realizada" → preencha custo e km reais → confirme.
   - Confirme que um novo Lançamento de despesa aparece automaticamente em Financeiro (aba do veículo e em `/financeiro/lancamentos`) sem precisar cadastrar manualmente.
5. Clique em "Nova manutenção" → teste as duas opções: "Já realizada" (pede custo/km/data) e "Agendar para depois" (pede só data futura, sem custo).
6. Aba **Multas**: confirme a multa pendente (excesso de velocidade) aparece com veículo e motorista vinculados.
7. Clique em "Nova multa" a partir do veículo → confirme que o campo veículo já vem preenchido e não pode ser trocado.
8. Aba **Arquivos/Documentos**: faça upload de um arquivo com categoria "documento" → confirme que aparece um campo de data de validade. Preencha uma data passada → confirme que o badge mostra "vencido" (vermelho). Preencha uma data futura próxima → confirme "vencendo em N dias" (amarelo).
9. Aba **Timeline**: confirme que toda ação acima (manutenção marcada, multa criada, upload) gerou um evento na timeline do veículo, em ordem cronológica.
10. Aba **Auditoria**: confirme que aparece quem fez cada alteração e quando.
11. Tente excluir o veículo PRM1A23 (que tem contrato ativo) → deve bloquear com mensagem explicando o motivo (não pode excluir veículo com histórico/contrato).

### 2.3 Venda de veículo (use PRM2B45, disponível)
1. Abra o Cockpit do PRM2B45.
2. Acione a ação "Vender veículo" → confirme que abre um diálogo pedindo comprador, valor da venda e data.
3. Confirme a venda → status do veículo deve mudar para "vendido", os 3 campos ficam visíveis no Cockpit, e o evento aparece na Timeline.
4. Tente vender o mesmo veículo de novo → confirme que a ação não fica disponível/bloqueia (já vendido).

### 2.4 Edição
1. Abra "Editar" em qualquer veículo → altere um campo simples (ex.: cor) → salve → confirme que voltou ao Cockpit com o dado atualizado.

## 3. Motoristas

### 3.1 Cadastro do zero
1. `Motoristas` → "Novo motorista" → preencha nome, CPF, contato, CNH (número/categoria/validade), endereço.
2. Salve → cai no Cockpit, status "lead".
3. Tente cadastrar com CPF repetido → deve bloquear.

### 3.2 Cockpit do motorista (cenário existente — abra Carlos Eduardo Silva)
1. Confirme Health Score / Driver Score aparecem com base em dado real (contrato ativo, pagamentos em dia).
2. Aba **Eventos**: confirme que a multa pendente aparece aqui também (mesma multa da aba Multas do veículo, vista pelo lado do motorista).
3. Clique em "Registrar multa" a partir do motorista → confirme que abre um seletor de veículo (motorista pode estar ligado a mais de um veículo ao longo do tempo, então o veículo não vem pré-preenchido).
4. Clique na ação "Cobrança" → confirme que navega para `/financeiro/pagamentos` (não fica preso numa tela morta).
5. Confirme que todas as ações do Cockpit têm efeito real — nenhuma deve estar marcada como "em breve"/placeholder sem funcionar.

### 3.3 Edição
1. "Editar" motorista → altere telefone → salve → confirme atualização.

## 4. Contratos

### 4.1 Cadastro do zero (percorrer os estados)
1. `Contratos` → "Novo contrato" → selecione um veículo "disponível" e um motorista, preencha periodicidade, valor, datas.
2. Salve → contrato nasce em `rascunho`.
3. Avance o status manualmente pelas transições disponíveis (rascunho → em_análise → aprovado → assinado).
4. Ao tentar avançar de "assinado" para "ativo": confirme que abre o diálogo de **Ativação** pedindo quilometragem inicial e carga da bateria inicial (não deixa ativar sem esses dois dados).
5. Preencha e confirme → contrato vira "ativo", veículo muda para "alugado" automaticamente (trigger de propagação).
6. Tente criar um segundo contrato "ativo" para o mesmo veículo → deve bloquear (`uq_contratos_veiculo_ativo`).

### 4.2 Cockpit do contrato (cenário existente — abra o contrato do PRM1A23)
1. Confirme km_inicial/carga_inicial_pct preenchidos (vieram do seed).
2. Confirme os 3 lançamentos financeiros do contrato aparecem na aba Financeiro (2 pagos, 1 a vencer amanhã).
3. Teste "Encerrar contrato" → confirme que pede km final e carga final (mesmo padrão da ativação) e volta o veículo para "disponível".

### 4.3 Edição
1. "Editar" um contrato em rascunho → altere o valor periódico → salve.

## 5. Financeiro

### 5.1 Lançamentos (`/financeiro/lancamentos`)
1. Confirme que os lançamentos do seed aparecem (2 confirmados, 1 prevista) e o lançamento automático de manutenção criado no passo 2.2.4 também aparece.
2. Filtre por tipo/status → confirme que o filtro funciona.
3. Crie um lançamento manual (ex.: despesa avulsa) → confirme que aparece na lista.

### 5.2 Pagamentos (`/financeiro/pagamentos`)
1. Confirme os 2 pagamentos "pago" e 1 "pendente" do seed aparecem.
2. Marque o pagamento pendente como pago → confirme que reflete no Cockpit do contrato/veículo também.

### 5.3 Contas Bancárias (`/financeiro/contas-bancarias`)
1. Confirme "Conta principal (demo)" aparece com saldo inicial.
2. Cadastre uma segunda conta → confirme que aparece na lista e fica disponível como opção ao registrar um pagamento.

### 5.4 Centros de Custo (`/financeiro/centros-custo`)
1. Cadastre um centro de custo novo → confirme que aparece como opção em lançamentos.

## 6. Operações → Ações (`/operacoes/acoes`)

1. Confirme que a lista mostra itens dos 7 geradores: checklist pendente, manutenção agendada vencendo, documento vencendo, cobrança atrasada/a vencer, renovação de documento, renovação de contrato.
2. Clique em "Sincronizar" (ou botão equivalente) → confirme que a lista atualiza sem duplicar itens já existentes (mesmo veículo/motorista/contrato não deve aparecer duplicado pelo mesmo motivo).
3. Marque uma ação como concluída → confirme que ela some da Central de Comando também (mesma fila, mesmo dado).

## 7. Checklists (a partir do Cockpit do veículo/contrato)

1. Ao ativar um contrato (passo 4.1.5) ou entregar um veículo, confirme que existe um fluxo de checklist de entrega (itens obrigatórios: limpeza, carga, km, fotos, documentos, assinatura).
2. Marque todos os itens obrigatórios → confirme que o checklist muda para "concluído" e não deixa concluir com item obrigatório em aberto.

## 8. Usuários (`/usuarios`)

1. Confirme a lista de usuários da empresa.
2. Convide um novo usuário (e-mail) → confirme que o convite é gerado (link ou e-mail, conforme implementado).
3. Teste `/aceitar-convite` com o link gerado (se possível neste ambiente) → confirme que cria a conta corretamente vinculada à empresa.

## 9. Dashboard (`/dashboard`)

1. Confirme que os números batem com o que já foi visto nas listas (nº de veículos, motoristas, contratos ativos, receita).

## 10. Testes de permissão (RBAC) — se houver mais de uma role disponível

1. Entre com um usuário de role mais restrita (ex.: operacional, sem permissão de excluir).
2. Confirme que botões de exclusão/edição sensíveis ficam ocultos ou desabilitados, não só escondidos no front (tentar a ação direto pela URL deve falhar também, não só o botão sumir).

## 11. Teste de "nenhuma ação sem feedback" (Fase 6)

Percorra novamente as ações críticas (ativar contrato, encerrar contrato, vender veículo, marcar manutenção realizada, registrar multa, excluir qualquer entidade) e confirme, para cada uma: aparece uma confirmação/toast de sucesso, e em caso de erro aparece uma mensagem legível (nunca uma tela em branco, nunca um erro técnico cru no lugar do texto).

---

## Resultado esperado

Ao final deste roteiro, cada linha marcada ✅ é uma etapa da jornada operacional "compra → uso → devolução → venda" comprovadamente operável pela interface, sem SQL manual, sem edição direta de banco. Qualquer ❌ ou ⚠️ vira item da lista de bugs/dívidas do relatório final da Missão 4.
