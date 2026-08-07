// Missão 7 — Modo Simulação: banco em memória.
//
// Guarda todas as "tabelas" simuladas como arrays de objetos, indexados por nome de tabela —
// o suficiente pro fakePostgrest.ts (ver arquivo irmão) resolver select/insert/update/delete
// sem nunca tocar o Supabase real. Persistido em localStorage pra sobreviver a reload
// enquanto a simulação está ativa (ver simulationState.ts) e pra manter coerência: se você
// criou um contrato novo dentro da simulação, ele continua lá da próxima vez que abrir.

export type Row = Record<string, unknown>;
export type SimulationTables = Record<string, Row[]>;

const STORAGE_KEY = 'primecharge:simulacao:dados:v1';

type Listener = () => void;

class SimulationStore {
  private tables: SimulationTables = {};
  private listeners = new Set<Listener>();
  private hydrated = false;

  private hydrate(): void {
    if (this.hydrated) return;
    this.hydrated = true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.tables = JSON.parse(raw) as SimulationTables;
      }
    } catch {
      // Dado corrompido/indisponível — segue com tabelas vazias, `ensureSeeded` popula.
      this.tables = {};
    }
  }

  private persist(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.tables));
    } catch {
      // Storage cheio ou indisponível — a simulação continua funcionando só em memória
      // pelo resto da sessão, não é motivo pra quebrar a ação do usuário.
    }
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Garante que exista dado — se é a primeira ativação (nada em localStorage), popula com o dataset gerado. */
  ensureSeeded(buildSeed: () => SimulationTables): void {
    this.hydrate();
    if (Object.keys(this.tables).length === 0) {
      this.tables = buildSeed();
      this.persist();
    }
  }

  /** Apaga tudo e gera um dataset novo — usado pelo botão "Reiniciar simulação". */
  reset(buildSeed: () => SimulationTables): void {
    this.hydrated = true;
    this.tables = buildSeed();
    this.persist();
    this.notify();
  }

  getAll(table: string): Row[] {
    this.hydrate();
    return this.tables[table] ?? [];
  }

  insert(table: string, rows: Row[]): Row[] {
    this.hydrate();
    if (!this.tables[table]) this.tables[table] = [];
    this.tables[table].push(...rows);
    this.persist();
    this.notify();
    return rows;
  }

  update(table: string, predicate: (row: Row) => boolean, patch: Row): Row[] {
    this.hydrate();
    const rows = this.tables[table] ?? [];
    const updated: Row[] = [];
    for (let i = 0; i < rows.length; i++) {
      if (predicate(rows[i])) {
        rows[i] = { ...rows[i], ...patch };
        updated.push(rows[i]);
      }
    }
    if (updated.length > 0) {
      this.persist();
      this.notify();
    }
    return updated;
  }

  delete(table: string, predicate: (row: Row) => boolean): Row[] {
    this.hydrate();
    const rows = this.tables[table] ?? [];
    const removed: Row[] = [];
    const remaining: Row[] = [];
    for (const row of rows) {
      if (predicate(row)) removed.push(row);
      else remaining.push(row);
    }
    if (removed.length > 0) {
      this.tables[table] = remaining;
      this.persist();
      this.notify();
    }
    return removed;
  }
}

export const simulationStore = new SimulationStore();
