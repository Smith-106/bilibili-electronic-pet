/**
 * Redis connection configuration for worker queues
 */

export type RedisConnectionConfig = {
  host: string;
  port: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest?: number | null;
  enableReadyCheck?: boolean;
};

export function buildRedisConnectionConfig(): RedisConnectionConfig {
  const port = Number.parseInt(process.env.REDIS_PORT ?? '', 10);
  const db = Number.parseInt(process.env.REDIS_DB ?? '', 10);

  return {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number.isFinite(port) ? port : 6379,
    password: process.env.REDIS_PASSWORD ?? undefined,
    db: Number.isFinite(db) ? db : 0,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}
