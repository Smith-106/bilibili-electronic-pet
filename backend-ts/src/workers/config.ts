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
  return {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT) ?? 6379,
    password: process.env.REDIS_PASSWORD ?? undefined,
    db: Number(process.env.REDIS_DB) ?? 0,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}
