// Missão 7 — Modo Simulação: cliente PostgREST falso.
//
// Implementa só o subconjunto de métodos do query builder do supabase-js que o repo
// realmente usa (auditado nesta missão em todo `features/*/api/*.ts` e
// `shared/capabilities/api/*.ts`: eq, neq, in, or, not, order, limit, single, maybeSingle,
// select, insert, update, delete — nada de upsert/range/textSearch/rpc genérico). Opera
// inteiramente sobre `simulationStore` (memória + localStorage), nunca toca a rede.
//
// Por que não um mock de `fetch`/interceptar o Supabase de verdade: o supabase-js monta
// query string PostgREST e não dá pra "desviar" uma chamada já em voo sem reimplementar o
// protocolo inteiro. Reimplementar só o punhado de métodos encadeáveis realmente usados é
// muito menos código e mais fácil de auditar.

import { RELATIONS } from './relations';
import { simulationStore, type Row } from './store';
import { applyMutationSideEffects } from './sideEffects';

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // Fallback improvável de precisar (todo browser moderno tem crypto.randomUUID), mas não
  // custa nada não deixar a simulação quebrar por causa disso.
  return 'sim-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

type FilterOp = 'eq' | 'neq' | 'in' | 'ilike' | 'is';

type Filter = { column: string; op: FilterOp; value: unknown };

function getPath(row: Row, path: string): unknown {
  if (!path.includes('.')) return row[path];
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Row)[key];
    return undefined;
  }, row);
}

function matchOp(rowValue: unknown, op: FilterOp, value: unknown): boolean {
  switch (op) {
    case 'eq':
      return rowValue === value;
    case 'neq':
      return rowValue !== value;
    case 'in':
      return Array.isArray(value) && value.includes(rowValue);
    case 'ilike': {
      if (typeof rowValue !== 'string' || typeof value !== 'string') return false;
      const termo = value.replace(/^%|%$/g, '').toLowerCase();
      return rowValue.toLowerCase().includes(termo);
    }
    case 'is':
      return value === null ? rowValue === null || rowValue === undefined : rowValue === value;
    default:
      return true;
  }
}

function compareValues(a: unknown, b: unknown, ascending: boolean, nullsFirst?: boolean): number {
  const aNull = a === null || a === undefined;
  const bNull = b === null || b === undefined;
  if (aNull && bNull) return 0;
  if (aNull) return nullsFirst ? -1 : 1;
  if (bNull) return nullsFirst ? 1 : -1;
  let cmp = 0;
  if (typeof a === 'number' && typeof b === 'number') cmp = a - b;
  else cmp = String(a).localeCompare(String(b));
  return ascending ? cmp : -cmp;
}

class FakeQueryBuilder implements PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }> {
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private filters: Filter[] = [];
  private notFilters: Filter[] = [];
  private orGroup: Filter[] | null = null;
  private orderSpec: { column: string; ascending: boolean; nullsFirst?: boolean } | null = null;
  private limitN: number | null = null;
  private singleMode: 'single' | 'maybeSingle' | null = null;
  private selectStr: string | null = null;
  private insertPayload: Row | Row[] | null = null;
  private updatePayload: Row | null = null;
  private wantsReturn = false;
  private table: string;

  constructor(table: string) {
    this.table = table;
  }

  select(str: string = '*') {
    this.selectStr = str;
    if (this.op !== 'select') this.wantsReturn = true;
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push({ column, op: 'eq', value });
    return this;
  }
  neq(column: string, value: unknown) {
    this.filters.push({ column, op: 'neq', value });
    return this;
  }
  in(column: string, values: unknown[]) {
    this.filters.push({ column, op: 'in', value: values });
    return this;
  }
  not(column: string, _operator: string, value: unknown) {
    this.notFilters.push({ column, op: 'is', value });
    return this;
  }
  or(expr: string) {
    // Formato real: "coluna.op.valor,coluna2.op2.valor2" — só ilike aparece no repo hoje.
    this.orGroup = expr.split(',').map((segment) => {
      const [column, op, ...rest] = segment.split('.');
      return { column, op: (op as FilterOp) ?? 'eq', value: rest.join('.') };
    });
    return this;
  }
  order(column: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.orderSpec = { column, ascending: opts?.ascending ?? true, nullsFirst: opts?.nullsFirst };
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  single() {
    this.singleMode = 'single';
    return this;
  }
  maybeSingle() {
    this.singleMode = 'maybeSingle';
    return this;
  }
  insert(payload: Row | Row[]) {
    this.op = 'insert';
    this.insertPayload = payload;
    return this;
  }
  update(payload: Row) {
    this.op = 'update';
    this.updatePayload = payload;
    return this;
  }
  delete() {
    this.op = 'delete';
    return this;
  }

  // Torna o builder "awaitable", igual ao real (supabase-js também é PromiseLike, não Promise).
  then<TResult1 = { data: unknown; error: unknown }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: { message: string; code?: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }

  private embedRelations(row: Row): Row {
    const relations = RELATIONS[this.table];
    if (!relations) return row;
    const result: Row = { ...row };
    for (const rel of relations) {
      if (rel.type === 'belongsTo') {
        const fk = row[rel.localKey];
        const target = fk != null ? simulationStore.getAll(rel.table).find((r) => r.id === fk) : null;
        result[rel.alias] = target ? { ...target } : null;
      } else {
        const parentId = row.id;
        result[rel.alias] = simulationStore
          .getAll(rel.table)
          .filter((r) => r[rel.foreignKey] === parentId)
          .map((r) => ({ ...r }));
      }
    }
    return result;
  }

  private execute(): { data: unknown; error: { message: string; code?: string } | null } {
    if (this.op === 'insert') return this.execInsert();
    if (this.op === 'update') return this.execUpdate();
    if (this.op === 'delete') return this.execDelete();
    return this.execSelect();
  }

  private execSelect() {
    const wantsEmbed = !!this.selectStr && this.selectStr.includes('(');
    let rows = simulationStore.getAll(this.table).map((r) => (wantsEmbed ? this.embedRelations(r) : { ...r }));

    rows = rows.filter((row) => this.filters.every((f) => matchOp(getPath(row, f.column), f.op, f.value)));
    rows = rows.filter((row) => this.notFilters.every((f) => !matchOp(getPath(row, f.column), f.op, f.value)));
    if (this.orGroup) {
      const group = this.orGroup;
      rows = rows.filter((row) => group.some((f) => matchOp(getPath(row, f.column), f.op, f.value)));
    }
    if (this.orderSpec) {
      const { column, ascending, nullsFirst } = this.orderSpec;
      rows = [...rows].sort((a, b) => compareValues(a[column], b[column], ascending, nullsFirst));
    }
    if (this.limitN != null) rows = rows.slice(0, this.limitN);

    if (this.singleMode === 'single') {
      if (rows.length !== 1) {
        return {
          data: null,
          error: { message: 'Nenhum registro encontrado (simulação)', code: rows.length === 0 ? 'PGRST116' : undefined },
        };
      }
      return { data: rows[0], error: null };
    }
    if (this.singleMode === 'maybeSingle') {
      if (rows.length > 1) return { data: null, error: { message: 'Mais de um registro encontrado (simulação)' } };
      return { data: rows[0] ?? null, error: null };
    }
    return { data: rows, error: null };
  }

  private execInsert() {
    const now = new Date().toISOString();
    const payloadArray = Array.isArray(this.insertPayload) ? this.insertPayload : this.insertPayload ? [this.insertPayload] : [];
    const inserted = payloadArray.map((p) => ({
      criado_em: now,
      atualizado_em: now,
      ...p,
      id: (p.id as string | undefined) ?? generateId(),
    }));
    simulationStore.insert(this.table, inserted);
    applyMutationSideEffects(this.table, 'insert', inserted);

    if (!this.wantsReturn) return { data: null, error: null };
    if (this.singleMode) return { data: inserted[0] ?? null, error: null };
    return { data: inserted, error: null };
  }

  private execUpdate() {
    const now = new Date().toISOString();
    const patch = { ...this.updatePayload, atualizado_em: now };
    const predicate = (row: Row) =>
      this.filters.every((f) => matchOp(getPath(row, f.column), f.op, f.value)) &&
      this.notFilters.every((f) => !matchOp(getPath(row, f.column), f.op, f.value));
    const updated = simulationStore.update(this.table, predicate, patch);
    applyMutationSideEffects(this.table, 'update', updated);

    if (!this.wantsReturn) return { data: null, error: null };
    if (this.singleMode === 'single') {
      if (updated.length !== 1) return { data: null, error: { message: 'Nenhuma linha afetada (simulação)' } };
      return { data: updated[0], error: null };
    }
    return { data: updated, error: null };
  }

  private execDelete() {
    const predicate = (row: Row) =>
      this.filters.every((f) => matchOp(getPath(row, f.column), f.op, f.value)) &&
      this.notFilters.every((f) => !matchOp(getPath(row, f.column), f.op, f.value));
    const removed = simulationStore.delete(this.table, predicate);
    if (!this.wantsReturn) return { data: null, error: null };
    return { data: removed, error: null };
  }
}

export function fakeFrom(table: string) {
  return new FakeQueryBuilder(table);
}
