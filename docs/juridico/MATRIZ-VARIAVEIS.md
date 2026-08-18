# MATRIZ DE VARIÁVEIS — Contrato Master

> GERADO AUTOMATICAMENTE por `scripts/gerar-matriz-variaveis.ts` a partir da minuta real.
> Não editar à mão — regerar após qualquer mudança na minuta.

| Variável | Origem no sistema | Obrigatória | Exemplo | Usada em |
|---|---|---|---|---|
| `{{contrato.data_inicio}}` | contratos.data_inicio | Sim (bloqueia geração) | 01/09/2026 | CLÁUSULA 3 — PRAZO |
| `{{contrato.dia_vencimento}}` | contratos.dia_vencimento | Não (sai [SEM VALOR] visível) | 5 | CLÁUSULA 4 — VALOR, PAGAMENTO E REAJUSTE |
| `{{contrato.km_incluso}}` | wizard (condições) — decisão comercial | Não (sai [SEM VALOR] visível) | livre | CLÁUSULA 2 — DESTINAÇÃO E USO |
| `{{contrato.periodicidade}}` | contratos.periodicidade | Sim (bloqueia geração) | semanal | CLÁUSULA 4 — VALOR, PAGAMENTO E REAJUSTE |
| `{{contrato.prazo}}` | derivado de data_inicio/data_fim_prevista | Sim (bloqueia geração) | de 01/09/2026 a 01/09/2027 | CLÁUSULA 3 — PRAZO |
| `{{contrato.valor_caucao}}` | contratos.valor_caucao (formatado BRL) | Não (sai [SEM VALOR] visível) | R$ 3.000,00 | CLÁUSULA 5 — CAUÇÃO (GARANTIA) |
| `{{contrato.valor_periodico}}` | contratos.valor_periodico (formatado BRL) | Sim (bloqueia geração) | R$ 1.400,00 | CLÁUSULA 4 — VALOR, PAGAMENTO E REAJUSTE |
| `{{empresa.cnpj}}` | empresas.cnpj | Não (sai [SEM VALOR] visível) | 00.000.000/0001-00 | CONTRATO DE LOCAÇÃO DE VEÍCULO AUTOMOTOR |
| `{{empresa.endereco}}` | empresas.endereco (0043) ou campo do wizard | Não (sai [SEM VALOR] visível) | Av. X, 100 — BH/MG | CONTRATO DE LOCAÇÃO DE VEÍCULO AUTOMOTOR |
| `{{empresa.razao_social}}` | empresas.nome | Sim (bloqueia geração) | PrimeCharge Locadora LTDA | CONTRATO DE LOCAÇÃO DE VEÍCULO AUTOMOTOR; CLÁUSULA 15 — FORO |
| `{{motorista.cnh}}` | motoristas.cnh_numero + cnh_categoria | Sim (bloqueia geração) | 99887766554 (categoria B) | CONTRATO DE LOCAÇÃO DE VEÍCULO AUTOMOTOR |
| `{{motorista.cpf}}` | motoristas.cpf | Sim (bloqueia geração) | 123.456.789-01 | CONTRATO DE LOCAÇÃO DE VEÍCULO AUTOMOTOR |
| `{{motorista.endereco}}` | motoristas.endereco | Não (sai [SEM VALOR] visível) | Rua Y, 22 | CONTRATO DE LOCAÇÃO DE VEÍCULO AUTOMOTOR |
| `{{motorista.nome}}` | motoristas.nome_completo | Sim (bloqueia geração) | João da Silva | CONTRATO DE LOCAÇÃO DE VEÍCULO AUTOMOTOR; CLÁUSULA 15 — FORO |
| `{{veiculo.ano}}` | veiculos.ano_fabricacao/ano_modelo | Sim (bloqueia geração) | 2024/2025 | CLÁUSULA 1 — OBJETO |
| `{{veiculo.chassi}}` | veiculos.chassi | Sim (bloqueia geração) | 9BW… | CLÁUSULA 1 — OBJETO |
| `{{veiculo.cor}}` | veiculos.cor | Não (sai [SEM VALOR] visível) | Branco | CLÁUSULA 1 — OBJETO |
| `{{veiculo.marca_modelo}}` | marcas.nome + modelos.nome | Sim (bloqueia geração) | BYD Dolphin | CLÁUSULA 1 — OBJETO |
| `{{veiculo.placa}}` | veiculos.placa | Sim (bloqueia geração) | ABC1D23 | CLÁUSULA 1 — OBJETO |
| `{{veiculo.renavam}}` | veiculos.renavam | Sim (bloqueia geração) | 01234567890 | CLÁUSULA 1 — OBJETO |

Total: 20 variáveis na minuta.

Regras: variável obrigatória sem valor BLOQUEIA a geração (validacao.ts);
variável opcional sem valor sai como `[SEM VALOR: …]` VISÍVEL no documento — nunca lacuna silenciosa.
