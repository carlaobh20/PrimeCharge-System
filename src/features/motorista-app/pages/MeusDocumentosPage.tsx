import { useState, type ChangeEvent } from 'react';
import { FileText, Upload } from 'lucide-react';
import { diasAte } from '@/shared/lib/format';
import { toast } from '@/shared/components/ui/toast';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import { Secao, Pill, SkeletonPortal, ErroPortal, VazioPortal } from '../components/ui';
import { useMeusDocumentos } from '../hooks/useMotoristaApp';
import { assinarUrlDocumento, type MeuDocumento } from '../api/documentos';
import { enviarDocumento } from '../api/uploads';

// Épico 11 — App do Motorista. Tela "Meus documentos": lista os arquivos do próprio
// motorista/contrato/veículo E permite enviar novos (a locadora analisa depois). Mostra validade
// e o status de revisão de cada envio.

// Label do tipo de entidade dona do arquivo.
const TIPO_LABEL: Record<string, string> = {
  contrato: 'Contrato',
  motorista: 'Pessoal',
  veiculo: 'Veículo',
};
function labelTipo(tipo: string): string {
  return TIPO_LABEL[tipo] ?? tipo;
}

// Categorias que o motorista pode enviar pelo app.
const CATEGORIAS = ['CNH', 'Comprovante de residência', 'Outro'] as const;

// Pill de validade — só existe quando há data_validade. Nunca inventamos vencimento.
function PillValidade({ dataValidade }: { dataValidade: string }) {
  const dias = diasAte(dataValidade);
  if (dias === null) return null;
  if (dias < 0) return <Pill tom="vermelho">Vencido</Pill>;
  if (dias <= 30) return <Pill tom="ambar">{`Vence em ${dias}d`}</Pill>;
  return <Pill tom="verde">Válido</Pill>;
}

// Pill do status de revisão do envio (quando presente).
function PillStatusRevisao({ status }: { status: string }) {
  if (status === 'aguardando') return <Pill tom="neutro">Aguardando</Pill>;
  if (status === 'em_analise') return <Pill tom="azul">Em análise</Pill>;
  if (status === 'aprovado') return <Pill tom="verde">Aprovado</Pill>;
  if (status === 'rejeitado') return <Pill tom="vermelho">Recusado</Pill>;
  return null;
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
          {doc.status_revisao && <PillStatusRevisao status={doc.status_revisao} />}
        </div>
        {doc.status_revisao === 'rejeitado' && doc.motivo_rejeicao && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{doc.motivo_rejeicao}</p>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={abrir}>
        Ver
      </Button>
    </div>
  );
}

// Bloco de envio de documento pelo app.
function EnviarDocumento({ onEnviado }: { onEnviado: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [categoria, setCategoria] = useState<string>(CATEGORIAS[0]);
  const [enviando, setEnviando] = useState(false);

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null);
  }

  async function enviar() {
    if (!file) {
      toast.error('Selecione um arquivo primeiro.');
      return;
    }
    setEnviando(true);
    try {
      await enviarDocumento(file, categoria);
      toast.success('Documento enviado. A locadora vai analisar.');
      setFile(null);
      onEnviado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível enviar.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Secao titulo="Enviar documento">
      <div className="space-y-3">
        <div>
          <Label htmlFor="doc-categoria">Categoria</Label>
          <Select id="doc-categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="doc-arquivo">Imagem ou PDF</Label>
          <input
            id="doc-arquivo"
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            onChange={onFile}
            className="mt-1 block w-full text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-emerald-700 dark:text-neutral-300"
          />
        </div>
        {file && <p className="truncate text-xs text-neutral-500">{file.name}</p>}
        <Button className="w-full" disabled={!file || enviando} onClick={enviar}>
          <Upload className="mr-2 h-4 w-4" />
          {enviando ? 'Enviando…' : 'Enviar'}
        </Button>
      </div>
    </Secao>
  );
}

export function MeusDocumentosPage() {
  const { data, isLoading, isError, refetch } = useMeusDocumentos();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Meus documentos</h1>

      <EnviarDocumento onEnviado={() => refetch()} />

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
    </div>
  );
}
