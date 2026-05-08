export type DbType = 'mysql' | 'postgresql' | 'questdb' | 'sqlite';

export interface DbConnectionConfig {
  id: string;
  type: DbType;
  host: string;
  port: number;
  dbName: string;
  username: string;
  password: string;
}

export interface QueryResult {
  success: boolean;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  durationMs: number;
  error?: string;
  errorCode?: string;
}

export interface StoredProcedure {
  name: string;
  schema: string;
  language: string;
  params: string;
  definer: string;
  created: string;
}

export interface ProcedureResult {
  success: boolean;
  procedures: StoredProcedure[];
  error?: string;
}
