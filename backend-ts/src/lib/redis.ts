import { Redis } from 'ioredis';

import type { ConnectionStatus } from '../server/contracts.js';
import { buildRedisConnectionConfig } from '../workers/config.js';

/**
 * One-shot Redis connectivity probe for readiness checks (H4 fix).
 *
 * entry (main.ts) 不再直接 new Redis() 越层构造 infra 客户端 — 委派给本 helper.
 * 建临时连接测 PING, finally disconnect 释放 (不污染共享 client 池).
 */
export async function checkRedisConnection(): Promise<ConnectionStatus> {
  const redis = new Redis({
    ...buildRedisConnectionConfig(),
    lazyConnect: true,
    connectTimeout: 1000,
  });

  try {
    await redis.connect();
    const result = await redis.ping();
    return { connected: result === 'PONG' };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'redis_unavailable',
    };
  } finally {
    redis.disconnect();
  }
}
