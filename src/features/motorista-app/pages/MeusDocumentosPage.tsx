import { FileText } from 'lucide-react';
import { diasAte } from '@/shared/lib/format';
import { toast } from '@/shared/components/ui/toast';
import { Button } from '@/shared/components/ui/button';
import { Secao, Pill, SkeletonPortal, ErroPortal, VazioPortal } from '../components/ui';
import { useMeusDocumentos } from '../hooks/useMotoristaApp';
import { assinarUrlDocumento, type MeuDocumento } from '../api/documentos';

// Épico 11 — App do Motorista. Tela "Meus documentos": só leitura dos arquivos do próprio
// motorista/contrato/veículo. Sem envio pelo app nesta fase — nada de botão falso.

// Label do tipo de entidade dona do arquivo.
const TIPO_LABEL: Record<string, string> = {
  contrato: 'Contrato',
  motorista: 'Pessoal',
  veiculo: 'Veículo',
};
function labelTipo(tipo: string): string {
  return TIPO_LABEL[tipo] ?? tipo;
}

// Pill de validade — só existe quando há data_validade. Nunca inventamos vencimento.
function PillValidade({ dataValidade }: { dataValidade: string }) {
  const dias = diasAte(dataValidade);
  if (dias === null) return null;
  if (dias < 0) return <Pill tom="vermelho">Vencido</Pill>;
  if (dias <= 30) return <Pill tom="ambar">{`Vence em ${dias}d`}</Pill>;
  return <Pill tom="verde">Válido</Pill>;
}

function ItemDocumento({ doc }: { doc: MeuDocumento }) {
  // Abre o arquivo via URL assinada de curta duração; sem URL, avisa.
  async function abrir() {
    const url = await assinarUrlDocumento(doc.caminho_storage);
    if (url) window.open(url, '_blank');
    else toast.error('Não foi possível abrir.');
  }

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{doc.nome_arquivo}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-500">{labelTipo(doc.entidade_tipo)}</span>
          {doc.categoria && <span className="text-xs text-neutral-500">· {doc.categoria}</span>}
          {doc.data_validade && <PillValidade dataValidade={doc.data_validade} />}
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={abrir}>
        Ver
      </Button>
    </div>
  );
}

export function MeusDocumentosPage() {
  const { data, isLoading, isError, refetch } = useMeusDocumentos();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Meus documentos</h1>

      {isLoading ? (
        <SkeletonPortal />
      ) : isError ? (
        <ErroPortal onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <VazioPortal>Nenhum documento disponível.</VazioPortal>
      ) : (
        <Secao titulo="Arquivos" acao={<FileText className="h-4 w-4 text-neutral-400" />}>
          <div className="divide-y divide-neutral-100 dark:divide-white/5">
            {data.map((doc) => (
              <ItemDocumento key={doc.id} doc={doc} />
            ))}
          </div>
        </Secao>
      )}

      {/* O envio de documentos pelo app chega numa próxima fase — por enquanto só leitura. */}
      <p className="px-1 text-xs text-neutral-400">
        Por enquanto os documentos são só para consulta. O envio pelo app chega em breve.
      </p>
    </div>
  );
}
