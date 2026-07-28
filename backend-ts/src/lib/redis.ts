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
    // SEC-003: 同 checkDatabaseConnection — raw error.message 经 readiness blocker 进 HTTP body (CWE-209).
    // 服务端 console 保留原始诊断, 返回安全固定 enum. finally disconnect 释放临时连接.
    console.error('[checkRedisConnection] Redis probe failed:', error instanceof Error ? error.message : String(error));
    return { connected: false, error: 'unavailable' };
  } finally {
    redis.disconnect();
  }
}
