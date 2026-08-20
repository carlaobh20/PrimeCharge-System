# MATRIZ DE VARIÁVEIS — Biblioteca Contratual PrimeCharge

> GERADO AUTOMATICAMENTE por `scripts/gerar-matriz-variaveis.ts` a partir do catálogo único
> (`variaveisCatalogo.ts`) e das minutas reais. Não editar à mão — regerar após mudanças.
> O script FALHA se alguma minuta usar variável fora do catálogo.

Documentos analisados: 17 · Variáveis em uso: 66 · Catálogo: 67

| Variável | Origem no sistema | Tipo | Obrigatória | Exemplo | Usada em |
|---|---|---|---|---|---|
| `{{aditivo.condicao_anterior}}` | informado no gerador | texto | Não ([SEM VALOR] visível / condicional) | R$ 1.400,00/semana | aditivo-contratual |
| `{{aditivo.condicao_nova}}` | informado no gerador | texto | Não ([SEM VALOR] visível / condicional) | R$ 1.500,00/semana | aditivo-contratual; termo-renovacao |
| `{{aditivo.data_efeito}}` | informado no gerador | data | Não ([SEM VALOR] visível / condicional) | 01/10/2026 | aditivo-contratual; termo-renovacao |
| `{{aditivo.descricao}}` | contrato_aditivos.descricao | texto | Não ([SEM VALOR] visível / condicional) | Reajuste do valor semanal… | aditivo-contratual; termo-renovacao |
| `{{aditivo.tipo}}` | contrato_aditivos.tipo | texto | Não ([SEM VALOR] visível / condicional) | valor | aditivo-contratual; termo-renovacao |
| `{{contrato.data_inicio}}` | contratos.data_inicio | data | Sim (bloqueia geração) | 01/09/2026 | Contrato Master |
| `{{contrato.dia_vencimento}}` | contratos.dia_vencimento | numero | Não ([SEM VALOR] visível / condicional) | 5 | Contrato Master |
| `{{contrato.km_incluso}}` | wizard (condições) — decisão comercial | texto | Não ([SEM VALOR] visível / condicional) | 3.000 km/mês | Contrato Master; termo-ciencia-operacional; termo-renovacao |
| `{{contrato.numero}}` | contratos.id (8 primeiros caracteres) | texto | Sim (bloqueia geração) | C7777777 | aditivo-contratual; comunicacao-sinistro; declaracao-sinistro; termo-ciencia-operacional; termo-ciencia-rastreamento-telemetria; termo-ciencia-seguro; termo-devolucao; termo-encerramento; termo-entrega; termo-infracoes-multas; termo-lgpd-dados; termo-procedimentos-sinistro; termo-quitacao; termo-renovacao; termo-rescisao; termo-responsabilidade-bens |
| `{{contrato.periodicidade}}` | contratos.periodicidade | texto | Sim (bloqueia geração) | semanal | Contrato Master; termo-renovacao |
| `{{contrato.prazo}}` | derivado de data_inicio/data_fim_prevista | texto | Sim (bloqueia geração) | de 01/09/2026 a 01/09/2027 | Contrato Master |
| `{{contrato.regras_especificas}}` | wizard (condições) / contratos.observacoes | texto | Não ([SEM VALOR] visível / condicional) | — | Contrato Master |
| `{{contrato.valor_caucao}}` | contratos.valor_caucao (formatado BRL) | moeda | Não ([SEM VALOR] visível / condicional) | R$ 3.000,00 | Contrato Master; termo-encerramento; termo-renovacao |
| `{{contrato.valor_km_excedente}}` | wizard (condições) — decisão comercial | moeda | Não ([SEM VALOR] visível / condicional) | R$ 0,80 | Contrato Master; termo-ciencia-operacional; termo-renovacao |
| `{{contrato.valor_periodico}}` | contratos.valor_periodico (formatado BRL) | moeda | Sim (bloqueia geração) | R$ 1.400,00 | Contrato Master; termo-renovacao |
| `{{data.hoje}}` | data da geração do documento | data | Sim (bloqueia geração) | 18/08/2026 | Contrato Master; aditivo-contratual; comunicacao-sinistro; declaracao-sinistro; termo-ciencia-operacional; termo-ciencia-rastreamento-telemetria; termo-ciencia-seguro; termo-devolucao; termo-encerramento; termo-entrega; termo-infracoes-multas; termo-lgpd-dados; termo-procedimentos-sinistro; termo-quitacao; termo-renovacao; termo-rescisao; termo-responsabilidade-bens |
| `{{devolucao.avarias}}` | informado no gerador / vistoria | texto | Não ([SEM VALOR] visível / condicional) | — | termo-devolucao |
| `{{devolucao.bateria_pct}}` | checklists.carga_pct (vistoria de devolução) | numero | Não ([SEM VALOR] visível / condicional) | 54 | termo-devolucao; termo-encerramento |
| `{{devolucao.data}}` | informado no gerador | data | Não ([SEM VALOR] visível / condicional) | 01/09/2027 | termo-devolucao; termo-encerramento |
| `{{devolucao.itens}}` | informado no gerador (inventário) | lista | Não ([SEM VALOR] visível / condicional) | 1 chave; 1 carregador portátil | termo-devolucao; termo-encerramento |
| `{{devolucao.km}}` | checklists.odometro_km (vistoria de devolução) | numero | Não ([SEM VALOR] visível / condicional) | 78.500 | termo-devolucao; termo-encerramento |
| `{{devolucao.observacoes}}` | informado no gerador | texto | Não ([SEM VALOR] visível / condicional) | — | termo-devolucao |
| `{{devolucao.pendencias}}` | informado no gerador | texto | Não ([SEM VALOR] visível / condicional) | — | termo-devolucao |
| `{{empresa.cnpj}}` | empresas.cnpj | documento | Não ([SEM VALOR] visível / condicional) | 00.000.000/0001-00 | Contrato Master; aditivo-contratual; termo-encerramento; termo-lgpd-dados; termo-quitacao; termo-renovacao; termo-rescisao |
| `{{empresa.endereco}}` | empresas.endereco (0043) ou campo do wizard | texto | Não ([SEM VALOR] visível / condicional) | Av. X, 100 — Belo Horizonte/MG | Contrato Master |
| `{{empresa.razao_social}}` | empresas.nome | texto | Sim (bloqueia geração) | PrimeCharge Locadora LTDA | Contrato Master; aditivo-contratual; comunicacao-sinistro; declaracao-sinistro; termo-ciencia-operacional; termo-ciencia-rastreamento-telemetria; termo-ciencia-seguro; termo-devolucao; termo-encerramento; termo-entrega; termo-infracoes-multas; termo-lgpd-dados; termo-procedimentos-sinistro; termo-quitacao; termo-renovacao; termo-rescisao; termo-responsabilidade-bens |
| `{{entrega.avarias}}` | informado no gerador / vistoria | texto | Não ([SEM VALOR] visível / condicional) | risco no para-choque traseiro | termo-entrega |
| `{{entrega.bateria_pct}}` | checklists.carga_pct (vistoria de entrega) | numero | Não ([SEM VALOR] visível / condicional) | 86 | termo-entrega |
| `{{entrega.data}}` | checklists (tipo entrega).criado_em ou informado no gerador | data | Não ([SEM VALOR] visível / condicional) | 01/09/2026 | termo-entrega |
| `{{entrega.itens}}` | informado no gerador (inventário) | lista | Não ([SEM VALOR] visível / condicional) | 1 chave; 1 carregador portátil; 1 cabo tipo 2; CRLV digital | termo-entrega; termo-responsabilidade-bens |
| `{{entrega.km}}` | checklists.odometro_km (vistoria de entrega) | numero | Não ([SEM VALOR] visível / condicional) | 42.000 | termo-entrega |
| `{{entrega.observacoes}}` | informado no gerador | texto | Não ([SEM VALOR] visível / condicional) | — | termo-entrega |
| `{{local.assinatura}}` | juridico_parametros ou informado no gerador | texto | Não ([SEM VALOR] visível / condicional) | Belo Horizonte/MG | Contrato Master; aditivo-contratual; comunicacao-sinistro; declaracao-sinistro; termo-ciencia-operacional; termo-ciencia-rastreamento-telemetria; termo-ciencia-seguro; termo-devolucao; termo-encerramento; termo-entrega; termo-infracoes-multas; termo-lgpd-dados; termo-procedimentos-sinistro; termo-quitacao; termo-renovacao; termo-rescisao; termo-responsabilidade-bens |
| `{{motorista.cnh}}` | motoristas.cnh_numero + cnh_categoria | documento | Sim (bloqueia geração) | 99887766554 (categoria B) | Contrato Master; declaracao-sinistro; termo-infracoes-multas |
| `{{motorista.cpf}}` | motoristas.cpf | documento | Sim (bloqueia geração) | 123.456.789-01 | Contrato Master; aditivo-contratual; comunicacao-sinistro; declaracao-sinistro; termo-ciencia-operacional; termo-ciencia-rastreamento-telemetria; termo-ciencia-seguro; termo-devolucao; termo-encerramento; termo-entrega; termo-infracoes-multas; termo-lgpd-dados; termo-procedimentos-sinistro; termo-quitacao; termo-renovacao; termo-rescisao; termo-responsabilidade-bens |
| `{{motorista.email}}` | motoristas.email | texto | Não ([SEM VALOR] visível / condicional) | joao@email.com | Contrato Master |
| `{{motorista.endereco}}` | motoristas.endereco | texto | Não ([SEM VALOR] visível / condicional) | Rua Y, 22 | Contrato Master |
| `{{motorista.nome}}` | motoristas.nome_completo | texto | Sim (bloqueia geração) | João da Silva | Contrato Master; aditivo-contratual; comunicacao-sinistro; declaracao-sinistro; termo-ciencia-operacional; termo-ciencia-rastreamento-telemetria; termo-ciencia-seguro; termo-devolucao; termo-encerramento; termo-entrega; termo-infracoes-multas; termo-lgpd-dados; termo-procedimentos-sinistro; termo-quitacao; termo-renovacao; termo-rescisao; termo-responsabilidade-bens |
| `{{motorista.telefone}}` | motoristas.telefone | texto | Não ([SEM VALOR] visível / condicional) | (31) 99999-0000 | Contrato Master |
| `{{multa.data}}` | multas.data_infracao | data | Não ([SEM VALOR] visível / condicional) | 10/10/2026 | termo-infracoes-multas |
| `{{multa.descricao}}` | multas.descricao | texto | Não ([SEM VALOR] visível / condicional) | excesso de velocidade | termo-infracoes-multas |
| `{{multa.orgao}}` | multas.orgao_autuador | texto | Não ([SEM VALOR] visível / condicional) | DETRAN-MG | termo-infracoes-multas |
| `{{multa.valor}}` | multas.valor (formatado BRL) | moeda | Não ([SEM VALOR] visível / condicional) | R$ 195,23 | termo-infracoes-multas |
| `{{rescisao.data}}` | contrato_rescisoes.criado_em | data | Não ([SEM VALOR] visível / condicional) | 18/08/2026 | termo-rescisao |
| `{{rescisao.motivo}}` | contrato_rescisoes.motivo | texto | Não ([SEM VALOR] visível / condicional) | encerramento por acordo | termo-rescisao |
| `{{rescisao.solicitante}}` | contrato_rescisoes.solicitante | texto | Não ([SEM VALOR] visível / condicional) | acordo | termo-rescisao |
| `{{rescisao.valores}}` | contrato_rescisoes.valores (apuração REGISTRADA — nunca calculada) | lista | Não ([SEM VALOR] visível / condicional) | saldo devedor R$ 0,00; caução R$ 3.000,00 | termo-encerramento; termo-quitacao; termo-rescisao |
| `{{seguro.apolice}}` | contrato_seguros.apolice | documento | Não ([SEM VALOR] visível / condicional) | AP-123456 | Contrato Master; declaracao-sinistro; termo-ciencia-seguro |
| `{{seguro.assistencia}}` | contrato_seguros.assistencia | texto | Não ([SEM VALOR] visível / condicional) | guincho 24h | termo-ciencia-seguro |
| `{{seguro.coberturas}}` | contrato_seguros.coberturas (só as marcadas true) | lista | Não ([SEM VALOR] visível / condicional) | danos a terceiros; roubo/furto | termo-ciencia-seguro |
| `{{seguro.exclusoes}}` | contrato_seguros.coberturas (só as marcadas false) | lista | Não ([SEM VALOR] visível / condicional) | colisão | termo-ciencia-seguro |
| `{{seguro.franquia}}` | contrato_seguros.franquia_valor (formatado BRL) | moeda | Não ([SEM VALOR] visível / condicional) | R$ 5.000,00 | Contrato Master; termo-ciencia-seguro |
| `{{seguro.seguradora}}` | contrato_seguros.seguradora | texto | Não ([SEM VALOR] visível / condicional) | Seguradora X | Contrato Master; declaracao-sinistro; termo-ciencia-seguro |
| `{{seguro.vigencia}}` | contrato_seguros.vigencia_inicio/fim (formatado) | texto | Não ([SEM VALOR] visível / condicional) | de 01/09/2026 a 01/09/2027 | Contrato Master; termo-ciencia-seguro |
| `{{sinistro.data}}` | sinistros.data_ocorrencia | data | Não ([SEM VALOR] visível / condicional) | 15/10/2026 | comunicacao-sinistro; declaracao-sinistro; termo-procedimentos-sinistro |
| `{{sinistro.descricao}}` | sinistros.descricao | texto | Não ([SEM VALOR] visível / condicional) | colisão traseira na Av. X | comunicacao-sinistro; declaracao-sinistro; termo-procedimentos-sinistro |
| `{{sinistro.documentos}}` | informado no gerador (protocolo de entrega) | lista | Não ([SEM VALOR] visível / condicional) | boletim de ocorrência; 12 fotos; orçamento | termo-procedimentos-sinistro |
| `{{sinistro.tipo}}` | sinistros.tipo | texto | Não ([SEM VALOR] visível / condicional) | colisão | comunicacao-sinistro; declaracao-sinistro; termo-procedimentos-sinistro |
| `{{veiculo.ano}}` | veiculos.ano_fabricacao/ano_modelo | texto | Sim (bloqueia geração) | 2024/2025 | Contrato Master |
| `{{veiculo.capacidade_bateria}}` | veiculos.capacidade_bateria_kwh | numero | Não ([SEM VALOR] visível / condicional) | 44 | Contrato Master |
| `{{veiculo.chassi}}` | veiculos.chassi | documento | Sim (bloqueia geração) | 9BW… | Contrato Master; termo-devolucao; termo-entrega |
| `{{veiculo.cor}}` | veiculos.cor | texto | Não ([SEM VALOR] visível / condicional) | Branco | Contrato Master |
| `{{veiculo.marca_modelo}}` | marcas.nome + modelos.nome | texto | Sim (bloqueia geração) | BYD Dolphin | Contrato Master; aditivo-contratual; comunicacao-sinistro; declaracao-sinistro; termo-ciencia-operacional; termo-ciencia-rastreamento-telemetria; termo-ciencia-seguro; termo-devolucao; termo-encerramento; termo-entrega; termo-infracoes-multas; termo-procedimentos-sinistro; termo-renovacao; termo-rescisao; termo-responsabilidade-bens |
| `{{veiculo.placa}}` | veiculos.placa | documento | Sim (bloqueia geração) | ABC1D23 | Contrato Master; aditivo-contratual; comunicacao-sinistro; declaracao-sinistro; termo-ciencia-operacional; termo-ciencia-rastreamento-telemetria; termo-ciencia-seguro; termo-devolucao; termo-encerramento; termo-entrega; termo-infracoes-multas; termo-procedimentos-sinistro; termo-renovacao; termo-rescisao; termo-responsabilidade-bens |
| `{{veiculo.quilometragem}}` | veiculos.quilometragem | numero | Não ([SEM VALOR] visível / condicional) | 42000 | Contrato Master |
| `{{veiculo.renavam}}` | veiculos.renavam | documento | Sim (bloqueia geração) | 01234567890 | Contrato Master |

Variáveis catalogadas ainda sem uso em minuta: `{{aditivo.data}}`.

Regras: variável obrigatória sem valor BLOQUEIA a geração (validacao.ts); variável opcional
sem valor sai como `[SEM VALOR: …]` VISÍVEL no documento ou é removida por bloco condicional
`{{#se}}/{{#senao}}` — nunca lacuna silenciosa. Variável fora do catálogo bloqueia importação.
