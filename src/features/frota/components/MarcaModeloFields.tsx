import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { useCreateMarca, useCreateModelo, useMarcas, useModelosPorMarca } from '../hooks/useMarcasModelos';

// Cadastro inline de marca/modelo novo — CRUD dedicado fica fora do escopo desta Sprint
// (FASE 1.1: "Implementar exclusivamente o módulo Veículos").
export function MarcaModeloFields({
  marcaId,
  modeloId,
  onChangeMarca,
  onChangeModelo,
  errorMarca,
  errorModelo,
}: {
  marcaId: string;
  modeloId: string;
  onChangeMarca: (id: string) => void;
  onChangeModelo: (id: string) => void;
  errorMarca?: string;
  errorModelo?: string;
}) {
  const [novaMarca, setNovaMarca] = useState(false);
  const [novoModelo, setNovoModelo] = useState(false);
  const [nomeMarca, setNomeMarca] = useState('');
  const [nomeModelo, setNomeModelo] = useState('');

  const { data: marcas } = useMarcas();
  const { data: modelos } = useModelosPorMarca(marcaId || undefined);
  const createMarca = useCreateMarca();
  const createModelo = useCreateModelo();

  function handleCreateMarca() {
    if (!nomeMarca.trim()) return;
    createMarca.mutate(nomeMarca.trim(), {
      onSuccess: (marca) => {
        onChangeMarca(marca.id);
        onChangeModelo('');
        setNomeMarca('');
        setNovaMarca(false);
      },
    });
  }

  function handleCreateModelo() {
    if (!nomeModelo.trim() || !marcaId) return;
    createModelo.mutate(
      { marcaId, nome: nomeModelo.trim() },
      {
        onSuccess: (modelo) => {
          onChangeModelo(modelo.id);
          setNomeModelo('');
          setNovoModelo(false);
        },
      }
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <Label>Marca *</Label>
        {novaMarca ? (
          <div className="flex gap-2">
            <Input
              value={nomeMarca}
              onChange={(e) => setNomeMarca(e.target.value)}
              placeholder="Nome da marca"
              autoFocus
            />
            <Button type="button" size="sm" onClick={handleCreateMarca} disabled={createMarca.isPending}>
              Salvar
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setNovaMarca(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Select
              value={marcaId}
              onChange={(e) => {
                onChangeMarca(e.target.value);
                onChangeModelo('');
              }}
            >
              <option value="">Selecione…</option>
              {marcas?.map((marca) => (
                <option key={marca.id} value={marca.id}>
                  {marca.nome}
                </option>
              ))}
            </Select>
            <Button type="button" variant="outline" size="icon" onClick={() => setNovaMarca(true)} title="Nova marca">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
        {errorMarca && <p className="mt-1 text-xs text-red-600">{errorMarca}</p>}
      </div>

      <div>
        <Label>Modelo *</Label>
        {novoModelo ? (
          <div className="flex gap-2">
            <Input
              value={nomeModelo}
              onChange={(e) => setNomeModelo(e.target.value)}
              placeholder="Nome do modelo"
              autoFocus
            />
            <Button type="button" size="sm" onClick={handleCreateModelo} disabled={createModelo.isPending}>
              Salvar
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setNovoModelo(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Select value={modeloId} onChange={(e) => onChangeModelo(e.target.value)} disabled={!marcaId}>
              <option value="">{marcaId ? 'Selecione…' : 'Selecione a marca primeiro'}</option>
              {modelos?.map((modelo) => (
                <option key={modelo.id} value={modelo.id}>
                  {modelo.nome}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setNovoModelo(true)}
              disabled={!marcaId}
              title="Novo modelo"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
        {errorModelo && <p className="mt-1 text-xs text-red-600">{errorModelo}</p>}
      </div>
    </div>
  );
}
