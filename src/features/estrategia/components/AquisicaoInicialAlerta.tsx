import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { formatMoeda } from '@/shared/lib/format';
import type { AquisicaoInicial } from '../intelligence/simulacaoEmpresarial';

// Auditoria "Simulador Financeiro — Visão Executiva" (2026-08-13), Parte 14/15. Antes desta
// missão, `avisoCapitalInicialInsuficiente` já existia no motor mas a interface nunca lia esse
// campo — a Visão Executiva simplesmente mostrava uma fileira de R$ 0,00 sem explicar por quê
// (achado central da auditoria, causa raiz do teste de sanidade do Carlos). Este card fecha
// exatamente esse buraco: sempre visível quando veículosAdquiridos < veiculosDesejados, com os
// números exatos que faltaram — nunca um "erro" genérico, sempre a conta.
//
// Fica ACIMA da Visão Executiva, mesmo lugar de prioridade da Margem de Segurança — é a primeira
// coisa que precisa ficar clara antes de olhar qualquer card de resultado.
export function AquisicaoInicialAlerta({ aquisicaoInicial }: { aquisicaoInicial: AquisicaoInicial }) {
  const { veiculosDesejados, veiculosAdquiridos, capitalDisponivel, capitalNecessario, capitalFaltante } = aquisicaoInicial;

  if (veiculosAdquiridos >= veiculosDesejados) return null;

  const nenhumAdquirido = veiculosAdquiridos === 0;

  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10">
      <CardContent className="flex gap-3 py-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            {nenhumAdquirido ? 'Nenhum veículo foi adquirido' : `Só ${veiculosAdquiridos} de ${veiculosDesejados} veículos pedidos foram adquiridos`}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            O capital disponível não é suficiente para adquirir {nenhumAdquirido ? 'o primeiro' : 'o próximo'} veículo mantendo a reserva de segurança.
          </p>
          <div className="grid grid-cols-3 gap-3 pt-1 text-xs">
            <div>
              <p className="text-amber-600/70 dark:text-amber-400/70">Veículos desejados</p>
              <p className="font-semibold text-amber-800 dark:text-amber-300">{veiculosDesejados}</p>
            </div>
            <div>
              <p className="text-amber-600/70 dark:text-amber-400/70">Veículos adquiridos</p>
              <p className="font-semibold text-amber-800 dark:text-amber-300">{veiculosAdquiridos}</p>
            </div>
            <div />
            <div>
              <p className="text-amber-600/70 dark:text-amber-400/70">Capital disponível</p>
              <p className="font-semibold text-amber-800 dark:text-amber-300">{formatMoeda(capitalDisponivel)}</p>
            </div>
            <div>
              <p className="text-amber-600/70 dark:text-amber-400/70">Capital necessário</p>
              <p className="font-semibold text-amber-800 dark:text-amber-300">{capitalNecessario === null ? '—' : formatMoeda(capitalNecessario)}</p>
            </div>
            <div>
              <p className="text-amber-600/70 dark:text-amber-400/70">Capital faltante</p>
              <p className="font-semibold text-amber-800 dark:text-amber-300">{formatMoeda(capitalFaltante)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
