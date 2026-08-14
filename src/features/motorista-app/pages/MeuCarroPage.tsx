import { formatKm } from '@/shared/lib/format';
import { VEICULO_STATUS_LABEL, VEICULO_CATEGORIA_LABEL } from '@/features/frota/types';
import { Secao, Linha, Pill, SkeletonPortal, ErroPortal, VazioPortal } from '../components/ui';
import { useMeuContrato } from '../hooks/useMeuContrato';

// Épico 11 — App do Motorista. Tela "Meu carro": detalhe do veículo do contrato ativo.
// Só campos que o motorista PRECISA ver — nada financeiro/administrativo (o tipo MeuContrato
// nem traz valor de compra, chassi, renavam; não inventamos). Sem telemetria em tempo real:
// autonomia/bateria são especificações do veículo, não leitura ao vivo.
export function MeuCarroPage() {
  const resultado = useMeuContrato();

  if (resultado.isLoading) return <SkeletonPortal />;
  if (resultado.isError) return <ErroPortal onRetry={() => window.location.reload()} />;

  const contrato = resultado.contratoAtivo;
  if (!contrato) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Meu carro</h1>
        <VazioPortal>Nenhum veículo vinculado ao seu contrato ativo.</VazioPortal>
      </div>
    );
  }

  const veiculo = contrato.veiculo;
  const nomeVeiculo = `${veiculo.marca?.nome ?? ''} ${veiculo.modelo?.nome ?? ''}`.trim() || '—';
  // Verde quando o carro está em uso/pronto; demais estados neutros.
  const tomVeiculo = veiculo.status === 'alugado' || veiculo.status === 'disponivel' ? 'verde' : 'neutro';

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Meu carro</h1>

      <Secao titulo="Veículo">
        <div className="divide-y divide-neutral-100 dark:divide-white/5">
          <Linha label="Modelo" value={nomeVeiculo} />
          <Linha label="Placa" value={veiculo.placa} />
          <Linha label="Cor" value={veiculo.cor ?? '—'} />
          <Linha label="Categoria" value={VEICULO_CATEGORIA_LABEL[veiculo.categoria]} />
          {/* Ano de fabricação/modelo — mostra os dois só quando diferem. */}
          <Linha
            label="Ano"
            value={
              veiculo.ano_fabricacao === veiculo.ano_modelo
                ? String(veiculo.ano_fabricacao)
                : `${veiculo.ano_fabricacao}/${veiculo.ano_modelo}`
            }
          />
          <Linha label="Status" value={<Pill tom={tomVeiculo}>{VEICULO_STATUS_LABEL[veiculo.status]}</Pill>} />
        </div>
      </Secao>

      <Secao titulo="Uso">
        <div className="divide-y divide-neutral-100 dark:divide-white/5">
          <Linha label="Quilometragem" value={formatKm(veiculo.quilometragem)} />
          {/* autonomia/bateria são specs; podem não estar cadastradas → 'Não informado'. */}
          <Linha
            label="Autonomia"
            value={veiculo.autonomia_km != null ? formatKm(veiculo.autonomia_km) : 'Não informado'}
          />
          <Linha
            label="Bateria"
            value={veiculo.capacidade_bateria_kwh != null ? `${veiculo.capacidade_bateria_kwh} kWh` : 'Não informado'}
          />
          <Linha
            label="KM inicial do contrato"
            value={contrato.km_inicial != null ? formatKm(contrato.km_inicial) : 'Não informado'}
          />
        </div>
      </Secao>
    </div>
  );
}
