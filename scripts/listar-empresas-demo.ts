/* eslint-disable no-console */
// PrimeCharge OS — Fase 23, PASSO 0. Lista as empresas existentes e ajuda a escolher qual vai
// receber o Motorista Demo. 100% READ-ONLY — este arquivo não contém, em nenhuma linha,
// .insert(/.update(/.delete(/.upsert(/.rpc( nem SQL cru. Isso é verificado estaticamente por
// scripts/audit-listar-empresas-demo.ts, que falha o build se qualquer uma dessas aparecer.
//
// Schema realmente auditado antes de escrever este script (não inventado):
//   empresas (0001_fase0_fundacao.sql):      id, nome, cnpj, criado_em, atualizado_em
//     — SEM coluna de status/ativo. Uma coluna "endereco" foi adicionada na migration 0043,
//       mas 0043 é do Centro Jurídico e NÃO está aplicada em produção (confirmado na auditoria
//       da Fase 23) — por isso este script não seleciona "endereco": numa produção que só tem
//       0001-0050 aplicadas, essa coluna não existe.
//   motoristas (0004): tem empresa_id, nome_completo, status (enum), SEM coluna "ativo" solta.
//   veiculos (0003):   tem empresa_id, placa, chassi, renavam, status (enum).
//   contratos (0005):  tem empresa_id, motorista_id, veiculo_id, status (enum, inclui 'ativo').
//   convites (0001/0034): tem empresa_id, email, motorista_id (nullable).
//   marcas/modelos (0003): GLOBAIS — não têm empresa_id. Catálogo é compartilhado por todas as
//     empresas, então "catálogo BYD/Dolphin disponível" é uma pergunta sobre o BANCO como um
//     todo, não sobre uma empresa específica — reportado uma vez só, fora da tabela por empresa.
//
// Uso (NÃO execute isso agora — só depois que o Carlos mandar):
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/listar-empresas-demo.ts
//
// Por que precisa de SERVICE_ROLE_KEY mesmo só lendo: todas as tabelas abaixo têm RLS que só
// libera linhas da PRÓPRIA empresa do usuário autenticado (current_empresa_id()) — pra listar
// TODAS as empresas de uma vez (objetivo deste script) é preciso bypassar RLS. A chave é usada
// aqui SÓ para chamadas .select() — nunca é logada, nunca é salva em arquivo.

import { NOME_MOTORISTA_DEMO, PLACA_VEICULO_DEMO, CHASSI_VEICULO_DEMO, RENAVAM_VEICULO_DEMO, lerCredenciaisObrigatorias } from './lib/motoristaDemoShared.ts';

type Elegibilidade = 'ELEGÍVEL' | 'NÃO ELEGÍVEL' | 'ATENÇÃO';

async function main() {
  const env = process.env;
  console.log('=== listar-empresas-demo.ts — PASSO 0 (100% leitura) ===\n');

  const credenciais = lerCredenciaisObrigatorias(env);
  if (!credenciais.ok) {
    console.error(`ABORTADO: ${credenciais.motivoBloqueio}`);
    process.exitCode = 1;
    return;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(credenciais.url!, credenciais.serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ------------------------------------------------------------------------------------------
  // 1. Catálogo BYD/Dolphin — pergunta GLOBAL (marcas/modelos não são por empresa)
  // ------------------------------------------------------------------------------------------
  console.log('1. CATÁLOGO (global — não é por empresa):');
  const marcasByd = await admin.from('marcas').select('id, nome').ilike('nome', 'BYD');
  if (marcasByd.error) {
    console.log(`   [ERRO lendo marcas] ${marcasByd.error.message}`);
  } else if (!marcasByd.data || marcasByd.data.length === 0) {
    console.log('   marca "BYD": NÃO ENCONTRADA. O seed do Motorista Demo depende dela — sem isso, nenhuma empresa está de fato pronta para o seed até o catálogo ser confirmado.');
  } else {
    for (const marca of marcasByd.data) {
      console.log(`   marca: "${marca.nome}"  marca_id: ${marca.id}`);
      const modelos = await admin.from('modelos').select('id, nome').eq('marca_id', marca.id).ilike('nome', '%dolphin%');
      if (modelos.error) {
        console.log(`     [ERRO lendo modelos] ${modelos.error.message}`);
      } else if (!modelos.data || modelos.data.length === 0) {
        console.log('     modelo "Dolphin": NÃO ENCONTRADO sob esta marca.');
      } else {
        for (const modelo of modelos.data) {
          const exato = modelo.nome.toLowerCase() === 'dolphin' ? ' (match exato)' : ' (nome parecido, NÃO é exato — conferir antes de usar)';
          console.log(`     modelo: "${modelo.nome}"  modelo_id: ${modelo.id}${exato}`);
        }
        if (modelos.data.length > 1) {
          console.log(`     [ATENÇÃO] ${modelos.data.length} modelos com nome parecido com "Dolphin" — o seed usa o nome EXATO "Dolphin"; confirme que ele está nesta lista antes de rodar.`);
        }
      }
    }
  }

  // ------------------------------------------------------------------------------------------
  // 2. Procurar Demo já existente — por nome/placa/chassi/renavam/e-mail, em TODAS as empresas
  // ------------------------------------------------------------------------------------------
  console.log('\n2. PROCURA POR DEMO JÁ EXISTENTE (em toda a base, não só numa empresa):');
  const motoristasDemo = await admin.from('motoristas').select('id, empresa_id, nome_completo').ilike('nome_completo', `%${NOME_MOTORISTA_DEMO}%`);
  const veiculosDemo = await admin
    .from('veiculos')
    .select('id, empresa_id, placa, chassi, renavam')
    .or(`placa.eq.${PLACA_VEICULO_DEMO},chassi.eq.${CHASSI_VEICULO_DEMO},renavam.eq.${RENAVAM_VEICULO_DEMO}`);
  const convitesDemo = await admin.from('convites').select('id, empresa_id, email, motorista_id').ilike('email', 'motorista.demo.primecharge+%@example.com');

  const empresasComDemo = new Set<string>();
  if (motoristasDemo.error) console.log(`   [ERRO lendo motoristas] ${motoristasDemo.error.message}`);
  else if (motoristasDemo.data.length) {
    console.log(`   DEMO JÁ EXISTENTE — motoristas encontrados (${motoristasDemo.data.length}):`);
    motoristasDemo.data.forEach((m) => {
      console.log(`     motorista_id=${m.id} empresa_id=${m.empresa_id} nome="${m.nome_completo}"`);
      empresasComDemo.add(m.empresa_id);
    });
  } else {
    console.log('   nenhum motorista com nome parecido com "Motorista Demo PrimeCharge" encontrado.');
  }

  if (veiculosDemo.error) console.log(`   [ERRO lendo veiculos] ${veiculosDemo.error.message}`);
  else if (veiculosDemo.data.length) {
    console.log(`   DEMO JÁ EXISTENTE — veículos com placa/chassi/renavam demo encontrados (${veiculosDemo.data.length}):`);
    veiculosDemo.data.forEach((v) => {
      console.log(`     veiculo_id=${v.id} empresa_id=${v.empresa_id} placa=${v.placa} chassi=${v.chassi} renavam=${v.renavam}`);
      empresasComDemo.add(v.empresa_id);
    });
  } else {
    console.log('   nenhum veículo com placa/chassi/renavam demo encontrado.');
  }

  if (convitesDemo.error) console.log(`   [ERRO lendo convites] ${convitesDemo.error.message}`);
  else if (convitesDemo.data.length) {
    console.log(`   DEMO JÁ EXISTENTE — convites com e-mail demo encontrados (${convitesDemo.data.length}):`);
    convitesDemo.data.forEach((c) => {
      console.log(`     convite_id=${c.id} empresa_id=${c.empresa_id} email=${c.email} motorista_id=${c.motorista_id ?? '(nulo)'}`);
      empresasComDemo.add(c.empresa_id);
    });
  } else {
    console.log('   nenhum convite com e-mail demo encontrado.');
  }

  // Se achou motorista/veículo demo, procura o contrato que liga os dois (informativo).
  if (motoristasDemo.data?.length || veiculosDemo.data?.length) {
    const idsMotorista = (motoristasDemo.data ?? []).map((m) => m.id);
    const idsVeiculo = (veiculosDemo.data ?? []).map((v) => v.id);
    const filtros = [
      idsMotorista.length ? `motorista_id.in.(${idsMotorista.join(',')})` : null,
      idsVeiculo.length ? `veiculo_id.in.(${idsVeiculo.join(',')})` : null,
    ].filter(Boolean) as string[];
    if (filtros.length) {
      const contratosDemo = await admin.from('contratos').select('id, empresa_id, motorista_id, veiculo_id, status').or(filtros.join(','));
      if (!contratosDemo.error && contratosDemo.data.length) {
        console.log(`   DEMO JÁ EXISTENTE — contratos ligando esses registros (${contratosDemo.data.length}):`);
        contratosDemo.data.forEach((c) => console.log(`     contrato_id=${c.id} empresa_id=${c.empresa_id} status=${c.status}`));
      }
    }
  }

  // ------------------------------------------------------------------------------------------
  // 3. Empresas + contagens + elegibilidade
  // ------------------------------------------------------------------------------------------
  console.log('\n3. EMPRESAS:');
  const empresas = await admin.from('empresas').select('id, nome, cnpj, criado_em').order('criado_em', { ascending: true });
  if (empresas.error || !empresas.data) {
    console.error(`ABORTADO ao ler empresas: ${empresas.error?.message}`);
    process.exitCode = 1;
    return;
  }

  const catalogoOk = !marcasByd.error && (marcasByd.data?.length ?? 0) > 0;

  for (const empresa of empresas.data) {
    const [motoristasCount, veiculosCount, contratosAtivosCount] = await Promise.all([
      admin.from('motoristas').select('*', { count: 'exact', head: true }).eq('empresa_id', empresa.id),
      admin.from('veiculos').select('*', { count: 'exact', head: true }).eq('empresa_id', empresa.id),
      admin.from('contratos').select('*', { count: 'exact', head: true }).eq('empresa_id', empresa.id).eq('status', 'ativo'),
    ]);

    const temDemo = empresasComDemo.has(empresa.id);
    const semVeiculo = (veiculosCount.count ?? 0) === 0;
    const semMotorista = (motoristasCount.count ?? 0) === 0;

    let classificacao: Elegibilidade;
    const motivos: string[] = [];
    if (temDemo) {
      classificacao = 'NÃO ELEGÍVEL';
      motivos.push('já existe um registro do Motorista Demo PrimeCharge associado a esta empresa (ver seção 2 acima) — o CPF fixo do demo é único por empresa, rodar o seed de novo aqui colidiria.');
    } else if (!catalogoOk) {
      classificacao = 'NÃO ELEGÍVEL';
      motivos.push('catálogo global "BYD" não foi encontrado no banco — isso bloqueia TODAS as empresas igualmente, não é um problema desta empresa específica.');
    } else {
      classificacao = 'ELEGÍVEL';
      if (semVeiculo) motivos.push('empresa ainda não tem nenhum veículo cadastrado (não impede o seed, que cria o próprio veículo demo — sinalizado só como contexto).');
      if (semMotorista) motivos.push('empresa ainda não tem nenhum motorista cadastrado (idem — não impede o seed).');
      if (motivos.length) classificacao = 'ATENÇÃO';
    }

    console.log(`\n   empresa_id: ${empresa.id}`);
    console.log(`   nome: ${empresa.nome}`);
    console.log(`   cnpj: ${empresa.cnpj ?? '(não informado)'}`);
    console.log(`   status/ativo: conceito não existe na tabela "empresas" (auditado — não inventado)`);
    console.log(`   motoristas: ${motoristasCount.count ?? '?'}`);
    console.log(`   veiculos: ${veiculosCount.count ?? '?'}`);
    console.log(`   contratos ativos: ${contratosAtivosCount.count ?? '?'}`);
    console.log(`   classificação: ${classificacao}`);
    motivos.forEach((m) => console.log(`     - ${m}`));
  }

  console.log('\nNenhuma escrita foi feita. Escolha um empresa_id acima (idealmente "ELEGÍVEL") e informe para o próximo passo (DRY_RUN do seed).');
}

main().catch((err) => {
  console.error('ERRO NÃO TRATADO:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
