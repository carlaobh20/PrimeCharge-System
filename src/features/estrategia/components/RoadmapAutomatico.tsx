import { Milestone, PartyPopper } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { formatMoeda } from '@/shared/lib/format';
import { extrairMensagemTecnicaDeErro } from '@/shared/lib/errors';
import { useGrowthTimeline } from '../hooks/useGrowthTimeline';
import { calcularRoadmapAutomatico } from '../intelligence/roadmap';

// Ver justificativa de arquitetura completa em intelligence/roadmap.ts — o "objetivo" aqui é
// o próximo marco estrutural da Timeline (1/5/10/20...), não uma meta que o dono precisa
// comprometer com número/data fixo.
export function RoadmapAutomatico() {
  const resultado = useGrowthTimeline();

  if (resultado.isLoading) {
    return <div className="h-28 cockpit-shimmer rounded-2xl" />;
  }

  if (resultado.isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
        Não consegui calcular o Roadmap Automático.
        <br />
        Detalhe técnico: {extrairMensagemTecnicaDeErro(resultado.error)}
      </div>
    );
  }

  if (resultado.timeline.motivoSemProjecao) {
    // Sem amostra, a Timeline já explica o motivo logo abaixo — não duplica o aviso aqui.
    return null;
  }

  const roadmap = calcularRoadmapAutomatico(resultado.timeline);

  if (!roadmap.proximoMarco) {
    return (
      <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <CardContent className="flex items-center gap-3 py-5">
          <PartyPopper className="h-5 w-5 text-emerald-600" />
          <p className="text-sm text-emerald-800 dark:text-emerald-300">
            Frota atual ({roadmap.frotaAtual} veículos) já passou de todos os marcos definidos (até 1000). Sem próximo marco pra
            mostrar aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/10">
      <CardContent className="py-5">
        <div className="flex items-start gap-3">
          <Milestone className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Próximo marco: {roadmap.proximoMarco.veiculos} veículos ({roadmap.veiculosFaltantes} a mais que hoje)
            </p>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Capital adicional estimado:{' '}
              <span className="font-semibold">
                {roadmap.capitalAdicionalNecessario === null ? '—' : formatMoeda(roadmap.capitalAdicionalNecessario)}
              </span>
              {' · '}
              Aumento de lucro mensal esperado:{' '}
              <span className="font-semibold">
                {roadmap.aumentoLucroMensalProjetado === null ? '—' : formatMoeda(roadmap.aumentoLucroMensalProjetado)}
              </span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
