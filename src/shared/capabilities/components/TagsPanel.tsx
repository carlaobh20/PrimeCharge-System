import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { useAddTag, useRemoveTag, useTags } from '../hooks/useTags';

export function TagsPanel({
  entidadeTipo,
  entidadeId,
  usuarioId,
  empresaId,
}: {
  entidadeTipo: string;
  entidadeId: string;
  usuarioId?: string;
  empresaId?: string;
}) {
  const [novaTag, setNovaTag] = useState('');
  const { data: tags, isLoading } = useTags(entidadeTipo, entidadeId);
  const addTag = useAddTag(entidadeTipo, entidadeId);
  const removeTag = useRemoveTag(entidadeTipo, entidadeId);

  function handleAdd() {
    if (!novaTag.trim() || !empresaId) return;
    addTag.mutate(
      { empresaId, entidadeTipo, entidadeId, tag: novaTag.trim(), usuarioId },
      { onSuccess: () => setNovaTag('') }
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={novaTag}
          onChange={(e) => setNovaTag(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Nova tag…"
          className="max-w-xs"
        />
        <Button onClick={handleAdd} disabled={addTag.isPending || !novaTag.trim()} size="sm">
          Adicionar
        </Button>
      </div>

      {isLoading && <p className="text-sm text-neutral-500">Carregando tags…</p>}
      {!isLoading && (!tags || tags.length === 0) && <p className="text-sm text-neutral-500">Nenhuma tag ainda.</p>}

      <div className="flex flex-wrap gap-2">
        {tags?.map((tag) => (
          <Badge key={tag.id} variant="secondary" className="gap-1">
            {tag.tag}
            <button type="button" onClick={() => removeTag.mutate(tag.id)} aria-label={`Remover tag ${tag.tag}`}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
