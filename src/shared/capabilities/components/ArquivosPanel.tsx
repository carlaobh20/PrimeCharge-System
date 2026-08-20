import { useRef, useState } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { toast } from '@/shared/components/ui/toast';
import { diasAte, formatDataSimples } from '@/shared/lib/format';
import { getArquivoUrl } from '../api/arquivos';
import { useArquivos, useDeleteArquivo, useUploadArquivo } from '../hooks/useArquivos';

function formatBytes(bytes: number | null) {
  if (!bytes) return '';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

// Fecha achado #3 da auditoria de jornada da Missão 4: `arquivos.data_validade` existe desde
// a Sprint 9 (DEC-060) mas nenhuma UI de upload a capturava, o que tornava "documento
// vencendo" impossível de calcular. Campo aparece só pra categoria "documento" — foto não
// tem validade.
function ValidadeBadge({ dataValidade }: { dataValidade: string | null }) {
  if (!dataValidade) return null;
  const dias = diasAte(dataValidade);
  if (dias === null) return null;
  const variant = dias < 0 ? 'destructive' : dias <= 30 ? 'warning' : 'secondary';
  const texto = dias < 0 ? `venceu há ${Math.abs(dias)}d` : `vence em ${dias}d`;
  return <Badge variant={variant}>{texto}</Badge>;
}

export function ArquivosPanel({
  entidadeTipo,
  entidadeId,
  categoria,
  bucket,
  empresaId,
  usuarioId,
  accept,
  label,
  categorias,
}: {
  entidadeTipo: string;
  entidadeId: string;
  categoria: string;
  bucket: string;
  empresaId?: string;
  usuarioId?: string;
  accept?: string;
  label: string;
  /** Centro Jurídico Fase 4 (classificação de documentos): quando presente, a LISTA mostra
   * TODOS os arquivos da entidade (sem filtrar por `categoria`) com a classificação de cada um,
   * e o upload ganha um seletor de categoria (valor inicial = `categoria`). Prop opcional —
   * consumidores existentes continuam com o comportamento antigo. */
  categorias?: { valor: string; rotulo: string }[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: arquivos, isLoading } = useArquivos(entidadeTipo, entidadeId, categorias ? undefined : categoria);
  const [categoriaUpload, setCategoriaUpload] = useState(categoria);
  const upload = useUploadArquivo(entidadeTipo, entidadeId);
  const remove = useDeleteArquivo(entidadeTipo, entidadeId);
  const capturaValidade = categoria === 'documento';
  const [dataValidade, setDataValidade] = useState('');

  function handleFiles(files: FileList | null) {
    if (!files || !empresaId) return;
    Array.from(files).forEach((file) => {
      upload.mutate(
        { bucket, empresaId, entidadeTipo, entidadeId, categoria: categorias ? categoriaUpload : categoria, usuarioId, file, dataValidade: dataValidade || null },
        { onSuccess: () => toast.success(`"${file.name}" enviado com sucesso`) }
      );
    });
    if (inputRef.current) inputRef.current.value = '';
    setDataValidade('');
  }

  async function handleOpen(caminhoStorage: string) {
    const url = await getArquivoUrl(caminhoStorage);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {categorias && (
        <div className="flex items-center gap-2">
          <Label className="text-xs">Classificação do arquivo</Label>
          <select
            aria-label="Classificação do arquivo"
            className="h-8 rounded-md border border-neutral-300 bg-transparent px-2 text-xs dark:border-neutral-700"
            value={categoriaUpload}
            onChange={(e) => setCategoriaUpload(e.target.value)}
          >
            {categorias.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.rotulo}
              </option>
            ))}
          </select>
        </div>
      )}
      {capturaValidade && (
        <div>
          <Label>Validade do documento (opcional)</Label>
          <Input type="date" value={dataValidade} onChange={(e) => setDataValidade(e.target.value)} />
          <p className="mt-1 text-xs text-neutral-400">
            Preencha antes de enviar o arquivo (CRLV, seguro, licenciamento) para aparecer nos alertas de vencimento.
          </p>
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={upload.isPending || !empresaId}
      >
        <Upload className="h-4 w-4" />
        {upload.isPending ? 'Enviando…' : `Enviar ${label}`}
      </Button>

      {isLoading && <p className="text-sm text-neutral-500">Carregando…</p>}
      {!isLoading && (!arquivos || arquivos.length === 0) && (
        <p className="text-sm text-neutral-500">Nenhum arquivo enviado ainda.</p>
      )}

      <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {arquivos?.map((arquivo) => (
          <li key={arquivo.id} className="flex items-center justify-between py-2">
            <button
              type="button"
              onClick={() => handleOpen(arquivo.caminho_storage)}
              className="truncate text-left text-sm text-emerald-700 hover:underline dark:text-emerald-400"
            >
              {arquivo.nome_arquivo}
            </button>
            <div className="flex items-center gap-3">
              {categorias && arquivo.categoria && (
                <span className="hidden rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 sm:inline">
                  {categorias.find((c) => c.valor === arquivo.categoria)?.rotulo ?? arquivo.categoria}
                </span>
              )}
              {arquivo.data_validade && (
                <span className="hidden text-xs text-neutral-500 sm:inline">{formatDataSimples(arquivo.data_validade)}</span>
              )}
              <ValidadeBadge dataValidade={arquivo.data_validade} />
              <span className="text-xs text-neutral-500">{formatBytes(arquivo.tamanho_bytes)}</span>
              <button
                type="button"
                onClick={() => remove.mutate(arquivo, { onSuccess: () => toast.success('Arquivo excluído') })}
                aria-label="Excluir arquivo"
                className="text-neutral-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
