// Cloudflare D1 类型定义
interface D1Database {
  prepare: (query: string) => D1PreparedStatement;
  exec: (query: string) => Promise<D1ExecResult>;
}

interface D1PreparedStatement {
  bind: (...values: any[]) => D1PreparedStatement;
  first: <T = any>(column?: string) => Promise<T>;
  run: () => Promise<D1Result>;
  all: <T = any>() => Promise<D1Result<T>>;
}

interface D1Result<T = any> {
  results?: T[];
  success: boolean;
  error?: string;
  meta: {
    duration: number;
    last_row_id?: number;
    changes?: number;
    served_by?: string;
  };
}

interface D1ExecResult {
  count: number;
  duration: number;
}
